"""
Public Read-Only Router
Endpoints accessible WITHOUT authentication for the public explore page.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas, database

router = APIRouter(prefix="/public", tags=["Public"])


# ── Platform Stats ────────────────────────────────────────────────────────────

@router.get("/stats")
def get_platform_stats(db: Session = Depends(database.get_db)):
    """Return aggregate platform numbers for the landing/explore page."""
    total_students = db.query(models.Student).filter(
        models.Student.role == 'Student', models.Student.status == 'Active'
    ).count()
    total_alumni = db.query(models.Student).filter(
        models.Student.role == 'Alumni', models.Student.status == 'Active'
    ).count()
    total_posts = db.query(models.Post).filter(models.Post.is_approved == True).count()
    total_jobs = db.query(models.Job).filter(models.Job.is_active == True).count()
    total_events = db.query(models.Event).count()
    total_mentors = db.query(models.Student).filter(
        models.Student.role == 'Alumni', models.Student.status == 'Active'
    ).count()

    return {
        "total_students": total_students,
        "total_alumni": total_alumni,
        "total_members": total_students + total_alumni,
        "total_posts": total_posts,
        "total_jobs": total_jobs,
        "total_events": total_events,
        "total_mentors": total_mentors,
    }


# ── Public Notices (no auth required) ────────────────────────────────────────

@router.get("/notices")
def get_public_notices(
    course: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    """Return active published campus notices with target_course filter."""
    query = db.query(models.Notice).filter(models.Notice.is_published == True)
    
    if course and course.strip() and course.strip() != "All Courses":
        clean_course = course.strip()
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.Notice.target_course == clean_course,
                models.Notice.target_course == "All Courses",
                models.Notice.target_course == "All",
                models.Notice.target_course.is_(None)
            )
        )

    notices = query.order_by(models.Notice.published_date.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "category": n.category,
            "target_course": n.target_course or "All Courses",
            "target_audience": n.target_audience,
            "is_published": n.is_published,
            "published_date": n.published_date,
            "posted_by": n.posted_by_alumni.name if n.posted_by_alumni else "Campus Administration",
            "posted_by_alumni_id": n.posted_by_alumni_id
        }
        for n in notices
    ]


# ── Public Jobs (no auth required) ───────────────────────────────────────────

@router.get("/jobs")
def get_public_jobs(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(database.get_db),
):
    """Return active published jobs for public display."""
    jobs = (
        db.query(models.Job)
        .filter(models.Job.is_active == True)
        .order_by(models.Job.posted_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "type": j.type,
            "location": j.location,
            "apply_link": j.apply_link,
            "experience": j.experience,
            "posted_date": j.posted_date,
            "description": j.description,
            "is_active": j.is_active,
            "posted_by": j.posted_by_alumni.name if j.posted_by_alumni else (j.posted_by or "Career Center"),
            "posted_by_alumni_id": j.posted_by_alumni_id
        }
        for j in jobs
    ]


# ── Public Alumni (no auth required) ─────────────────────────────────────────

@router.get("/alumni", response_model=List[schemas.AlumniPublicOut])
def get_public_alumni_alias(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db),
):
    """Return public safe alumni cards for landing page."""
    alumni_list = (
        db.query(models.Alumni)
        .filter(models.Alumni.status == "Active")
        .order_by(models.Alumni.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if alumni_list:
        return [
            schemas.AlumniPublicOut(
                id=a.id,
                name=a.name,
                course_completed=a.course_completed,
                year_of_admission=a.year_of_admission,
                year_of_completion=a.year_of_completion,
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
    
    # Fallback to Student table if no records in Alumni table yet
    student_alumni = (
        db.query(models.Student)
        .filter(models.Student.role == "Alumni", models.Student.status == "Active")
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for s in student_alumni:
        batch_end = s.batch.split("-")[-1].strip() if s.batch and "-" in s.batch else "2026"
        batch_start = s.batch.split("-")[0].strip() if s.batch and "-" in s.batch else "2024"
        comp_val = int(batch_end) if batch_end.isdigit() else 2026
        adm_val = int(batch_start) if batch_start.isdigit() else 2024
        result.append(
            schemas.AlumniPublicOut(
                id=s.id,
                name=s.name,
                course_completed=s.course if s.course in ["MCA", "MBA", "MTech"] else "MCA",
                year_of_admission=adm_val,
                year_of_completion=comp_val,
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


# ── Public Events (no auth required) ─────────────────────────────────────────

@router.get("/events")
def get_public_events(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    """Return events with dynamic status calculation (Completed, Ongoing, Upcoming)."""
    events = (
        db.query(models.Event)
        .filter(
            models.Event.audience != 'Alumni Only',
            models.Event.is_published == True,
            models.Event.is_active == True
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    from datetime import datetime, time as time_cls
    now = datetime.now()
    result = []
    
    for e in events:
        start_dt = e.start_datetime
        end_dt = e.end_datetime

        # Fallback to date & time if start_datetime/end_datetime not explicitly set
        if not start_dt and e.date:
            start_dt = datetime.combine(e.date, time_cls(hour=9, minute=0))
        if not end_dt and e.date:
            end_dt = datetime.combine(e.date, time_cls(hour=18, minute=0))

        # Dynamic Status Calculation Formula
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
            "type": e.type or "Event",
            "audience": e.audience or "All",
            "date": str(e.date) if e.date else (start_dt.strftime("%Y-%m-%d") if start_dt else "TBA"),
            "time": e.time or (f"{start_dt.strftime('%I:%M %p')} - {end_dt.strftime('%I:%M %p')}" if (start_dt and end_dt) else "TBA"),
            "location": e.location or "Main Campus Auditorium",
            "description": e.description or "",
            "image": e.image,
            "organizer": e.organizer or "Campus InfoHub Committee",
            "attendees": e.attendees or 0,
            "posted_by": e.posted_by_alumni.name if e.posted_by_alumni else "Campus InfoHub Committee",
            "posted_by_alumni_id": e.posted_by_alumni_id,
            "start_datetime": start_dt.isoformat() if start_dt else None,
            "end_datetime": end_dt.isoformat() if end_dt else None,
            "status": calc_status
        })

    # Sort events by start_datetime or date
    result.sort(key=lambda x: x["start_datetime"] or x["date"] or "", reverse=True)
    return result


# ── Public Mentors ────────────────────────────────────────────────────────────

@router.get("/mentors")
def get_public_mentors(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db),
):
    """Return active alumni mentors for public display (limited info)."""
    mentors = (
        db.query(models.Student)
        .filter(models.Student.role == 'Alumni', models.Student.status == 'Active')
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": m.id,
            "name": m.name,
            "department": m.course,
            "batch": m.batch,
            "bio": m.bio,
            "skills": m.skills,
            "avatar": m.avatar,
        }
        for m in mentors
    ]


# ── Public Settings ────────────────────────────────────────────────────────────

@router.get("/settings", response_model=schemas.SystemSettingsOut)
def get_public_settings(db: Session = Depends(database.get_db)):
    """Return system configuration settings accessible to non-authenticated users."""
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


