import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..dependencies import get_current_user_from_token
from ..notification_service import notify_user
from .ws import notify_user_live

router = APIRouter(prefix="/mentorship", tags=["Mentorship"])

STATUS_ALIASES = {
    "scheduled": "Upcoming",
    "upcoming": "Upcoming",
    "ongoing": "Ongoing",
    "completed": "Completed",
    "missed": "Missed",
    "cancelled": "Cancelled",
    "canceled": "Cancelled",
}
ACTIVE_SESSION_STATUSES = {"Upcoming", "Ongoing"}
TERMINAL_SESSION_STATUSES = {"Completed", "Missed", "Cancelled"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def canonical_session_status(value: Optional[str]) -> str:
    """Return the canonical status while accepting legacy database values."""
    return STATUS_ALIASES.get(str(value or "").strip().lower(), "Upcoming")


def _role(user: models.Student) -> str:
    return str(getattr(user, "role", "")).lower()


def _require_participant_user(user):
    if not isinstance(user, models.Student) or _role(user) not in {"student", "alumni"}:
        raise HTTPException(status_code=403, detail="Only students and alumni can access mentorship meetings")


def _require_student(user: models.Student):
    if _role(user) != "student":
        raise HTTPException(status_code=403, detail="Only students can send mentorship requests.")


def _require_alumni(user: models.Student):
    if _role(user) != "alumni":
        raise HTTPException(status_code=403, detail="Only verified alumni mentors can perform this action.")


def _get_participant_session(db: Session, session_id: int, user: models.Student):
    _require_participant_user(user)
    session = db.query(models.MentorshipSession).filter(models.MentorshipSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Mentorship session not found")
    if user.id not in {session.request.student_id, session.request.mentor_id}:
        raise HTTPException(status_code=403, detail="Only meeting participants can access this session")
    return session


def meeting_window(session: models.MentorshipSession):
    early = int(os.getenv("MEETING_EARLY_JOIN_MINUTES", "15"))
    late = int(os.getenv("MEETING_LATE_GRACE_MINUTES", "30"))
    duration_minutes = session.duration_minutes or 60
    start = session.scheduled_at - timedelta(minutes=early)
    end = session.scheduled_at + timedelta(minutes=duration_minutes + late)
    return start, end


def _status_category(session: models.MentorshipSession) -> str:
    status = canonical_session_status(session.status)
    if status in ACTIVE_SESSION_STATUSES:
        return "upcoming"
    if status == "Completed":
        return "completed"
    return "missed"


def _sort_sessions(sessions, category: Optional[str] = None):
    """Apply the ordering used by the three My Meetings tabs."""
    if category == "upcoming":
        return sorted(sessions, key=lambda item: (item.scheduled_at, item.id))
    if category == "completed":
        return sorted(
            sessions,
            key=lambda item: (item.ended_at or item.scheduled_at, item.id),
            reverse=True,
        )
    if category == "missed":
        return sorted(sessions, key=lambda item: (item.scheduled_at, item.id), reverse=True)

    upcoming = _sort_sessions([s for s in sessions if _status_category(s) == "upcoming"], "upcoming")
    completed = _sort_sessions([s for s in sessions if _status_category(s) == "completed"], "completed")
    missed = _sort_sessions([s for s in sessions if _status_category(s) == "missed"], "missed")
    return upcoming + completed + missed


def refresh_session_statuses(db: Session, sessions=None) -> bool:
    """
    Persist lifecycle changes before session data is returned.

    A meeting becomes Missed only after its complete join window has elapsed
    and at least one participant never joined.  Time passing alone never marks
    an attended meeting Completed; completion requires an explicit end action.
    """
    if sessions is None:
        sessions = db.query(models.MentorshipSession).filter(
            models.MentorshipSession.status.in_(["Scheduled", "Upcoming", "Ongoing"])
        ).all()
    else:
        sessions = list(sessions)

    now = utc_now()
    changed = False
    affected_requests = set()
    for session in sessions:
        if session.request:
            affected_requests.add(session.request)
        canonical = canonical_session_status(session.status)
        if session.status != canonical:
            session.status = canonical
            changed = True

        if canonical not in ACTIVE_SESSION_STATUSES:
            continue
        _, join_until = meeting_window(session)
        meeting_started = bool(
            session.started_at and session.student_joined_at and session.mentor_joined_at
        )
        if now <= join_until or meeting_started:
            continue

        session.status = "Missed"
        # ended_at records when the persisted lifecycle transition occurred;
        # scheduled_at remains the date used for missed-history ordering.
        session.ended_at = now
        changed = True
        request = session.request
        text = f"Mentorship meeting '{session.topic}' was missed because one or both participants did not join."
        notify_user(
            db, request.student_id, text, "warning",
            f"mentorship-session-missed:{session.id}:student",
            "/student/mentorship", "mentorship_session", session.id,
        )
        notify_user(
            db, request.mentor_id, text, "warning",
            f"mentorship-session-missed:{session.id}:mentor",
            "/alumni/mentorship", "mentorship_session", session.id,
        )

    for request in affected_requests:
        changed = _sync_request_status(request) or changed

    if changed:
        db.commit()
    return changed


def _sync_request_status(request: models.MentorshipRequest) -> bool:
    """A request completes only after its last active meeting successfully completes."""
    if request.status not in {"Accepted", "Completed"}:
        return False
    previous = request.status
    statuses = [canonical_session_status(session.status) for session in request.sessions]
    has_active = any(status in ACTIVE_SESSION_STATUSES for status in statuses)
    has_completed = "Completed" in statuses
    if has_active:
        request.status = "Accepted"
    elif has_completed:
        request.status = "Completed"
    else:
        # All meetings being missed/cancelled is not a successful mentorship.
        request.status = "Accepted"
    return request.status != previous


def validate_meeting_time(session: models.MentorshipSession):
    if session.request.status != "Accepted":
        raise HTTPException(status_code=403, detail="The mentorship request is not active")
    session.status = canonical_session_status(session.status)
    if session.status in TERMINAL_SESSION_STATUSES:
        raise HTTPException(status_code=403, detail=f"This meeting is {session.status.lower()}")
    now = utc_now()
    start, end = meeting_window(session)
    if now < start:
        raise HTTPException(status_code=403, detail=f"Meeting opens at {start.isoformat()}Z")
    if now > end:
        raise HTTPException(status_code=403, detail="The meeting access window has ended")
    return start, end


def _expire_old_requests(db: Session):
    expired = db.query(models.MentorshipRequest).filter(
        models.MentorshipRequest.status == "Pending",
        models.MentorshipRequest.expires_at.is_not(None),
        models.MentorshipRequest.expires_at < utc_now(),
    ).all()
    for request in expired:
        request.status = "Rejected"
        request.mentor_note = "Automatically rejected because it was not reviewed within seven days."
    if expired:
        db.commit()


@router.get("/mentors", response_model=List[schemas.User])
def read_mentors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_student(current_user)
    return db.query(models.Student).filter(
        models.Student.role == "Alumni",
        models.Student.status == "Active",
        models.Student.email_verified.is_(True),
        models.Student.phone_verified.is_(True),
    ).offset(skip).limit(min(limit, 100)).all()


@router.get("/mentors/{mentor_id}", response_model=schemas.User)
def read_mentor(
    mentor_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_student(current_user)
    mentor = db.query(models.Student).filter(
        models.Student.id == mentor_id,
        models.Student.role == "Alumni",
        models.Student.status == "Active",
        models.Student.email_verified.is_(True),
        models.Student.phone_verified.is_(True),
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Verified mentor not found")
    return mentor


@router.post("/request", response_model=schemas.MentorshipRequest, status_code=201)
async def create_mentorship_request(
    payload: schemas.MentorshipRequestCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_student(current_user)
    _expire_old_requests(db)
    mentor = db.query(models.Student).filter(
        models.Student.id == payload.mentor_id,
        models.Student.role == "Alumni",
        models.Student.status == "Active",
        models.Student.email_verified.is_(True),
        models.Student.phone_verified.is_(True),
    ).with_for_update().first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Verified mentor not found")
    preferred_datetime = as_utc_naive(payload.preferred_datetime)
    if preferred_datetime and preferred_datetime <= utc_now():
        raise HTTPException(status_code=400, detail="Preferred meeting time must be in the future")
    duplicate = db.query(models.MentorshipRequest).filter(
        models.MentorshipRequest.student_id == current_user.id,
        models.MentorshipRequest.mentor_id == mentor.id,
        models.MentorshipRequest.status == "Pending",
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A pending request already exists for this mentor")

    request_data = payload.model_dump()
    request_data["preferred_datetime"] = preferred_datetime
    request = models.MentorshipRequest(
        **request_data, student_id=current_user.id,
        expires_at=utc_now() + timedelta(days=7),
    )
    db.add(request)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A pending request already exists for this mentor")
    text = f"New mentorship request from {current_user.name}: {request.topic}."
    notify_user(db, mentor.id, text, "info", f"mentorship-request:{request.id}",
                "/alumni/mentorship", "mentorship_request", request.id)
    db.commit()
    db.refresh(request)
    await notify_user_live(mentor.id, text, "info")
    return request


@router.get("/requests/incoming", response_model=List[schemas.MentorshipRequest])
def read_incoming_requests(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_alumni(current_user)
    _expire_old_requests(db)
    return db.query(models.MentorshipRequest).filter(
        models.MentorshipRequest.mentor_id == current_user.id
    ).order_by(models.MentorshipRequest.created_at.desc()).all()


@router.get("/requests", response_model=List[schemas.MentorshipRequest])
def read_my_requests(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_student(current_user)
    _expire_old_requests(db)
    return db.query(models.MentorshipRequest).filter(
        models.MentorshipRequest.student_id == current_user.id
    ).order_by(models.MentorshipRequest.created_at.desc()).all()


@router.put("/requests/{request_id}", response_model=schemas.MentorshipRequest)
async def decide_request(
    request_id: int,
    decision: schemas.MentorshipDecision,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_alumni(current_user)
    request = db.query(models.MentorshipRequest).filter(models.MentorshipRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mentorship request not found")
    if request.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot review another mentor's request")
    if request.status != "Pending":
        raise HTTPException(status_code=409, detail="This request has already been reviewed")

    request.status = decision.status
    request.mentor_note = decision.notes.strip() if decision.notes else None
    action = decision.status.lower()
    text = f"{current_user.name} {action} your mentorship request for {request.topic}."
    notify_user(db, request.student_id, text,
                "success" if decision.status == "Accepted" else "warning",
                f"mentorship-decision:{request.id}:{decision.status}",
                "/student/mentorship", "mentorship_request", request.id)
    db.commit()
    db.refresh(request)
    await notify_user_live(request.student_id, text, "success" if decision.status == "Accepted" else "warning")
    return request


@router.get("/sessions", response_model=List[schemas.MentorshipSession])
def list_my_sessions(
    request_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_participant_user(current_user)
    query = db.query(models.MentorshipSession).join(models.MentorshipRequest).filter(
        or_(models.MentorshipRequest.student_id == current_user.id,
            models.MentorshipRequest.mentor_id == current_user.id)
    )
    if request_id is not None:
        query = query.filter(models.MentorshipSession.request_id == request_id)
    sessions = query.all()
    refresh_session_statuses(db, sessions)

    category = None
    if status and status.lower() != "all":
        category_aliases = {
            "upcoming": "upcoming", "scheduled": "upcoming", "ongoing": "upcoming",
            "completed": "completed", "missed": "missed",
            "cancelled": "missed", "canceled": "missed",
        }
        category = category_aliases.get(status.strip().lower())
        if not category:
            raise HTTPException(status_code=400, detail="Status must be upcoming, completed, or missed")
        sessions = [item for item in sessions if _status_category(item) == category]
    return _sort_sessions(sessions, category)


@router.get("/sessions/counts", response_model=schemas.MentorshipSessionCounts)
def session_status_counts(
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_participant_user(current_user)
    sessions = db.query(models.MentorshipSession).join(models.MentorshipRequest).filter(
        or_(models.MentorshipRequest.student_id == current_user.id,
            models.MentorshipRequest.mentor_id == current_user.id)
    ).all()
    refresh_session_statuses(db, sessions)
    counts = {"upcoming": 0, "completed": 0, "missed": 0}
    for session in sessions:
        counts[_status_category(session)] += 1
    return counts


@router.post("/sessions", response_model=schemas.MentorshipSession, status_code=201)
async def create_session(
    payload: schemas.MentorshipSessionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_alumni(current_user)
    request = db.query(models.MentorshipRequest).filter(models.MentorshipRequest.id == payload.request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mentorship request not found")
    if request.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned mentor can schedule this meeting")
    if request.status != "Accepted":
        raise HTTPException(status_code=400, detail="Accept the request before scheduling a meeting")
    scheduled_at = as_utc_naive(payload.scheduled_at)
    if scheduled_at <= utc_now():
        raise HTTPException(status_code=400, detail="Meeting time must be in the future")
    if not 15 <= (payload.duration_minutes or 60) <= 180:
        raise HTTPException(status_code=400, detail="Duration must be between 15 and 180 minutes")

    session_data = payload.model_dump()
    session_data["scheduled_at"] = scheduled_at
    session_data.pop("status", None)
    session = models.MentorshipSession(
        **session_data,
        status="Upcoming",
        meeting_code=secrets.token_urlsafe(24),
    )
    db.add(session)
    db.flush()
    text = f"{current_user.name} scheduled '{session.topic}' for {session.scheduled_at.strftime('%d %b %Y, %I:%M %p')}."
    notify_user(db, request.student_id, text, "success", f"mentorship-session:{session.id}",
                "/student/mentorship", "mentorship_session", session.id)
    db.commit()
    db.refresh(session)
    await notify_user_live(request.student_id, text, "success")
    return session


@router.get("/sessions/{request_id:int}", response_model=List[schemas.MentorshipSession])
def get_request_sessions(
    request_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_participant_user(current_user)
    request = db.query(models.MentorshipRequest).filter(models.MentorshipRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mentorship request not found")
    if current_user.id not in {request.mentor_id, request.student_id}:
        raise HTTPException(status_code=403, detail="You are not a participant in this mentorship")
    sessions = db.query(models.MentorshipSession).filter(
        models.MentorshipSession.request_id == request_id
    ).all()
    refresh_session_statuses(db, sessions)
    return _sort_sessions(sessions)


@router.get("/sessions/{session_id:int}/access", response_model=schemas.MeetingAccess)
def get_meeting_access(
    session_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    session = _get_participant_session(db, session_id, current_user)
    refresh_session_statuses(db, [session])
    db.refresh(session)
    start, end = validate_meeting_time(session)
    is_mentor = current_user.id == session.request.mentor_id
    peer = session.request.student if is_mentor else session.request.mentor
    return schemas.MeetingAccess(
        session_id=session.id, request_id=session.request_id,
        participant_role="mentor" if is_mentor else "student",
        peer_name=peer.name, topic=session.topic, scheduled_at=session.scheduled_at,
        duration_minutes=session.duration_minutes or 60, status=session.status,
        join_from=start, join_until=end,
    )


@router.post("/sessions/{session_id:int}/end", response_model=schemas.MentorshipSession)
async def end_session(
    session_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    session = _get_participant_session(db, session_id, current_user)
    refresh_session_statuses(db, [session])
    db.refresh(session)
    if session.status == "Cancelled":
        raise HTTPException(status_code=409, detail="Cancelled meetings cannot be completed")
    if session.status == "Missed":
        raise HTTPException(status_code=409, detail="Missed meetings cannot be completed")
    if session.status == "Completed":
        raise HTTPException(status_code=409, detail="This meeting is already completed")
    if session.status != "Ongoing":
        raise HTTPException(status_code=409, detail="Only an ongoing meeting can be ended")
    if not session.started_at or not session.student_joined_at or not session.mentor_joined_at:
        raise HTTPException(status_code=409, detail="Both participants must join before a meeting can be completed")
    session.status = "Completed"
    session.ended_at = utc_now()
    request = session.request
    _sync_request_status(request)
    peer_id = request.student_id if current_user.id == request.mentor_id else request.mentor_id
    text = f"Your mentorship meeting '{session.topic}' has ended."
    notify_user(db, peer_id, text, "info", f"mentorship-session-ended:{session.id}",
                "/student/mentorship" if peer_id == request.student_id else "/alumni/mentorship",
                "mentorship_session", session.id)
    db.commit()
    db.refresh(session)
    await notify_user_live(peer_id, text, "info")
    return session


@router.put("/sessions/{session_id:int}", response_model=schemas.MentorshipSession)
async def update_session(
    session_id: int,
    update: schemas.MentorshipSessionUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Student = Depends(get_current_user_from_token),
):
    _require_alumni(current_user)
    session = _get_participant_session(db, session_id, current_user)
    if session.request.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the mentor can update this meeting")
    notification = None
    peer_id = None
    refresh_session_statuses(db, [session])
    db.refresh(session)
    requested_status = None
    if update.status:
        requested_status = STATUS_ALIASES.get(update.status.strip().lower())
        if not requested_status:
            raise HTTPException(status_code=400, detail="Invalid meeting status")
    if requested_status and requested_status != session.status:
        if requested_status not in {"Upcoming", "Completed", "Cancelled"}:
            raise HTTPException(status_code=400, detail="Invalid meeting status")
        allowed_transitions = {
            "Upcoming": {"Cancelled"},
            "Ongoing": {"Completed", "Cancelled"},
            "Completed": set(),
            "Missed": set(),
            "Cancelled": set(),
        }
        if requested_status not in allowed_transitions.get(session.status, set()):
            raise HTTPException(
                status_code=409,
                detail=f"Meeting cannot change from {session.status} to {requested_status}",
            )
        if requested_status == "Completed" and (
            not session.started_at or not session.student_joined_at or not session.mentor_joined_at
        ):
            raise HTTPException(status_code=409, detail="Both participants must join before a meeting can be completed")
        session.status = requested_status
        peer_id = session.request.student_id
        action_url = "/student/mentorship"
        if requested_status == "Completed":
            session.ended_at = utc_now()
            _sync_request_status(session.request)
            notification = f"Your mentorship meeting '{session.topic}' has been completed."
        elif requested_status == "Cancelled":
            session.ended_at = utc_now()
            _sync_request_status(session.request)
            notification = f"Your mentorship meeting '{session.topic}' was cancelled by {current_user.name}."
        notify_user(
            db, peer_id, notification,
            "info" if requested_status == "Completed" else "warning",
            f"mentorship-session-status:{session.id}:{requested_status}",
            action_url, "mentorship_session", session.id,
        )
    if update.notes is not None:
        session.notes = update.notes.strip()
    db.commit()
    db.refresh(session)
    if notification and peer_id:
        await notify_user_live(
            peer_id,
            notification,
            "info" if session.status == "Completed" else "warning",
        )
    return session
