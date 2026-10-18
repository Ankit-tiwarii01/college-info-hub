from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from .. import models, schemas, database
from ..dependencies import get_current_user_from_token
from .. import notification_service
from ..job_deadlines import application_today, deadline_has_passed

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"]
)

# --------------------------------------------------------------------------- #
# Helper
# --------------------------------------------------------------------------- #

def _create_notification(db: Session, user_id: int, text: str, notif_type: str = "jobs"):
    notif = models.Notification(user_id=user_id, text=text, type=notif_type)
    db.add(notif)


# --------------------------------------------------------------------------- #
# Job CRUD
# --------------------------------------------------------------------------- #

@router.get("/", response_model=List[schemas.Job])
def read_jobs(
    skip: int = 0,
    limit: int = 100,
    job_type: str = None,
    location: str = None,
    category: str = "active",
    db: Session = Depends(database.get_db)
):
    """List approved jobs, grouped by their date-only application deadline."""
    query = db.query(models.Job).filter(
        models.Job.is_active == True,
        models.Job.approval_status == "Approved",
    )
    normalized_category = (category or "active").strip().lower()
    today = application_today()
    if normalized_category == "active":
        query = query.filter(models.Job.application_deadline >= today)
        ordering = (models.Job.application_deadline.asc(), models.Job.posted_date.desc())
    elif normalized_category == "expired":
        query = query.filter(models.Job.application_deadline < today)
        ordering = (models.Job.application_deadline.desc(), models.Job.posted_date.desc())
    elif normalized_category == "all":
        ordering = (models.Job.posted_date.desc(),)
    else:
        raise HTTPException(status_code=400, detail="Job category must be active, expired, or all")
    if job_type:
        query = query.filter(models.Job.type.ilike(f"%{job_type}%"))
    if location:
        query = query.filter(models.Job.location.ilike(f"%{location}%"))
    return query.order_by(*ordering).offset(skip).limit(limit).all()


@router.get("/counts")
def get_job_counts(db: Session = Depends(database.get_db)):
    today = application_today()
    base_filters = (
        models.Job.is_active == True,
        models.Job.approval_status == "Approved",
    )
    return {
        "active": db.query(models.Job).filter(*base_filters, models.Job.application_deadline >= today).count(),
        "expired": db.query(models.Job).filter(*base_filters, models.Job.application_deadline < today).count(),
    }


