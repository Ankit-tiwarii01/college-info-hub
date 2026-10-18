from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import io
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime, timezone
from .. import models, schemas, database, utils, notification_service
from ..account_status import sync_account_status, sync_alumni_record
from ..dependencies import get_current_user_from_token, get_current_admin
from ..email_service import get_email_configuration_status, send_registration_decision_email
from ..verification_files import ensure_private_document

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    total_students = db.query(models.Student).filter(models.Student.role == "Student").count()
    total_alumni = db.query(models.Student).filter(models.Student.role == "Alumni").count()
    pending_approvals = db.query(models.Student).filter(
        models.Student.verification_status == "pending"
    ).count()
    total_posts = db.query(models.Post).count()
    pending_posts = db.query(models.Post).filter(models.Post.approval_status == "Pending").count()

    return {
        "totalStudents": total_students,
        "totalAlumni": total_alumni,
        "pendingApprovals": pending_approvals,
        "totalPosts": total_posts,
        "pendingPosts": pending_posts,
    }


@router.get("/email-status")
def email_delivery_status(current_user=Depends(get_current_admin)):
    """Expose non-secret SMTP diagnostics to authorized administrators."""
    return get_email_configuration_status()


# ─── User Management ──────────────────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.User])
def get_all_users(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Return all students and alumni."""
    return db.query(models.Student).all()


@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    payload: schemas.AdminUserCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin manually creates a new Student or Alumni user."""
    # Check email uniqueness
    existing_user = db.query(models.Student).filter(models.Student.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    existing_admin = db.query(models.Admin).filter(models.Admin.email == payload.email).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="An admin with this email already exists.")

    # Normalize role and status
    role_str = payload.role.capitalize() if payload.role else "Student"
    if role_str not in ["Student", "Alumni"]:
        role_str = "Student"

    status_str = payload.status.capitalize() if payload.status else "Active"
    if status_str not in ["Active", "Pending", "Blocked"]:
        status_str = "Active"

    hashed_password = utils.get_password_hash(payload.password)

    new_user = models.Student(
        name=payload.name,
        email=payload.email,
        password=hashed_password,
        role=role_str,
        status=status_str,
        phone=payload.phone,
        reg_no=payload.reg_no,
        course=payload.course,
        batch=payload.batch,
        session=payload.session,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Also create default profile for student
    profile = models.StudentProfile(
        student_id=new_user.id,
        bio=f"Verified {role_str} at Campus InfoHub",
        location="Campus",
        skills="",
    )
    db.add(profile)
    db.commit()

    return new_user


@router.get("/pending-users", response_model=List[schemas.User])
def get_pending_users(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Return all users awaiting admin approval."""
    return db.query(models.Student).filter(
        models.Student.verification_status == "pending",
    ).all()


def _verification_record(user: models.Student, db: Session):
    alumnus = None
    if str(user.role).lower() == "alumni":
        alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "status": user.verification_status or ("approved" if user.status == "Active" else str(user.status).lower()),
        "operational_status": user.status,
        "email_verified": bool(user.email_verified),
        "phone_verified": bool(user.phone_verified),
        "created_at": user.created_at,
        "reviewed_at": user.reviewed_at,
        "rejection_reason": user.rejection_reason,
        "has_document": bool(user.identity_document_path),
        "document_name": user.identity_document_name,
        "document_kind": user.identity_document_kind,
        "personal": {
            "date_of_birth": user.date_of_birth,
            "gender": user.gender,
            "address": user.address,
            "city": user.city,
            "state": user.state,
            "country": user.country,
        },
        "academic": {
            "college_name": user.college_name,
            "university_name": user.university_name,
            "course": user.course,
            "branch": user.branch,
            "current_semester": user.current_semester,
            "admission_year": user.admission_year,
            "graduation_year": user.expected_graduation_year,
            "university_roll_no": user.university_roll_no,
            "enrollment_no": user.reg_no,
        },
        "professional": None if not alumnus else {
            "employment_status": alumnus.employment_status or alumnus.profession,
            "organization": alumnus.organization,
            "designation": alumnus.designation,
            "industry": alumnus.industry,
            "total_experience": alumnus.total_experience,
            "work_location": alumnus.work_location,
            "technical_skills": alumnus.technical_skills,
            "professional_bio": alumnus.professional_bio,
            "areas_of_expertise": alumnus.areas_of_expertise,
            "linkedin": alumnus.linkedin,
        },
        "mentorship": None if not alumnus else {
            "interested": bool(alumnus.mentorship_interested),
            "topics": alumnus.mentorship_topics,
            "mode": alumnus.mentorship_mode,
            "availability": alumnus.mentorship_availability,
        },
    }


@router.get("/account-verifications")
def account_verifications(
    status_filter: str = "pending",
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    normalized = status_filter.strip().lower()
    if normalized not in {"pending", "approved", "rejected", "suspended", "all"}:
        raise HTTPException(status_code=400, detail="Invalid verification status.")
    query = db.query(models.Student)
    if normalized != "all":
        query = query.filter(models.Student.verification_status == normalized)
    users = query.order_by(models.Student.created_at.desc()).all()
    return [_verification_record(user, db) for user in users]


@router.get("/account-verifications/{user_id}")
def account_verification_detail(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    record = _verification_record(user, db)
    record["history"] = [
        {
            "decision": item.decision,
            "reason": item.reason,
            "created_at": item.created_at,
            "admin_id": item.admin_id,
            "email_delivery_status": item.email_delivery_status,
            "email_delivery_error": item.email_delivery_error,
            "email_delivered_at": item.email_delivered_at,
            "email_attempts": item.email_attempts or 0,
        }
        for item in db.query(models.AccountVerificationHistory)
        .filter(models.AccountVerificationHistory.user_id == user_id)
        .order_by(models.AccountVerificationHistory.created_at.desc()).all()
    ]
    return record


@router.get("/account-verifications/{user_id}/document")
def account_verification_document(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    document = ensure_private_document(user.identity_document_path)
    return FileResponse(document, media_type=user.identity_document_mime or "application/octet-stream", filename=user.identity_document_name or document.name)


def _latest_decision_history(db: Session, user_id: int, decision: str | None = None):
    query = db.query(models.AccountVerificationHistory).filter(
        models.AccountVerificationHistory.user_id == user_id
    )
    if decision:
        query = query.filter(models.AccountVerificationHistory.decision == decision)
    return query.order_by(models.AccountVerificationHistory.id.desc()).first()


def _deliver_decision_email(db: Session, user, history):
    """Attempt delivery after the account decision is already committed."""
    if history.email_delivery_status == "sent":
        return "sent"
    history.email_attempts = (history.email_attempts or 0) + 1
    delivered = send_registration_decision_email(
        user.email,
        user.name,
        history.decision,
        history.reason,
        bool(user.email_verified),
    )
    if delivered:
        history.email_delivery_status = "sent"
        history.email_delivery_error = None
        history.email_delivered_at = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        history.email_delivery_status = "failed"
        history.email_delivery_error = "The SMTP provider rejected or could not deliver the message."
    db.commit()
    return history.email_delivery_status


def _decision_response(user, message: str, email_delivery: str | None):
    return {
        "message": message,
        "approval_status": user.verification_status,
        "account_status": user.status,
        "email_verified": bool(user.email_verified),
        "email_delivery": email_delivery or "not_attempted",
        "email_message": (
            "Decision email sent successfully."
            if email_delivery == "sent"
            else "Decision saved, but the email could not be delivered. Use Retry Decision Email."
        ),
    }


@router.post("/approve/{user_id}")
def approve_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.verification_status == "approved":
        history = _latest_decision_history(db, user.id, "approved")
        return _decision_response(user, "User was already approved; no duplicate email was sent.", history.email_delivery_status if history else None)
    if not user.identity_document_path:
        raise HTTPException(status_code=400, detail="A valid identity document is required before approval.")
    ensure_private_document(user.identity_document_path)
    user.verification_status = "approved"
    user.rejection_reason = None
    user.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    user.reviewed_by = current_user.id
    sync_account_status(user)
    alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
    if alumnus:
        sync_alumni_record(db, user)
        alumnus.rejection_reason = None
        alumnus.reviewed_at = user.reviewed_at
        alumnus.reviewed_by = current_user.id
    history = models.AccountVerificationHistory(
        user_id=user.id,
        admin_id=current_user.id,
        decision="approved",
        email_delivery_status="pending",
    )
    db.add(history)
    notification_service.notify_user(
        db, user.id,
        (
            f"Your {str(user.role).lower()} account has been approved and activated. You can now sign in."
            if user.status == "Active"
            else f"Your {str(user.role).lower()} registration was approved. Verify your email to activate the account."
        ),
        "account_approved", f"account-approved:{user.id}", "/login", "user", user.id,
    )
    db.commit()
    email_delivery = _deliver_decision_email(db, user, history)
    return _decision_response(
        user,
        "User approved and account activated." if user.status == "Active" else "User approved. Account will activate after email verification.",
        email_delivery,
    )


@router.post("/reject/{user_id}")
def reject_user(
    user_id: int,
    payload: schemas.AccountDecision,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Reject a registration while preserving its audit trail and status."""
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not payload.reason or len(payload.reason) < 5:
        raise HTTPException(status_code=400, detail="A rejection reason of at least 5 characters is required.")
    if user.verification_status == "rejected":
        history = _latest_decision_history(db, user.id, "rejected")
        return _decision_response(user, "User was already rejected; no duplicate email was sent.", history.email_delivery_status if history else None)
    user.verification_status = "rejected"
    user.rejection_reason = payload.reason
    user.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    user.reviewed_by = current_user.id
    sync_account_status(user)
    alumnus = db.query(models.Alumni).filter(func.lower(models.Alumni.email) == user.email.lower()).first()
    if alumnus:
        alumnus.status = "Rejected"
        alumnus.rejection_reason = payload.reason
        alumnus.reviewed_at = user.reviewed_at
        alumnus.reviewed_by = current_user.id
    history = models.AccountVerificationHistory(
        user_id=user.id,
        admin_id=current_user.id,
        decision="rejected",
        reason=payload.reason,
        email_delivery_status="pending",
    )
    db.add(history)
    notification_service.notify_user(
        db, user.id,
        f"Your {str(user.role).lower()} registration was rejected: {payload.reason}. You may correct the information and resubmit.",
        "account_rejected", f"account-rejected:{user.id}", "/login", "user", user.id,
    )
    db.commit()
    email_delivery = _deliver_decision_email(db, user, history)
    return _decision_response(user, "User registration rejected", email_delivery)


@router.post("/account-verifications/{user_id}/resend-decision-email")
def resend_decision_email(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    history = _latest_decision_history(db, user.id)
    if not history or history.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="No approval or rejection decision email is available to retry.")
    if history.email_delivery_status == "sent":
        return {"message": "Decision email was already sent; no duplicate was created.", "email_delivery": "sent"}
    email_delivery = _deliver_decision_email(db, user, history)
    return {
        "message": "Decision email sent successfully." if email_delivery == "sent" else "Decision remains saved, but email delivery failed again.",
        "email_delivery": email_delivery,
    }


@router.post("/block/{user_id}")
def toggle_block_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Toggle a user's blocked/active status."""
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "Active" if user.status == "Blocked" else "Blocked"
    user.verification_status = "approved" if user.status == "Active" else "suspended"
    db.add(models.AccountVerificationHistory(
        user_id=user.id,
        admin_id=current_user.id,
        decision=user.verification_status,
        reason="Account access status changed by administrator.",
    ))
    db.commit()
    return {"message": f"User status updated to {user.status}"}


@router.put("/users/{user_id}", response_model=schemas.User)
@router.post("/users/{user_id}", response_model=schemas.User)
@router.post("/users/update/{user_id}", response_model=schemas.User)
def update_user_details(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin updates student or alumni user details."""
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found in database.")

    if payload.email and payload.email.strip():
        clean_email = payload.email.strip().lower()
        if clean_email != (user.email or "").lower():
            existing_student = db.query(models.Student).filter(
                func.lower(models.Student.email) == clean_email,
                models.Student.id != user_id
            ).first()
            if existing_student:
                raise HTTPException(status_code=400, detail="This email address is already registered to another user account.")

            existing_admin = db.query(models.Admin).filter(
                func.lower(models.Admin.email) == clean_email
            ).first()
            if existing_admin:
                raise HTTPException(status_code=400, detail="This email address is already registered to an administrator account.")

            user.email = clean_email

    if payload.name is not None and payload.name.strip():
        user.name = payload.name.strip()
    if payload.role is not None and payload.role.strip():
        role_str = payload.role.strip().capitalize()
        if role_str in ["Student", "Alumni"]:
            user.role = role_str
    if payload.status is not None and payload.status.strip():
        status_str = payload.status.strip().capitalize()
        if status_str in ["Active", "Pending", "Blocked", "Rejected"]:
            user.status = status_str
            user.verification_status = {
                "Active": "approved", "Pending": "pending",
                "Blocked": "suspended", "Rejected": "rejected",
            }[status_str]
    if payload.reg_no is not None:
        user.reg_no = payload.reg_no.strip()
    if payload.course is not None:
        user.course = payload.course.strip()
    if payload.batch is not None:
        user.batch = payload.batch.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    if payload.session is not None:
        user.session = payload.session.strip()
    if payload.password and payload.password.strip():
        user.password = utils.get_password_hash(payload.password.strip())

    db.commit()
    db.refresh(user)

    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Permanently delete a user and all associated data (cascade)."""
    user = db.query(models.Student).filter(models.Student.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User permanently deleted"}


# ─── Job Management ────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=List[schemas.Job])
def get_all_jobs(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin sees ALL jobs including inactive ones."""
    return db.query(models.Job).order_by(models.Job.posted_date.desc()).all()


@router.get("/jobs/pending", response_model=List[schemas.Job])
def get_pending_jobs(db: Session = Depends(database.get_db), current_user=Depends(get_current_admin)):
    return db.query(models.Job).filter(models.Job.approval_status == "Pending").order_by(models.Job.posted_date.desc()).all()


@router.post("/jobs/{job_id}/approve", response_model=schemas.Job)
def approve_job(job_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_admin)):
    from datetime import timezone
    from ..job_deadlines import deadline_has_passed
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.application_deadline:
        raise HTTPException(status_code=400, detail="The alumni must add an application deadline before this job can be approved.")
    if deadline_has_passed(job.application_deadline):
        raise HTTPException(status_code=400, detail="This job deadline has already passed. Ask the alumni to update it before approval.")
    job.approval_status = "Approved"
    job.approved_at = datetime.now(timezone.utc)
    job.approved_by = current_user.name
    job.rejection_reason = None
    if job.posted_by_user_id:
        notification_service.notify_user(
            db, job.posted_by_user_id,
            f"Your job post '{job.title}' was approved.",
            "job_approved", f"job-approved:{job.id}", f"/alumni/jobs/{job.id}", "job", job.id,
        )
    notification_service.notify_students(
        db, f"New opportunity: {job.title} at {job.company}",
        "new_job", f"job-published:{job.id}", f"/student/jobs/{job.id}", "job", job.id,
    )
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/reject", response_model=schemas.Job)
def reject_job(job_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_admin)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.approval_status = "Rejected"
    job.is_active = False
    job.rejection_reason = "Rejected by administrator"
    if job.posted_by_user_id:
        notification_service.notify_user(
            db, job.posted_by_user_id,
            f"Your job post '{job.title}' was rejected.",
            "job_rejected", f"job-rejected:{job.id}", None, "job", job.id,
        )
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


# ─── Post Moderation & Notice ──────────────────────────────────────────────────

@router.post("/posts/notice", response_model=schemas.Post)
def create_admin_notice(
    post: schemas.PostCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin creates a global notice/announcement. It bypasses user_id constraints by setting user_id null and type='notice'."""
    from datetime import datetime, timezone
    
    # We leave user_id=None since it's an admin post, not a student post
    db_post = models.Post(
        content=post.content,
        image=post.image,
        type='notice',
        admin_id=current_user.id,
        is_approved=True,
        approval_status="Approved",
        approved_at=datetime.now(timezone.utc),
        approved_by=getattr(current_user, "name", "System Admin")
    )
    db.add(db_post)
    db.flush()
    notification_service.notify_students(
        db, f"Important announcement: {db_post.content[:100]}",
        "announcement", f"announcement:{db_post.id}", "/student/feed", "post", db_post.id,
    )
    db.commit()
    db.refresh(db_post)
    return db_post

@router.get("/posts/pending", response_model=List[schemas.Post])
def get_pending_posts(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """List all posts awaiting approval, newest first."""
    return (
        db.query(models.Post)
        .filter(models.Post.approval_status == "Pending")
        .order_by(models.Post.created_at.desc())
        .all()
    )


@router.get("/posts", response_model=List[schemas.Post])
def get_all_posts(
    status_filter: str = "all",
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin can see ALL posts including unapproved ones."""
    normalized = status_filter.strip().capitalize()
    if normalized not in {"All", "Pending", "Approved", "Rejected"}:
        raise HTTPException(status_code=400, detail="Invalid post status filter.")
    query = db.query(models.Post)
    if normalized != "All":
        query = query.filter(models.Post.approval_status == normalized)
    return query.order_by(models.Post.created_at.desc()).all()


@router.post("/posts/{post_id}/approve", response_model=schemas.Post)
def approve_post(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Approve a post — makes it visible in the public feed."""
    from datetime import datetime, timezone

    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.approval_status == "Approved" and post.is_approved:
        return post

    post.is_approved = True
    post.approval_status = "Approved"
    post.approved_at = datetime.now(timezone.utc)
    post.approved_by = getattr(current_user, "name", "Admin")

    post.rejection_reason = None
    if post.user_id:
        role = str(post.user.role).lower() if post.user else "student"
        notification_service.notify_user(
            db, post.user_id,
            "Your post has been approved and is now visible to the community!",
            "post_approved", f"post-approved:{post.id}", f"/{role}/feed?post={post.id}", "post", post.id,
        )
    notification_service.notify_students(
        db, "A new community post is available in the feed.",
        "new_post", f"post-published:{post.id}", f"/student/feed?post={post.id}", "post", post.id,
        exclude_user_id=post.user_id,
    )
    db.commit()
    db.refresh(post)
    return post


def _reject_post(post_id: int, reason: str, db: Session):
    if len(reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A rejection reason of at least 5 characters is required.")
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.approval_status == "Rejected":
        return post

    post.is_approved = False
    post.approval_status = "Rejected"
    post.rejection_reason = reason.strip()
    if post.user_id:
        role = str(post.user.role).lower() if post.user else "student"
        notification_service.notify_user(
            db, post.user_id,
            f"Your post was rejected by the administrator. Reason: {post.rejection_reason}",
            "post_rejected", f"post-rejected:{post.id}", f"/{role}/feed?post={post.id}", "post", post.id,
        )
    db.commit()
    db.refresh(post)
    return post


@router.post("/posts/{post_id}/reject", response_model=schemas.Post)
def reject_post_with_reason(
    post_id: int,
    payload: schemas.AccountDecision,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Reject a post while retaining it so its author can see the decision."""
    return _reject_post(post_id, payload.reason or "", db)


@router.delete("/posts/{post_id}")
def reject_post_legacy(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Backward-compatible rejection route; records a reason instead of deleting."""
    post = _reject_post(post_id, "Rejected by administrator", db)
    return {"message": "Post rejected", "post_id": post.id}


# ─── Reports ──────────────────────────────────────────────────────────────────

@router.get("/reports", response_model=List[schemas.Report])
def get_reports(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    for r in reports:
        if r.reporter:
            r.reporter_name = r.reporter.name
            r.reporter_email = r.reporter.email
    return reports


@router.post("/reports/{report_id}/action")
def handle_report_action(
    report_id: int,
    action_data: schemas.ReportAction,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    action = action_data.action.lower()

    if action == "dismiss":
        report.status = "Dismissed"
        report.action_taken = "Dismissed by admin"

    elif action == "delete_post" or action == "delete_content":
        if report.target_id:
            post = db.query(models.Post).filter(models.Post.id == report.target_id).first()
            if post:
                db.delete(post)
        report.status = "Resolved"
        report.action_taken = "Reported content removed"

    elif action == "ban_user" or action == "suspend_user":
        user_to_ban = None
        target_str = (report.target_identifier or "").strip()
        if report.target_id:
            user_to_ban = db.query(models.Student).filter(models.Student.id == report.target_id).first()
        if not user_to_ban and target_str:
            user_to_ban = db.query(models.Student).filter(
                (func.lower(models.Student.email) == target_str.lower()) |
                (func.lower(models.Student.reg_no) == target_str.lower())
            ).first()

        if user_to_ban:
            user_to_ban.status = "Blocked"
            report.action_taken = f"User account ({user_to_ban.email}) blocked"
        else:
            report.action_taken = "Resolved — target user account not found"
            
        report.status = "Resolved"

    elif action == "resolve":
        report.status = "Resolved"
        report.action_taken = action_data.action_taken or "Resolved by admin"

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    db.commit()
    return {"message": f"Report action '{action}' completed"}


# ── Activity Feed ─────────────────────────────────────────────────────────────

from datetime import datetime, timezone

def _relative_time(dt: datetime) -> str:
    """Return a human-readable relative time string."""
    if dt is None:
        return "unknown"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return f"{seconds} sec ago"
    elif seconds < 3600:
        return f"{seconds // 60} min ago"
    elif seconds < 86400:
        return f"{seconds // 3600} hr ago"
    else:
        return f"{seconds // 86400} days ago"


@router.get("/activity", response_model=List[schemas.AdminActivityEvent])
def get_admin_activity(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """
    Return the 20 most recent platform events across users, jobs, posts, and reports.
    """
    events = []

    # Recent user registrations (last 5)
    recent_users = (
        db.query(models.Student)
        .order_by(models.Student.created_at.desc())
        .limit(5).all()
    )
    for u in recent_users:
        role_label = "Alumni" if str(u.role).lower() == "alumni" else "Student"
        events.append({
            "msg": f"New {role_label} registered: {u.name}",
            "time": _relative_time(u.created_at),
            "type": "user",
            "_dt": u.created_at,
        })

    # Recent job postings (last 5)
    recent_jobs = (
        db.query(models.Job)
        .order_by(models.Job.posted_date.desc())
        .limit(5).all()
    )
    for j in recent_jobs:
        events.append({
            "msg": f"New job posted: {j.title} at {j.company}",
            "time": _relative_time(j.posted_date),
            "type": "job",
            "_dt": j.posted_date,
        })

    # Recent posts (last 5)
    recent_posts = (
        db.query(models.Post)
        .order_by(models.Post.created_at.desc())
        .limit(5).all()
    )
    for p in recent_posts:
        author = p.user.name if p.user else "System Admin"
        events.append({
            "msg": f"New post submitted by {author}",
            "time": _relative_time(p.created_at),
            "type": "post",
            "_dt": p.created_at,
        })

    # Recent reports (last 5)
    recent_reports = (
        db.query(models.Report)
        .order_by(models.Report.created_at.desc())
        .limit(5).all()
    )
    for r in recent_reports:
        events.append({
            "msg": f"New report filed: {r.target_type} #{r.target_id} — {r.reason}",
            "time": _relative_time(r.created_at),
            "type": "report",
            "_dt": r.created_at,
        })

    # Sort all by datetime descending and return top 20
    events.sort(key=lambda x: x.get("_dt") or datetime.min, reverse=True)
    return [
        {"msg": e["msg"], "time": e["time"], "type": e["type"]}
        for e in events[:20]
    ]


# ── System Settings ────────────────────────────────────────────────────────────


def _get_or_create_settings(db: Session) -> models.SystemSettings:
    """Return the singleton settings row, creating it if not yet present."""
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings", response_model=schemas.SystemSettingsOut)
def get_settings(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Return current system settings."""
    return _get_or_create_settings(db)


@router.put("/settings", response_model=schemas.SystemSettingsOut)
def update_settings(
    payload: schemas.SystemSettingsUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Update system settings (partial update supported)."""
    settings = _get_or_create_settings(db)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.post("/change-password", response_model=schemas.Message)
def change_admin_password(
    payload: schemas.AdminPasswordChange,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Change authenticated admin account password."""
    if not utils.verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Previous password is incorrect.")
        
    current_user.password = utils.get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully. Please log in again."}


# ─── Alumni Management Endpoints ─────────────────────────────────────────────

@router.get("/alumni", response_model=List[schemas.AlumniAdminOut])
def get_all_alumni_admin(
    course: Optional[str] = None,
    session: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Admin views registered alumni directory records with course and session filters."""
    query = db.query(models.Alumni)
    
    if course and course.strip() and course.strip() != "All Courses":
        clean_course = course.strip()
        query = query.filter(models.Alumni.course_completed == clean_course)
        
    if session and session.strip() and session.strip() != "All Sessions":
        clean_session = session.strip().replace("–", "-")
        if "-" in clean_session:
            parts = clean_session.split("-")
            if len(parts) == 2 and parts[0].strip().isdigit() and parts[1].strip().isdigit():
                adm_yr = int(parts[0].strip())
                comp_yr = int(parts[1].strip())
                query = query.filter(
                    models.Alumni.year_of_admission == adm_yr,
                    models.Alumni.year_of_completion == comp_yr
                )

    if status_filter:
        query = query.filter(models.Alumni.status == status_filter)
        
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Alumni.name.ilike(search_term),
                models.Alumni.email.ilike(search_term),
                models.Alumni.enrollment_number.ilike(search_term),
                models.Alumni.course_completed.ilike(search_term),
                models.Alumni.organization.ilike(search_term),
                models.Alumni.current_city.ilike(search_term)
            )
        )
    return query.order_by(models.Alumni.created_at.desc()).all()


@router.get("/alumni/export")
def export_alumni_excel(
    course: Optional[str] = None,
    session: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Export filtered Alumni records to Excel (.xlsx)."""
    query = db.query(models.Alumni)
    
    if course and course.strip() and course.strip() != "All Courses":
        clean_course = course.strip()
        query = query.filter(models.Alumni.course_completed == clean_course)
        
    if session and session.strip() and session.strip() != "All Sessions":
        clean_session = session.strip().replace("–", "-")
        if "-" in clean_session:
            parts = clean_session.split("-")
            if len(parts) == 2 and parts[0].strip().isdigit() and parts[1].strip().isdigit():
                adm_yr = int(parts[0].strip())
                comp_yr = int(parts[1].strip())
                query = query.filter(
                    models.Alumni.year_of_admission == adm_yr,
                    models.Alumni.year_of_completion == comp_yr
                )

    if status_filter and status_filter.strip() and status_filter.strip() != "all":
        query = query.filter(models.Alumni.status == status_filter.strip())
        
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Alumni.name.ilike(search_term),
                models.Alumni.email.ilike(search_term),
                models.Alumni.enrollment_number.ilike(search_term),
                models.Alumni.course_completed.ilike(search_term),
                models.Alumni.organization.ilike(search_term),
                models.Alumni.current_city.ilike(search_term)
            )
        )
        
    alumni_records = query.order_by(models.Alumni.created_at.desc()).all()
    if not alumni_records:
        raise HTTPException(status_code=400, detail="No records available for the selected filters.")

    wb = Workbook()
    ws = wb.active
    ws.title = "Alumni Directory"
    ws.views.sheetView[0].showGridLines = True

    headers = [
        "Name", "Enrollment Number", "Email", "Mobile Number", "Course", 
        "Year of Admission", "Year of Completion", "Session", "Profession", 
        "Designation", "Organization/Institution", "Current City", "Current State", 
        "Current Country", "Willing to Attend Events", "Contribution to College", 
        "Status", "Created At"
    ]
    
    ws.append(headers)

    header_fill = PatternFill(start_color="D97706", end_color="D97706", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    for a in alumni_records:
        created_str = a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "N/A"
        row_data = [
            a.name,
            a.enrollment_number,
            a.email,
            a.mobile_number,
            a.course_completed,
            a.year_of_admission,
            a.year_of_completion,
            f"{a.year_of_admission}–{a.year_of_completion}",
            a.profession,
            a.designation or "NA",
            a.organization or "NA",
            a.current_city,
            a.current_state,
            a.current_country or "India",
            a.willing_to_attend_events,
            a.contributions,
            a.status,
            created_str
        ]
        ws.append(row_data)

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    ws.freeze_panes = "A2"

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename_parts = ["Alumni"]
    if course and course != "All Courses":
        filename_parts.append(course)
    if session and session != "All Sessions":
        filename_parts.append(session.replace("–", "-"))
    filename_parts.append(datetime.now().strftime("%Y-%m-%d"))
    filename = f"{'_'.join(filename_parts)}.xlsx"

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/pending/export")
@router.get("/pending-approvals/export")
def export_pending_approvals_excel(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    """Export Pending Approval records to Excel (.xlsx)."""
    pending_alumni = db.query(models.Alumni).filter(models.Alumni.status == "Pending").all()
    pending_students = db.query(models.Student).filter(models.Student.status == "Pending").all()
    
    if not pending_alumni and not pending_students:
        raise HTTPException(status_code=400, detail="No records available for the selected filters.")

    wb = Workbook()
    ws = wb.active
    ws.title = "Pending Approvals"
    ws.views.sheetView[0].showGridLines = True

    headers = [
        "Name", "Email", "Mobile Number", "Enrollment Number", "Course", 
        "Admission Year", "Completion Year", "Session", "Profession", 
        "Organization", "City", "State", "Country", "Registration Date", "Approval Status"
    ]
    
    ws.append(headers)

    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for a in pending_alumni:
        reg_date = a.created_at.strftime("%Y-%m-%d") if a.created_at else "N/A"
        ws.append([
            a.name, a.email, a.mobile_number, a.enrollment_number, a.course_completed,
            a.year_of_admission, a.year_of_completion, f"{a.year_of_admission}–{a.year_of_completion}",
            a.profession, a.organization or "NA", a.current_city, a.current_state,
            a.current_country or "India", reg_date, "Pending"
        ])

    for s in pending_students:
        reg_date = s.created_at.strftime("%Y-%m-%d") if hasattr(s, 'created_at') and s.created_at else "N/A"
        ws.append([
            s.name, s.email, s.phone or "NA", s.reg_no or "NA", s.course or "NA",
            "N/A", "N/A", s.batch or "N/A", "Student", "University", "N/A", "N/A",
            "India", reg_date, "Pending"
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    ws.freeze_panes = "A2"

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"Pending_Approvals_{datetime.now().strftime('%Y-%m-%d')}.xlsx"

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/alumni/{alumni_id}", response_model=schemas.AlumniAdminOut)
def get_alumnus_detail_admin(
    alumni_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    alumnus = db.query(models.Alumni).filter(models.Alumni.id == alumni_id).first()
    if not alumnus:
        raise HTTPException(status_code=404, detail="Alumnus record not found.")
    return alumnus


@router.put("/alumni/{alumni_id}/status", response_model=schemas.AlumniAdminOut)
def update_alumni_status_admin(
    alumni_id: int,
    payload: schemas.AlumniStatusUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    alumnus = db.query(models.Alumni).filter(models.Alumni.id == alumni_id).first()
    if not alumnus:
        raise HTTPException(status_code=404, detail="Alumnus record not found.")
    
    normalized = payload.status.strip().capitalize()
    alumnus.status = normalized
    account = db.query(models.Student).filter(func.lower(models.Student.email) == alumnus.email.lower(), models.Student.role == "Alumni").first()
    if account:
        account.status = normalized if normalized in ["Active", "Pending", "Rejected", "Blocked"] else "Blocked"
        if normalized == "Active":
            if not account.email_verified or not account.phone_verified:
                raise HTTPException(status_code=400, detail="Email and mobile OTP verification must be completed before approval.")
            notification_service.notify_user(
                db, account.id, "Your alumni account has been approved. You can now sign in.",
                "account_approved", f"account-approved:{account.id}", "/login", "user", account.id,
            )
        elif normalized == "Rejected":
            notification_service.notify_user(
                db, account.id, "Your alumni registration was rejected.",
                "account_rejected", f"account-rejected:{account.id}", None, "user", account.id,
            )
    db.commit()
    db.refresh(alumnus)
    return alumnus


@router.delete("/alumni/{alumni_id}", response_model=schemas.Message)
def delete_alumnus_admin(
    alumni_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    alumnus = db.query(models.Alumni).filter(models.Alumni.id == alumni_id).first()
    if not alumnus:
        raise HTTPException(status_code=404, detail="Alumnus record not found.")
    
    db.delete(alumnus)
    db.commit()
    return {"message": "Alumnus record deleted successfully."}


# ─── Notice Management Endpoints ─────────────────────────────────────────────

@router.get("/notices", response_model=List[schemas.NoticeOut])
def get_all_notices_admin(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    return db.query(models.Notice).order_by(models.Notice.published_date.desc()).all()


@router.post("/notices", response_model=schemas.NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice_admin(
    payload: schemas.NoticeCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    notice = models.Notice(**payload.dict())
    db.add(notice)
    db.flush()
    if notice.is_published:
        notification_service.notify_students(
            db, f"Important announcement: {notice.title}",
            "announcement", f"notice-published:{notice.id}", "/student/dashboard", "notice", notice.id,
        )
    db.commit()
    db.refresh(notice)
    return notice


@router.put("/notices/{notice_id}", response_model=schemas.NoticeOut)
def update_notice_admin(
    notice_id: int,
    payload: schemas.NoticeUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    notice = models.Notice.filter(models.Notice.id == notice_id).first() if hasattr(models.Notice, 'filter') else db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(notice, k, v)
    
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/notices/{notice_id}", response_model=schemas.Message)
def delete_notice_admin(
    notice_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    
    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted successfully."}


# ─── Event Management Endpoints ─────────────────────────────────────────────

from datetime import datetime, date, time as time_cls, timedelta

def parse_event_time(time_str: Optional[str]) -> time_cls:
    if not time_str or not str(time_str).strip():
        return time_cls(9, 0)
    clean = str(time_str).strip().upper()
    for fmt in ["%I:%M %p", "%I:%M%p", "%H:%M", "%I %p"]:
        try:
            return datetime.strptime(clean, fmt).time()
        except ValueError:
            pass
    return time_cls(9, 0)

def parse_event_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str or not str(date_str).strip():
        return None
    clean = str(date_str).strip()
    for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"]:
        try:
            return datetime.strptime(clean, fmt).date()
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(clean).date()
    except Exception:
        return None

def compute_event_datetimes(payload_dict: dict):
    start_d_raw = payload_dict.get('start_date') or payload_dict.get('date')
    end_d_raw = payload_dict.get('end_date') or start_d_raw
    start_t_raw = payload_dict.get('start_time') or payload_dict.get('time') or "09:00 AM"
    end_t_raw = payload_dict.get('end_time') or "05:00 PM"

    s_date = parse_event_date(start_d_raw)
    e_date = parse_event_date(end_d_raw)
    s_time = parse_event_time(start_t_raw)
    e_time = parse_event_time(end_t_raw)

    s_dt = datetime.combine(s_date, s_time) if s_date else None
    e_dt = datetime.combine(e_date, e_time) if e_date else None

    if s_dt and not e_dt:
        e_dt = s_dt + timedelta(hours=2)
    elif s_dt and e_dt and e_dt <= s_dt:
        e_dt = s_dt + timedelta(hours=2)

    return s_dt, e_dt, s_date, e_date


@router.get("/events")
def get_all_events_admin(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    events = db.query(models.Event).all()
    now = datetime.now()
    result = []
    for e in events:
        start_dt = e.start_datetime or (datetime.combine(e.date, time_cls(9, 0)) if e.date else None)
        end_dt = e.end_datetime or (datetime.combine(e.date, time_cls(18, 0)) if e.date else None)
        
        if start_dt and end_dt:
            if now > end_dt:
                calc_status = "Completed"
            elif now >= start_dt and now <= end_dt:
                calc_status = "Ongoing"
            else:
                calc_status = "Upcoming"
        else:
            calc_status = "Upcoming"

        result.append({
            "id": e.id,
            "title": e.title,
            "type": e.type or "Career",
            "audience": e.audience or "All",
            "date": str(e.date) if e.date else None,
            "time": e.time,
            "location": e.location,
            "description": e.description,
            "organizer": e.organizer or "Campus InfoHub Committee",
            "posted_by": e.posted_by or "Campus InfoHub Committee",
            "is_published": e.is_published if e.is_published is not None else True,
            "is_active": e.is_active if e.is_active is not None else True,
            "attendees": e.attendees or 0,
            "start_datetime": start_dt.isoformat() if start_dt else None,
            "end_datetime": end_dt.isoformat() if end_dt else None,
            "status": calc_status
        })

    result.sort(key=lambda x: x["start_datetime"] or x["date"] or "", reverse=True)
    return result


@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event_admin(
    payload: schemas.EventCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    p_dict = payload.dict(exclude_unset=True)
    s_dt, e_dt, s_date, e_date = compute_event_datetimes(p_dict)

    posted_by_name = payload.posted_by or (current_user.name if hasattr(current_user, 'name') else "Campus InfoHub Committee")

    start_t_str = payload.start_time or payload.time or "02:00 PM"
    end_t_str = payload.end_time or "05:00 PM"
    time_display = f"{start_t_str} – {end_t_str}" if start_t_str != end_t_str else start_t_str

    event_obj = models.Event(
        title=payload.title,
        type=payload.type or "Career",
        audience=payload.audience or "All",
        date=s_date,
        time=time_display,
        location=payload.location,
        description=payload.description,
        organizer=payload.organizer or "Campus InfoHub Committee",
        posted_by=posted_by_name,
        is_published=payload.is_published if payload.is_published is not None else True,
        is_active=payload.is_active if payload.is_active is not None else True,
        start_datetime=s_dt,
        end_datetime=e_dt,
        attendees=0
    )

    db.add(event_obj)
    db.commit()
    db.refresh(event_obj)

    now = datetime.now()
    calc_status = "Upcoming"
    if s_dt and e_dt:
        if now > e_dt:
            calc_status = "Completed"
        elif now >= s_dt and now <= e_dt:
            calc_status = "Ongoing"

    return {
        "id": event_obj.id,
        "title": event_obj.title,
        "type": event_obj.type,
        "audience": event_obj.audience,
        "date": str(event_obj.date) if event_obj.date else None,
        "time": event_obj.time,
        "location": event_obj.location,
        "description": event_obj.description,
        "organizer": event_obj.organizer,
        "posted_by": event_obj.posted_by,
        "is_published": event_obj.is_published,
        "is_active": event_obj.is_active,
        "attendees": event_obj.attendees,
        "start_datetime": s_dt.isoformat() if s_dt else None,
        "end_datetime": e_dt.isoformat() if e_dt else None,
        "status": calc_status
    }


@router.put("/events/{event_id}")
def update_event_admin(
    event_id: int,
    payload: schemas.EventCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    event_obj = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event_obj:
        raise HTTPException(status_code=404, detail="Event not found.")

    p_dict = payload.dict(exclude_unset=True)
    s_dt, e_dt, s_date, e_date = compute_event_datetimes(p_dict)

    if payload.title: event_obj.title = payload.title
    if payload.type: event_obj.type = payload.type
    if payload.audience: event_obj.audience = payload.audience
    if payload.location: event_obj.location = payload.location
    if payload.description: event_obj.description = payload.description
    if payload.organizer: event_obj.organizer = payload.organizer
    if payload.posted_by: event_obj.posted_by = payload.posted_by
    if payload.is_published is not None: event_obj.is_published = payload.is_published
    if payload.is_active is not None: event_obj.is_active = payload.is_active

    if s_date: event_obj.date = s_date
    if s_dt: event_obj.start_datetime = s_dt
    if e_dt: event_obj.end_datetime = e_dt

    start_t_str = payload.start_time or payload.time or "02:00 PM"
    end_t_str = payload.end_time or "05:00 PM"
    event_obj.time = f"{start_t_str} – {end_t_str}" if start_t_str != end_t_str else start_t_str

    db.commit()
    db.refresh(event_obj)

    now = datetime.now()
    calc_status = "Upcoming"
    if s_dt and e_dt:
        if now > e_dt:
            calc_status = "Completed"
        elif now >= s_dt and now <= e_dt:
            calc_status = "Ongoing"

    return {
        "id": event_obj.id,
        "title": event_obj.title,
        "type": event_obj.type,
        "audience": event_obj.audience,
        "date": str(event_obj.date) if event_obj.date else None,
        "time": event_obj.time,
        "location": event_obj.location,
        "description": event_obj.description,
        "organizer": event_obj.organizer,
        "posted_by": event_obj.posted_by,
        "is_published": event_obj.is_published,
        "is_active": event_obj.is_active,
        "attendees": event_obj.attendees,
        "start_datetime": s_dt.isoformat() if s_dt else None,
        "end_datetime": e_dt.isoformat() if e_dt else None,
        "status": calc_status
    }


@router.delete("/events/{event_id}", response_model=schemas.Message)
def delete_event_admin(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_admin),
):
    event_obj = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event_obj:
        raise HTTPException(status_code=404, detail="Event not found.")

    db.delete(event_obj)
    db.commit()
    return {"message": "Event deleted successfully."}


