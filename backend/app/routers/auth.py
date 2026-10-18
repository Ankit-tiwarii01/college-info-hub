import secrets
import re
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, UploadFile, File, Form
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas, utils, database
from ..limiter import limiter
from ..dependencies import get_current_admin
from ..email_service import get_email_configuration_status, send_otp_email
from ..sms_service import send_otp_sms
from .. import otp_service, notification_service
from ..account_status import sync_account_status, sync_alumni_record
from ..verification_files import delete_private_document, save_private_document, save_public_profile_photo

router = APIRouter(tags=["Authentication"])

# Dummy hash for timing attack mitigation during non-existent user login attempts
DUMMY_HASH = utils.get_password_hash("dummy_password_for_constant_time_security_mitigation")


# ===== OLD STUDENT REGISTRATION/LOGIN CODE - PRESERVED =====
# Original implementation intentionally commented out.
# Can be restored later if required.
#
# @router.post("/register_old", response_model=schemas.Message)
# def register_old(request: Request, user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
#     clean_email = user.email.strip().lower()
#     existing_admin = db.query(models.Admin).filter(func.lower(models.Admin.email) == clean_email).first()
#     if existing_admin: raise HTTPException(status_code=400, detail="This email is already registered.")
#     db_user = db.query(models.Student).filter(func.lower(models.Student.email) == clean_email).first()
#     hashed_password = utils.get_password_hash(user.password)
#     if db_user:
#         if db_user.email_verified: raise HTTPException(status_code=400, detail="This email is already registered.")
#         db_user.name = user.name.strip()
#         db_user.password = hashed_password
#         db_user.email_verified = False
#         db_user.status = "Pending"
#     else:
#         db_user = models.Student(email=clean_email, name=user.name.strip(), password=hashed_password, role="Student", status="Pending", email_verified=False)
#         db.add(db_user)
#     db.commit()
#     return {"message": "Registration initiated."}
# ===== END OLD STUDENT REGISTRATION/LOGIN CODE =====


# ─── New Student Registration & Login Implementation ──────────────────────────