@router.get("/my/posts", response_model=List[schemas.Job])
def read_my_jobs(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    if isinstance(current_user, models.Admin):
        return db.query(models.Job).order_by(models.Job.posted_date.desc()).all()
    if str(getattr(current_user, "role", "")).lower() != "alumni":
        raise HTTPException(status_code=403, detail="Only alumni can view submitted jobs")
    return db.query(models.Job).filter(
        models.Job.posted_by_user_id == current_user.id
    ).order_by(models.Job.posted_date.desc()).all()


@router.get("/{job_id:int}", response_model=schemas.Job)
def read_job(
    job_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    is_owner = not isinstance(current_user, models.Admin) and job and job.posted_by_user_id == current_user.id
    if not job or (job.approval_status != "Approved" and not isinstance(current_user, models.Admin) and not is_owner):
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/", response_model=schemas.Job)
def create_job(
    job: schemas.JobCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Create a job. Only Alumni or Admins are authorised."""
    is_authorized = isinstance(current_user, models.Admin) or (
        hasattr(current_user, 'role') and str(current_user.role) in ['Admin', 'Alumni']
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to post jobs")

    job_data = job.dict()
    if hasattr(current_user, 'name'):
        job_data['posted_by'] = current_user.name

    is_admin = isinstance(current_user, models.Admin)
    job_data["posted_by_user_id"] = None if is_admin else current_user.id
    job_data["approval_status"] = "Approved" if is_admin else "Pending"
    if is_admin:
        job_data["approved_at"] = datetime.now(timezone.utc)
        job_data["approved_by"] = current_user.name
    db_job = models.Job(**job_data)
    db.add(db_job)
    db.flush()
    if not is_admin:
        notification_service.notify_admins(
            db,
            f"{current_user.name} submitted job '{db_job.title}' for review.",
            "job_pending",
            f"job-pending:{db_job.id}",
            "/admin/jobs",
            "job",
            db_job.id,
        )
    db.commit()
    db.refresh(db_job)
    return db_job


@router.put("/{job_id:int}", response_model=schemas.Job)
def update_job(
    job_id: int,
    update: schemas.JobUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user_from_token),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    is_admin = isinstance(current_user, models.Admin)
    if not is_admin and job.posted_by_user_id != getattr(current_user, "id", None):
        raise HTTPException(status_code=403, detail="You can edit only your own job postings")
    update_data = update.model_dump(exclude_unset=True)
    if "application_deadline" in update_data and update_data["application_deadline"] is None:
        raise HTTPException(status_code=400, detail="Application deadline is required")
    for key, value in update_data.items():
        setattr(job, key, value)
    if not job.application_deadline:
        raise HTTPException(status_code=400, detail="Application deadline is required")
    if not is_admin:
        job.approval_status = "Pending"
        job.approved_at = None
        job.approved_by = None
        job.rejection_reason = None
        job.is_active = True
        notification_service.notify_admins(
            db,
            f"{current_user.name} updated job '{job.title}' for review.",
            "job_pending",
            f"job-updated:{job.id}:{datetime.now(timezone.utc).isoformat()}",
            "/admin/jobs",
            "job",
            job.id,
        )
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id:int}")
def delete_job(
    job_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Soft-delete a job by setting is_active = False."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_authorized = isinstance(current_user, models.Admin) or (
        job.posted_by_user_id == getattr(current_user, 'id', None)
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")

    job.is_active = False
    db.commit()
    return {"message": "Job removed successfully"}


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

@router.post("/{job_id:int}/apply", response_model=schemas.JobApplication)
def apply_job(
    job_id: int,
    application: schemas.JobApplicationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Submit an application for a job with an optional cover letter and resume URL."""
    if hasattr(current_user, 'role') and str(current_user.role).lower() != 'student':
        raise HTTPException(status_code=403, detail="Only students can apply for job vacancies. Alumni can post open vacancy jobs.")

    job = db.query(models.Job).filter(
        models.Job.id == job_id,
        models.Job.is_active == True,
        models.Job.approval_status == "Approved",
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")
    if deadline_has_passed(job.application_deadline):
        raise HTTPException(status_code=410, detail="The application deadline for this job has passed")

    existing = db.query(models.JobApplication).filter(
        models.JobApplication.job_id == job_id,
        models.JobApplication.student_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")

    db_application = models.JobApplication(
        job_id=job_id,
        student_id=current_user.id,
        cover_letter=application.cover_letter,
        resume_url=application.resume_url
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.get("/{job_id:int}/applications", response_model=List[schemas.JobApplication])
def get_job_applications(
    job_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Get all applications for a job. Only the poster or admin can view."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_authorized = isinstance(current_user, models.Admin) or job.posted_by_user_id == getattr(current_user, 'id', None)
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view applications for this job")

    return (
        db.query(models.JobApplication)
        .filter(models.JobApplication.job_id == job_id)
        .order_by(models.JobApplication.applied_date.desc())
        .all()
    )


@router.get("/my/applications", response_model=List[schemas.JobApplication])
def get_my_applications(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Get all job applications submitted by the current student."""
    return (
        db.query(models.JobApplication)
        .filter(models.JobApplication.student_id == current_user.id)
        .order_by(models.JobApplication.applied_date.desc())
        .all()
    )


@router.put("/applications/{application_id}/status", response_model=schemas.JobApplication)
def update_application_status(
    application_id: int,
    update: schemas.JobApplicationStatusUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token)
):
    """Alumni updates the status of a specific application. Notifies the student."""
    application = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    user_role = str(getattr(current_user, 'role', '')).lower()
    is_authorized = isinstance(current_user, models.Admin) or job.posted_by_user_id == getattr(current_user, 'id', None)
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")

    # Track history
    history_entry = models.JobApplicationStatusHistory(
        application_id=application_id,
        old_status=application.status,
        new_status=update.status,
        note=update.note
    )
    db.add(history_entry)

    old_status = application.status
    application.status = update.status

    # Notify the student
    _create_notification(
        db,
        user_id=application.student_id,
        text=f"Your application for '{job.title}' at {job.company} has been updated to '{update.status}'."
    )

    db.commit()
    db.refresh(application)
    return application
