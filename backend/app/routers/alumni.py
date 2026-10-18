import os
import re
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from .. import models, schemas, database, utils, notification_service
from ..limiter import limiter
from ..email_service import get_email_configuration_status, send_otp_email
from .. import otp_service
from ..verification_files import delete_private_document, save_private_document

router = APIRouter(prefix="/api/alumni", tags=["Alumni Directory"])

MAX_IMAGE_SIZE = 1 * 1024 * 1024  # 1 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
URL_REGEX = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)

# ─── Public Endpoint ──────────────────────────────────────────────────────────

@router.get("/public", response_model=List[schemas.AlumniPublicOut])
@router.get("/public-list", response_model=List[schemas.AlumniPublicOut])
def get_public_alumni(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db)
):
    """
    Returns only safe public fields for the landing page.
    Never exposes sensitive data like DOB, phone, email, or internal status.
    """
    alumni_list = (
        db.query(models.Alumni)
        .filter(models.Alumni.status == "Active")
        .order_by(models.Alumni.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Fallback to Student table if no records in Alumni table yet
    if not alumni_list:
        student_alumni = (
            db.query(models.Student)
            .filter(models.Student.role == "Alumni", models.Student.status == "Active")
            .offset(skip)
            .limit(limit)
            .all()
        )
        result = []
        for s in student_alumni:
            batch_end = s.batch.split("-")[-1].strip() if s.batch and "-" in s.batch else "2024"
            year_val = int(batch_end) if batch_end.isdigit() else 2024
            batch_start = s.batch.split("-")[0].strip() if s.batch and "-" in s.batch else ""
            admission_year = (
                s.admission_year
                or (int(batch_start) if batch_start.isdigit() else None)
                or max(year_val - 2, 1900)
            )
            result.append(
                schemas.AlumniPublicOut(
                    id=s.id,
                    name=s.name,
                    course_completed=s.course or "GGSIPU Graduate",
                    year_of_admission=admission_year,
                    year_of_completion=year_val,
                    organization=s.company or "Industry Professional",
                    designation=s.designation or "Alumnus",
                    current_city=s.location or "Delhi NCR",
                    university_institute="GGSIPU",
                    professional_picture=s.avatar,
                    linkedin=s.linkedin,
                    github=s.github,
                    instagram=s.instagram,
                    facebook=s.facebook,
                    x_twitter=s.x_twitter,
                    portfolio=s.portfolio,
                )
            )
        return result

    return [
        schemas.AlumniPublicOut(
            id=a.id,
            name=a.name,
            course_completed=a.course_completed,
            year_of_admission=a.year_of_admission,
            year_of_completion=a.year_of_completion,
            organization=a.organization or "Tech Professional",
            designation=a.designation or "Alumnus",
            previous_company=getattr(a, 'previous_company', None),
            current_city=a.current_city or "Delhi NCR",
            professional_picture=a.professional_picture,
            linkedin=a.linkedin,
            github=a.github,
            instagram=a.instagram,
            facebook=a.facebook,
            x_twitter=a.x_twitter,
            portfolio=a.portfolio,
        )
        for a in alumni_list
    ]


# ─── Alumni Registration Endpoint ─────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_alumni(
    name: str = Form(...),
    enrollment_number: str = Form(...),
    mobile_number: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    date_of_birth: str = Form(...),
    course_completed: str = Form(...),
    year_of_admission: int = Form(...),
    year_of_completion: int = Form(...),
    university_institute: Optional[str] = Form("NA"),
    other_institution: Optional[str] = Form("NA"),
    profession: str = Form(...),
    designation: Optional[str] = Form(None),
    organization: Optional[str] = Form(None),
    current_city: str = Form(...),
    current_state: str = Form(...),
    current_country: str = Form("India"),
    current_address: Optional[str] = Form(None),
    linkedin: Optional[str] = Form(None),
    facebook: Optional[str] = Form(None),
    instagram: Optional[str] = Form(None),
    x_twitter: Optional[str] = Form(None),
    github: Optional[str] = Form(None),
    portfolio: Optional[str] = Form(None),
    youtube: Optional[str] = Form(None),
    willing_to_attend_events: str = Form(...),
    contributions: str = Form(...),  # Comma-separated strings
    other_contribution_specify: Optional[str] = Form(None),
    professional_picture: Optional[UploadFile] = File(None),
    academic_proof: UploadFile = File(...),
    branch: Optional[str] = Form(None),
    employment_status: Optional[str] = Form(None),
    industry: Optional[str] = Form(None),
    total_experience: Optional[str] = Form(None),
    work_location: Optional[str] = Form(None),
    technical_skills: Optional[str] = Form(None),
    professional_bio: Optional[str] = Form(None),
    areas_of_expertise: Optional[str] = Form(None),
    mentorship_interested: bool = Form(False),
    mentorship_topics: Optional[str] = Form(None),
    mentorship_mode: Optional[str] = Form(None),
    mentorship_availability: Optional[str] = Form(None),
    terms_accepted: bool = Form(...),
    db: Session = Depends(database.get_db)
):
    """
    Registers a new Alumnus with strict validation, duplicate prevention, and optional 1 MB image upload.
    """
    settings = db.query(models.SystemSettings).first()
    if settings and not settings.allow_registration:
        raise HTTPException(status_code=403, detail="New registrations are temporarily disabled by the administrator.")
    clean_name = name.strip()
    clean_enrollment = enrollment_number.strip()
    clean_email = email.strip().lower()
    clean_mobile = mobile_number.strip()
    clean_course = course_completed.strip()
    if not terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the Terms, Privacy Policy, and document consent notice.")

    if len(password) < 8 or password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords must match and contain at least 8 characters.")
    existing_account = db.query(models.Student).filter(or_(
        func.lower(models.Student.email) == clean_email,
        models.Student.reg_no == clean_enrollment
    )).first()
    existing_admin = db.query(models.Admin).filter(func.lower(models.Admin.email) == clean_email).first()
    same_email_account = bool(existing_account and existing_account.email.lower() == clean_email)
    is_resubmission = bool(
        existing_account
        and same_email_account
        and str(existing_account.verification_status or "").lower() == "rejected"
    )
    is_verification_resume = bool(
        existing_account
        and same_email_account
        and not existing_account.email_verified
        and str(existing_account.verification_status or "pending").lower() == "pending"
    )
    if existing_account and not (is_resubmission or is_verification_resume):
        raise HTTPException(status_code=409, detail="An account with this email or enrollment number already exists.")
    if existing_admin:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    if (is_resubmission or is_verification_resume) and not utils.verify_password(password, existing_account.password):
        raise HTTPException(status_code=403, detail="Use the existing account password to resume or resubmit this registration.")

    # 1. Required text validations
    if not clean_name or not clean_enrollment or not clean_mobile or not clean_email:
        raise HTTPException(status_code=400, detail="Name, Enrollment Number, Mobile Number, and Email are required.")

    # 2. Course validation (Must be MCA, MBA, or MTech)
    if clean_course not in ["MCA", "MBA", "MTech"]:
        raise HTTPException(status_code=400, detail="Course Completed must be one of: MCA, MBA, MTech.")

    # 3. Dynamic Admission & Completion Year Validation
    current_year = datetime.now().year
    min_admission_year = 2004
    max_admission_year = current_year - 2

    min_completion_year = year_of_admission + 2
    max_completion_year = current_year

    if year_of_admission < min_admission_year or year_of_admission > max_admission_year:
        raise HTTPException(status_code=400, detail=f"Year of admission must be between {min_admission_year} and {max_admission_year}.")

    if year_of_completion < min_completion_year or year_of_completion > max_completion_year:
        raise HTTPException(status_code=400, detail=f"Year of completion must be between {min_completion_year} and {max_completion_year}.")

    # 5. Email format validation
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    # 6. Mobile format validation (India 10 digits or International with country code)
    if not re.match(r'^(?:\+?\d{1,4}[-.\s]?)?\d{10}$', clean_mobile):
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit mobile number or international phone number.")

    # 7. Duplicate Check
    existing_alumni = db.query(models.Alumni).filter(
        or_(
            func.lower(models.Alumni.email) == clean_email,
            models.Alumni.enrollment_number == clean_enrollment
        )
    ).first()

    if existing_alumni and not (is_resubmission or is_verification_resume):
        raise HTTPException(
            status_code=409,
            detail="An alumni record with this email or enrollment number already exists."
        )

    # 6. Date of Birth parsing
    parsed_dob = None
    try:
        parsed_dob = datetime.strptime(date_of_birth.strip(), "%Y-%m-%d").date()
    except ValueError:
        try:
            parsed_dob = datetime.strptime(date_of_birth.strip(), "%d/%m/%Y").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Date of Birth format. Please use YYYY-MM-DD.")

    # 7. Institute Logic
    clean_institute = university_institute.strip()
    clean_other_inst = (other_institution or "").strip()
    if clean_institute == "Any Other":
        if not clean_other_inst or clean_other_inst.upper() == "NA":
            raise HTTPException(status_code=400, detail="Please specify the institution name under 'Any Other Institution'.")
    else:
        clean_other_inst = "NA"

    # 8. Profession Logic
    clean_profession = profession.strip()
    clean_designation = (designation or "").strip()
    clean_organization = (organization or "").strip()

    if clean_profession in ["Home Maker", "Unemployed"]:
        clean_designation = "NA"
        clean_organization = "NA"
    elif clean_profession == "Studying":
        if not clean_designation or clean_designation.upper() == "NA":
            raise HTTPException(status_code=400, detail="Please specify the degree currently being pursued under Designation.")
        if not clean_organization or clean_organization.upper() == "NA":
            raise HTTPException(status_code=400, detail="Please specify the institution name under Organization/Institution.")
    else:
        if not clean_designation or clean_designation.upper() == "NA":
            raise HTTPException(status_code=400, detail=f"Designation is required for profession: {clean_profession}.")
        if not clean_organization or clean_organization.upper() == "NA":
            raise HTTPException(status_code=400, detail=f"Organization/Institution name is required for profession: {clean_profession}.")

    # 9. Contribution Logic
    contrib_list = [c.strip() for c in contributions.split(",") if c.strip()]
    if "Unable to Contribute" in contrib_list:
        contrib_list = ["Unable to Contribute"]
        clean_other_contrib = None
    else:
        clean_other_contrib = (other_contribution_specify or "").strip() if "Other" in contrib_list else None
        if "Other" in contrib_list and not clean_other_contrib:
            raise HTTPException(status_code=400, detail="Please specify your contribution details under 'Please specify'.")

    # 10. Social Media URLs Validation
    for label, link in [("LinkedIn", linkedin), ("GitHub", github), ("Facebook", facebook), ("Instagram", instagram), ("X", x_twitter), ("Portfolio", portfolio), ("YouTube", youtube)]:
        if link and link.strip():
            clean_link = link.strip()
            if not clean_link.startswith("http://") and not clean_link.startswith("https://"):
                clean_link = "https://" + clean_link
            if not URL_REGEX.match(clean_link):
                raise HTTPException(status_code=400, detail=f"Please enter a valid URL for {label}.")

    # 11. Image Upload Processing
    saved_picture_path = None
    if professional_picture and professional_picture.filename:
        # Check Content-Type / MIME
        if professional_picture.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type for professional picture. Only JPEG, PNG, and WebP images are allowed."
            )

        # Check File Extension
        ext = os.path.splitext(professional_picture.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are supported."
            )

        # Read contents to check file size <= 1 MB
        contents = await professional_picture.read()
        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Uploaded file size exceeds the 1 MB maximum limit."
            )

        # Save file to uploads directory
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads", "alumni_photos")
        os.makedirs(uploads_dir, exist_ok=True)

        safe_filename = f"alumni_{uuid.uuid4().hex}{ext}"
        full_filepath = os.path.join(uploads_dir, safe_filename)

        with open(full_filepath, "wb") as f:
            f.write(contents)

        saved_picture_path = f"/uploads/alumni_photos/{safe_filename}"

    previous_document_path = existing_account.identity_document_path if existing_account else None
    proof_path, proof_name, proof_mime = await save_private_document(academic_proof, "alumni")

    # 12. Create Alumni Record
    alumni_candidate = models.Alumni(
        name=clean_name,
        enrollment_number=clean_enrollment,
        mobile_number=clean_mobile,
        email=clean_email,
        date_of_birth=parsed_dob,
        course_completed=clean_course,
        year_of_admission=year_of_admission,
        year_of_completion=year_of_completion,
        university_institute=clean_institute,
        other_institution=clean_other_inst,
        profession=clean_profession,
        designation=clean_designation,
        organization=clean_organization,
        current_city=current_city.strip(),
        current_state=current_state.strip(),
        current_country=current_country.strip() or "India",
        professional_picture=saved_picture_path,
        linkedin=linkedin.strip() if linkedin else None,
        facebook=facebook.strip() if facebook else None,
        instagram=instagram.strip() if instagram else None,
        x_twitter=x_twitter.strip() if x_twitter else None,
        github=github.strip() if github else None,
        portfolio=portfolio.strip() if portfolio else None,
        youtube=youtube.strip() if youtube else None,
        willing_to_attend_events=willing_to_attend_events.strip(),
        contributions=",".join(contrib_list),
        other_contribution_specify=clean_other_contrib,
        status="Pending",
        email_verified=False,
        phone_verified=False,
        academic_proof_path=proof_path,
        academic_proof_name=proof_name,
        academic_proof_mime=proof_mime,
        branch=branch.strip() if branch else None,
        employment_status=employment_status.strip() if employment_status else clean_profession,
        industry=industry.strip() if industry else None,
        total_experience=total_experience.strip() if total_experience else None,
        work_location=work_location.strip() if work_location else current_city.strip(),
        technical_skills=technical_skills.strip() if technical_skills else None,
        professional_bio=professional_bio.strip() if professional_bio else None,
        areas_of_expertise=areas_of_expertise.strip() if areas_of_expertise else None,
        mentorship_interested=mentorship_interested,
        mentorship_topics=mentorship_topics.strip() if mentorship_topics else None,
        mentorship_mode=mentorship_mode.strip() if mentorship_mode else None,
        mentorship_availability=mentorship_availability.strip() if mentorship_availability else None,
    )

    if (is_resubmission or is_verification_resume) and existing_alumni:
        for column in models.Alumni.__table__.columns:
            if column.name not in {"id", "created_at"}:
                setattr(existing_alumni, column.name, getattr(alumni_candidate, column.name))
        new_alumni = existing_alumni
    else:
        new_alumni = alumni_candidate

    account = existing_account or models.Student()
    account.name = clean_name
    account.email = clean_email
    account.password = utils.get_password_hash(password)
    account.phone = clean_mobile
    account.reg_no = clean_enrollment
    account.role = "Alumni"
    account.status = "Pending"
    account.email_verified = False
    account.phone_verified = False
    account.verification_status = "pending"
    account.course = clean_course
    account.batch = f"{year_of_admission}-{year_of_completion}"
    account.rejection_reason = None
    if is_resubmission:
        account.resubmitted_at = datetime.now()
    account.college_name = clean_institute if clean_institute != "NA" else clean_other_inst
    account.university_name = clean_institute if clean_institute != "NA" else clean_other_inst
    account.branch = branch.strip() if branch else None
    account.admission_year = year_of_admission
    account.expected_graduation_year = year_of_completion
    account.university_roll_no = clean_enrollment
    account.address = current_address.strip() if current_address else None
    account.city = current_city.strip()
    account.state = current_state.strip()
    account.country = current_country.strip() or "India"
    account.identity_document_path = proof_path
    account.identity_document_name = proof_name
    account.identity_document_mime = proof_mime
    account.identity_document_kind = "alumni_proof"
    account.terms_accepted = True
    account.document_consent_at = datetime.now().replace(tzinfo=None)
    if not account.profile:
        account.profile = models.StudentProfile(
            bio="Alumni community member", location=current_city.strip(),
            current_company=clean_organization, designation=clean_designation, avatar=saved_picture_path,
            linkedin=linkedin.strip() if linkedin else None,
            github=github.strip() if github else None,
            instagram=instagram.strip() if instagram else None,
            facebook=facebook.strip() if facebook else None,
            x_twitter=x_twitter.strip() if x_twitter else None,
            portfolio=portfolio.strip() if portfolio else None,
        )
    else:
        account.profile.location = current_city.strip()
        account.profile.current_company = clean_organization
        account.profile.designation = clean_designation
        account.profile.avatar = saved_picture_path or account.profile.avatar
        account.profile.linkedin = linkedin.strip() if linkedin else None
        account.profile.github = github.strip() if github else None
        account.profile.instagram = instagram.strip() if instagram else None
        account.profile.facebook = facebook.strip() if facebook else None
        account.profile.x_twitter = x_twitter.strip() if x_twitter else None
        account.profile.portfolio = portfolio.strip() if portfolio else None
    if account.id is None:
        db.add(account)
    if new_alumni.id is None:
        db.add(new_alumni)
    db.commit()
    db.refresh(new_alumni)

    if previous_document_path and previous_document_path != proof_path:
        delete_private_document(previous_document_path)

    notification_service.notify_admins(
        db,
        f"New Alumni Registration: {account.name} submitted a registration request and is awaiting verification.",
        "alumni_registration",
        (
            f"alumni-registration-resubmitted:{account.id}:{account.resubmitted_at.isoformat()}"
            if is_resubmission and account.resubmitted_at
            else f"alumni-registration-submitted:{account.id}"
        ),
        f"/admin/pending?user={account.id}",
        "user",
        account.id,
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
        "message": "Alumni registration saved. Verify your email, then wait for administrator approval.",
        "alumni_id": new_alumni.id,
        "email": clean_email,
        "next_step": "email_verification",
    }