@router.post("/student/register")
@router.post("/register")
@limiter.limit("10/minute")
async def student_register(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    date_of_birth: str = Form(...),
    gender: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state_name: Optional[str] = Form(None, alias="state"),
    college_name: str = Form(...),
    university_name: str = Form(...),
    course: str = Form(...),
    branch: Optional[str] = Form(None),
    current_semester: Optional[str] = Form(None),
    admission_year: int = Form(...),
    expected_graduation_year: int = Form(...),
    university_roll_no: str = Form(...),
    enrollment_no: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    terms_accepted: bool = Form(...),
    college_id_card: UploadFile = File(...),
    profile_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db)
):
    """
    Registers a new student account with server-side validation for email, Indian phone format,
    enrollment number uniqueness, and bcrypt password hashing.
    """
    settings = db.query(models.SystemSettings).first()
    if settings and not settings.allow_registration:
        raise HTTPException(status_code=403, detail="New registrations are temporarily disabled by the administrator.")
    clean_name = name.strip()
    clean_enrollment = enrollment_no.strip()
    clean_roll = university_roll_no.strip()
    clean_email = email.strip().lower()
    clean_phone = phone.strip()
    clean_course = course.strip()
    if not all([clean_name, clean_enrollment, clean_roll, clean_email, clean_phone, clean_course, college_name.strip(), university_name.strip()]):
        raise HTTPException(status_code=400, detail="All required student identity and academic fields must be completed.")
    if not re.match(r'^[6-9]\d{9}$', clean_phone):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    if not schemas.EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if not terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the Terms, Privacy Policy, and document consent notice.")
    try:
        parsed_dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Date of birth must use YYYY-MM-DD format.") from exc
    current_year = datetime.now(timezone.utc).year
    if admission_year < 1990 or admission_year > current_year or expected_graduation_year < admission_year:
        raise HTTPException(status_code=400, detail="Admission and expected graduation years are invalid.")

    # Password match validation
    if password != confirm_password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords must match and contain at least 8 characters."
        )

    # Email uniqueness check
    existing_admin = db.query(models.Admin).filter(
        func.lower(models.Admin.email) == clean_email
    ).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address is already registered."
        )

    existing_email_student = db.query(models.Student).filter(
        func.lower(models.Student.email) == clean_email
    ).first()
    is_resubmission = bool(
        existing_email_student
        and str(existing_email_student.verification_status or "").lower() == "rejected"
    )
    is_verification_resume = bool(
        existing_email_student
        and not existing_email_student.email_verified
        and str(existing_email_student.verification_status or "pending").lower() == "pending"
    )
    if existing_email_student and not (is_resubmission or is_verification_resume):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This email is already verified and awaiting administrator approval."
                if existing_email_student.verification_status == "pending"
                else "An account with this email address is already registered."
            )
        )
    if (is_resubmission or is_verification_resume) and not utils.verify_password(password, existing_email_student.password):
        raise HTTPException(status_code=403, detail="Use the existing account password to resume or resubmit this registration.")

    # Enrollment number uniqueness check
    existing_enrollment = db.query(models.Student).filter(
        models.Student.reg_no == clean_enrollment,
        models.Student.id != (existing_email_student.id if existing_email_student else -1),
    ).first()
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this enrollment number is already registered."
        )
    duplicate_roll = db.query(models.Student).filter(
        models.Student.university_roll_no == clean_roll,
        models.Student.id != (existing_email_student.id if existing_email_student else -1),
    ).first()
    if duplicate_roll:
        raise HTTPException(status_code=409, detail="An account with this university roll number is already registered.")

    previous_document_path = existing_email_student.identity_document_path if existing_email_student else None
    document_path, document_name, document_mime = await save_private_document(college_id_card, "students")
    profile_photo_path = await save_public_profile_photo(profile_photo)

    # Secure Password Hashing
    hashed_password = utils.get_password_hash(password)

    # Create an unverified account. Email verification and the independent
    # administrator decision are both required for activation.
    new_student = existing_email_student or models.Student()
    new_student.name = clean_name
    new_student.email = clean_email
    new_student.password = hashed_password
    new_student.phone = clean_phone
    new_student.role = "Student"
    new_student.status = "Pending"
    new_student.verification_status = "pending"
    new_student.reg_no = clean_enrollment
    new_student.course = clean_course
    new_student.batch = f"{admission_year}-{expected_graduation_year}"
    new_student.email_verified = False
    new_student.phone_verified = False
    new_student.date_of_birth = parsed_dob
    new_student.gender = gender.strip() if gender else None
    new_student.address = address.strip() if address else None
    new_student.city = city.strip() if city else None
    new_student.state = state_name.strip() if state_name else None
    new_student.country = "India"
    new_student.college_name = college_name.strip()
    new_student.university_name = university_name.strip()
    new_student.branch = branch.strip() if branch else None
    new_student.current_semester = current_semester.strip() if current_semester else None
    new_student.admission_year = admission_year
    new_student.expected_graduation_year = expected_graduation_year
    new_student.university_roll_no = clean_roll
    new_student.identity_document_path = document_path
    new_student.identity_document_name = document_name
    new_student.identity_document_mime = document_mime
    new_student.identity_document_kind = "student_id"
    new_student.terms_accepted = True
    new_student.document_consent_at = datetime.now(timezone.utc).replace(tzinfo=None)
    new_student.rejection_reason = None
    if is_resubmission:
        new_student.resubmitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Create default StudentProfile
    if not new_student.profile:
        profile = models.StudentProfile(
            student_id=new_student.id,
            bio=f"Student pursuing {clean_course}",
            location=", ".join(filter(None, [city.strip() if city else None, state_name.strip() if state_name else None])) or "Campus",
            skills="",
            avatar=profile_photo_path,
        )
        db.add(profile)
        db.commit()
    elif profile_photo_path:
        new_student.profile.avatar = profile_photo_path
        db.commit()

    if previous_document_path and previous_document_path != document_path:
        delete_private_document(previous_document_path)

    notification_service.notify_admins(
        db,
        f"New Student Registration: {new_student.name} submitted a registration request and is awaiting verification.",
        "student_registration",
        (
            f"student-registration-resubmitted:{new_student.id}:{new_student.resubmitted_at.isoformat()}"
            if is_resubmission and new_student.resubmitted_at
            else f"student-registration-submitted:{new_student.id}"
        ),
        f"/admin/pending?user={new_student.id}",
        "user",
        new_student.id,
    )
    db.commit()

    otp_code, otp_record = otp_service.issue_otp(db, clean_email, "EMAIL_VERIFICATION", "email")
    if not send_otp_email(clean_email, otp_code, "EMAIL_VERIFICATION"):
        otp_service.invalidate(otp_record, db)
        configuration = get_email_configuration_status()
        reason = configuration.get("configuration_error")
        raise HTTPException(
            status_code=503,
            detail=(
                "Registration saved, but email OTP delivery is not configured. "
                f"{reason} Add the SMTP values in backend/.env, restart the backend, then use Resend OTP."
                if reason
                else "Registration saved, but the email provider rejected or could not deliver the OTP. Check the secure backend SMTP log, then use Resend OTP."
            ),
        )

    return {
        "message": "Student registration saved. Verify your email, then wait for administrator approval.",
        "email": clean_email,
        "next_step": "email_verification",
    }


@router.post("/student/login", response_model=schemas.Token)
@router.post("/token", response_model=schemas.Token)
@limiter.limit("15/minute")
def student_login(
    request: Request,
    user_credentials: schemas.UserLogin,
    db: Session = Depends(database.get_db),
):
    """
    Authenticates students and administrators using email or enrollment number and password.
    Issues JWT access token according to project authentication architecture.
    """
    clean_identifier = user_credentials.email.strip().lower()

    # 1. Check Student Table (by email or enrollment number)
    student = db.query(models.Student).filter(
        or_(
            func.lower(models.Student.email) == clean_identifier,
            models.Student.reg_no == user_credentials.email.strip()
        )
    ).first()

    if student:
        if not utils.verify_password(user_credentials.password, student.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/enrollment number or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        approval_state = str(student.verification_status or "pending").lower()
        account_state = str(student.status or "Pending").lower()
        if approval_state == "rejected" or account_state == "rejected":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Your registration was rejected: {student.rejection_reason or 'The submitted information could not be verified.'}",
                    "next_step": "resubmit",
                    "email": student.email,
                    "rejection_reason": student.rejection_reason,
                },
            )
        if approval_state == "suspended" or account_state == "blocked":
            raise HTTPException(status_code=403, detail={"message": "Your account is suspended. Contact the administrator.", "next_step": "contact_admin"})
        if not student.email_verified:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Email verification is required before sign in.",
                    "next_step": "verify_email",
                    "email": student.email,
                },
            )
        if approval_state != "approved":
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Your account is awaiting administrator approval.",
                    "next_step": "admin_approval",
                    "email": student.email,
                },
            )

        sync_account_status(student)
        sync_alumni_record(db, student)
        db.commit()
        if student.status != "Active":
            raise HTTPException(status_code=403, detail={"message": "Your account is not active.", "next_step": "contact_admin"})

        user_role = str(student.role).lower() if student.role else "student"
        access_token = utils.create_access_token(
            data={"sub": student.email, "role": user_role, "id": student.id},
            expires_delta=timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user_role,
            "id": student.id,
        }

    # 2. Check Admin Table
    admin = db.query(models.Admin).filter(
        func.lower(models.Admin.email) == clean_identifier
    ).first()

    if admin:
        if not utils.verify_password(user_credentials.password, admin.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = utils.create_access_token(
            data={"sub": admin.email, "role": "admin", "id": admin.id},
            expires_delta=timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "admin",
            "id": admin.id,
        }

    # Timing Attack Mitigation
    utils.verify_password(user_credentials.password, DUMMY_HASH)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email/enrollment number or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/verify-email")
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    payload: schemas.VerifyEmailRequest,
    db: Session = Depends(database.get_db),
):
    """
    Verify 6-digit registration OTP, mark email_verified = True, keep status = Pending for admin approval,
    and invalidate/delete the OTP record.
    """
    clean_email = payload.email.strip().lower()
    otp_service.verify_otp(db, clean_email, "EMAIL_VERIFICATION", "email", payload.otp)

    student = db.query(models.Student).filter(
        func.lower(models.Student.email) == clean_email
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    student.email_verified = True
    sync_account_status(student)
    sync_alumni_record(db, student)

    # Create default StudentProfile if missing
    existing_profile = db.query(models.StudentProfile).filter(models.StudentProfile.student_id == student.id).first()
    if not existing_profile:
        profile = models.StudentProfile(
            student_id=student.id,
            bio="Student at Campus InfoHub (Pending Approval)",
            location="Campus",
            skills=""
        )
        db.add(profile)

    if student.status == "Active":
        notification_service.notify_user(
            db,
            student.id,
            "Your email is verified and your administrator-approved account is now active.",
            "account_activated",
            f"account-activated:{student.id}",
            "/login",
            "user",
            student.id,
        )
    db.commit()
    if student.status == "Active":
        verification_message = "Email verified and account activated. You can now sign in."
        next_step = "login"
    elif student.status == "Rejected":
        verification_message = f"Email verified, but your registration was rejected: {student.rejection_reason or 'The submitted information could not be verified.'}"
        next_step = "resubmit"
    else:
        verification_message = "Email verified. Your account is awaiting administrator approval."
        next_step = "admin_approval"
    return {
        "message": verification_message,
        "next_step": next_step,
        "account_status": student.status,
    }


@router.post("/resend-verification-otp", response_model=schemas.Message)
@limiter.limit("5/minute")
def resend_verification_otp(
    request: Request,
    payload: schemas.ResendVerificationOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    """
    Resend 6-digit registration OTP with 60-second cooldown support on frontend.
    Invalidates previous OTP and generates a brand new OTP.
    """
    clean_email = payload.email.strip().lower()

    student = db.query(models.Student).filter(
        func.lower(models.Student.email) == clean_email
    ).first()

    if not student:
        return {"message": "If an unverified account with that email exists, a new OTP code has been sent."}

    if student.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your email is already verified. You may sign in directly."
        )

    otp_code, otp_record = otp_service.issue_otp(db, clean_email, "EMAIL_VERIFICATION", "email")
    if not send_otp_email(clean_email, otp_code, "EMAIL_VERIFICATION"):
        otp_service.invalidate(otp_record, db)
        configuration = get_email_configuration_status()
        reason = configuration.get("configuration_error")
        raise HTTPException(
            status_code=503,
            detail=(
                f"Email OTP delivery is not configured: {reason}"
                if reason
                else "The email provider rejected or could not deliver the OTP. Check the secure backend SMTP log and try again."
            ),
        )

    return {"message": "A new 6-digit verification code has been sent to your email."}


@router.post("/send-phone-otp", response_model=schemas.Message)
@limiter.limit("5/minute")
def send_phone_verification_otp(
    request: Request,
    payload: schemas.SendPhoneOTPRequest,
    db: Session = Depends(database.get_db),
):
    clean_email = payload.email.strip().lower()
    student = db.query(models.Student).filter(func.lower(models.Student.email) == clean_email).first()
    if not student or not student.email_verified:
        raise HTTPException(status_code=400, detail="Verify your email before requesting a mobile OTP.")
    if student.phone_verified:
        raise HTTPException(status_code=400, detail="Mobile number is already verified.")
    otp_code, otp_record = otp_service.issue_otp(db, student.phone, "PHONE_VERIFICATION", "sms")
    if not send_otp_sms(student.phone, otp_code):
        otp_service.invalidate(otp_record, db)
        raise HTTPException(
            status_code=503,
            detail="SMS OTP delivery is not configured or failed. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.",
        )
    return {"message": "A 6-digit OTP has been sent to your mobile number."}


@router.post("/verify-phone")
@limiter.limit("10/minute")
def verify_phone(
    request: Request,
    payload: schemas.VerifyPhoneRequest,
    db: Session = Depends(database.get_db),
):
    clean_email = payload.email.strip().lower()
    student = db.query(models.Student).filter(func.lower(models.Student.email) == clean_email).first()
    if not student or not student.email_verified:
        raise HTTPException(status_code=400, detail="Email verification must be completed first.")
    otp_service.verify_otp(db, student.phone, "PHONE_VERIFICATION", "sms", payload.otp)
    student.phone_verified = True
    sync_account_status(student)
    sync_alumni_record(db, student)
    message = "Mobile number verified. Account activation still depends on email verification and administrator approval."
    status_value = student.status
    db.commit()
    return {"message": message, "account_status": status_value, "next_step": "admin_approval"}


@router.post("/forgot-password", response_model=schemas.Message)
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    """
    Initiate email OTP password reset flow using reusable OTP model.
    Generates a secure 6-digit OTP valid for 5 minutes, invalidates previous OTPs,
    and sends email via Gmail SMTP without revealing if user exists.
    """
    clean_email = payload.email.strip().lower()

    student = db.query(models.Student).filter(
        func.lower(models.Student.email) == clean_email
    ).first()
    admin = None
    if not student:
        admin = db.query(models.Admin).filter(
            func.lower(models.Admin.email) == clean_email
        ).first()

    if student or admin:
        otp_code, otp_record = otp_service.issue_otp(db, clean_email, "PASSWORD_RESET", "email")
        if not send_otp_email(clean_email, otp_code, "PASSWORD_RESET"):
            otp_service.invalidate(otp_record, db)

    return {"message": "If an account with that email exists, an OTP has been sent."}


@router.post("/verify-otp", response_model=schemas.Message)
@limiter.limit("10/minute")
def verify_otp(
    request: Request,
    payload: schemas.VerifyOTPRequest,
    db: Session = Depends(database.get_db),
):
    """
    Verify the 6-digit OTP code for password reset submitted by the user.
    """
    clean_email = payload.email.strip().lower()
    otp_service.verify_otp(db, clean_email, "PASSWORD_RESET", "email", payload.otp, consume=False)

    return {"message": "OTP verified successfully. You may now reset your password."}


@router.post("/reset-password", response_model=schemas.Message)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(database.get_db),
):
    """
    Reset user password after OTP verification.
    Hashes new password with bcrypt and invalidates the OTP.
    """
    clean_email = payload.email.strip().lower()
    otp_service.verify_otp(db, clean_email, "PASSWORD_RESET", "email", payload.otp, consume=True)

    user = db.query(models.Student).filter(
        func.lower(models.Student.email) == clean_email
    ).first()
    if not user:
        user = db.query(models.Admin).filter(
            func.lower(models.Admin.email) == clean_email
        ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    hashed_pwd = utils.get_password_hash(payload.new_password)
    user.password = hashed_pwd
    db.commit()
    return {"message": "Password reset successfully. Please sign in with your new password."}


@router.post("/cleanup-pending", response_model=schemas.Message)
def cleanup_pending_and_otps(
    current_admin=Depends(get_current_admin),
    db: Session = Depends(database.get_db)
):
    """
    Cleanup utility for expired OTP records and unverified pending accounts older than 24 hours.
    """
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)

    # 1. Invalidate/Delete expired OTPs
    deleted_otps = db.query(models.OTP).filter(
        (models.OTP.expires_at < now) | (models.OTP.is_used == True)
    ).delete(synchronize_session=False)

    # 2. Clean unverified pending accounts older than 24 hours
    pending_students = db.query(models.Student).filter(
        models.Student.email_verified == False,
        models.Student.status == "Pending",
        models.Student.created_at < cutoff_24h
    ).all()

    deleted_users = len(pending_students)
    for student in pending_students:
        delete_private_document(student.identity_document_path)
        alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == student.email.lower()).first()
        if alumnus:
            db.delete(alumnus)
        db.delete(student)

    retention_days = int(os.getenv("REJECTED_DOCUMENT_RETENTION_DAYS", "90"))
    rejected_cutoff = now - timedelta(days=retention_days)
    rejected_users = db.query(models.Student).filter(
        models.Student.verification_status == "rejected",
        models.Student.reviewed_at.is_not(None),
        models.Student.reviewed_at < rejected_cutoff,
        models.Student.identity_document_path.is_not(None),
    ).all()
    removed_rejected_documents = 0
    for student in rejected_users:
        if delete_private_document(student.identity_document_path):
            removed_rejected_documents += 1
        student.identity_document_path = None
        student.identity_document_name = None
        student.identity_document_mime = None
        alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == student.email.lower()).first()
        if alumnus:
            alumnus.academic_proof_path = None
            alumnus.academic_proof_name = None
            alumnus.academic_proof_mime = None

    db.commit()
    return {"message": f"Cleanup complete: removed {deleted_otps} OTP records, {deleted_users} unverified pending accounts, and {removed_rejected_documents} rejected identity documents past the {retention_days}-day retention period."}
