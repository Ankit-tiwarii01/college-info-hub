"""
WebSocket router — real-time notification delivery.
Each authenticated user connects once. When a server-side event
creates a Notification row, the same code path sends a live push.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from .. import models, database
from ..notification_service import notify_user
from .users import get_current_user_from_token
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

# ── Connection Manager ───────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # A user may have the app open in multiple tabs or devices.
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, connection_key: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(connection_key, set()).add(ws)
        logger.info("Notification WS connected subject=%s", connection_key)

    def disconnect(self, connection_key: str, ws: WebSocket):
        sockets = self.active.get(connection_key)
        if sockets:
            sockets.discard(ws)
            if not sockets:
                self.active.pop(connection_key, None)
        logger.info("Notification WS disconnected subject=%s", connection_key)

    async def push(self, connection_key: str, payload: dict):
        """Send a JSON payload to a specific user if they are online."""
        for ws in list(self.active.get(connection_key, set())):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                self.disconnect(connection_key, ws)


manager = ConnectionManager()


class MeetingRoomManager:
    """In-memory WebRTC signalling rooms; media stays peer-to-peer."""
    def __init__(self):
        self.rooms: dict[int, dict[int, WebSocket]] = {}

    async def connect(self, session_id: int, user_id: int, websocket: WebSocket):
        room = self.rooms.setdefault(session_id, {})
        previous = room.get(user_id)
        if previous:
            await previous.close(code=4002)
        await websocket.accept()
        room[user_id] = websocket
        return len(room) > 1

    async def relay(self, session_id: int, sender_id: int, payload: dict):
        for user_id, websocket in list(self.rooms.get(session_id, {}).items()):
            if user_id != sender_id:
                await websocket.send_json(payload)

    async def disconnect(self, session_id: int, user_id: int):
        room = self.rooms.get(session_id, {})
        room.pop(user_id, None)
        if room:
            await self.relay(session_id, user_id, {"type": "peer-left"})
            return False
        else:
            self.rooms.pop(session_id, None)
            return True


meeting_manager = MeetingRoomManager()


def _record_meeting_join(session_id: int, user_id: int, participant_role: str, peer_present: bool):
    """Persist attendance only after the authenticated signalling socket connects."""
    db: Session = database.SessionLocal()
    try:
        session = db.query(models.MentorshipSession).filter(
            models.MentorshipSession.id == session_id
        ).first()
        if not session or session.status in {"Completed", "Missed", "Cancelled"}:
            return
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if session.status == "Scheduled":
            session.status = "Upcoming"
        if participant_role == "mentor" and session.request.mentor_id == user_id:
            session.mentor_joined_at = session.mentor_joined_at or now
        elif participant_role == "student" and session.request.student_id == user_id:
            session.student_joined_at = session.student_joined_at or now
        else:
            return

        # Ongoing means both authenticated participants reached the real-time
        # meeting, not merely that somebody opened the access URL.
        if peer_present and session.student_joined_at and session.mentor_joined_at:
            session.started_at = session.started_at or now
            session.status = "Ongoing"
            if session.request.status == "Completed":
                # Repair the legacy multi-session state where one completed
                # meeting incorrectly closed a request with another active one.
                session.request.status = "Accepted"
        db.commit()
    finally:
        db.close()


def _complete_finished_meeting(session_id: int):
    """Complete an attended meeting when the last connected participant leaves."""
    db: Session = database.SessionLocal()
    try:
        session = db.query(models.MentorshipSession).filter(
            models.MentorshipSession.id == session_id
        ).first()
        if (
            not session
            or str(session.status).lower() != "ongoing"
            or not session.started_at
            or not session.student_joined_at
            or not session.mentor_joined_at
        ):
            return

        session.status = "Completed"
        session.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
        request = session.request
        statuses = {str(item.status or "").strip().lower() for item in request.sessions}
        request.status = "Accepted" if statuses.intersection({"scheduled", "upcoming", "ongoing"}) else "Completed"
        text = f"Your mentorship meeting '{session.topic}' has ended successfully."
        notify_user(
            db, request.student_id, text, "success",
            f"mentorship-session-auto-ended:{session.id}:student",
            "/student/mentorship?tab=meetings&meetingStatus=completed",
            "mentorship_session", session.id,
        )
        notify_user(
            db, request.mentor_id, text, "success",
            f"mentorship-session-auto-ended:{session.id}:mentor",
            "/alumni/mentorship?tab=meetings&meetingStatus=completed",
            "mentorship_session", session.id,
        )
        db.commit()
    finally:
        db.close()


# ── Helper used by other routers ─────────────────────────────────────────────

async def notify_user_live(user_id: int, text: str, notif_type: str = "info", db: Session = None):
    """Create a DB notification record AND push a live WS event."""
    if db:
        notif = models.Notification(user_id=user_id, text=text, type=notif_type)
        db.add(notif)
        db.commit()
        db.refresh(notif)
        payload = {
            "id": notif.id,
            "text": notif.text,
            "type": notif.type,
            "read": notif.read,
        }
    else:
        payload = {"text": text, "type": notif_type}
    await manager.push(f"user:{user_id}", payload)


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    """
    Client connects with: ws://127.0.0.1:8001/ws/notifications?token=<jwt>
    """
    # --- Auth via query param ---
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    # Resolve user from token manually (no Depends on WS)
    from ..utils import SECRET_KEY, ALGORITHM
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role", "")
    except Exception:
        await websocket.close(code=4001)
        return

    db: Session = database.SessionLocal()
    try:
        if role == "admin":
            user = db.query(models.Admin).filter(models.Admin.email == email).first()
        else:
            user = db.query(models.Student).filter(models.Student.email == email).first()
    finally:
        db.close()

    if not user or (isinstance(user, models.Student) and user.status != "Active"):
        await websocket.close(code=4001)
        return

    subject_role = "admin" if isinstance(user, models.Admin) else "user"
    connection_key = f"{subject_role}:{user.id}"
    await manager.connect(connection_key, websocket)
    last_notification_id = 0
    initial_db: Session = database.SessionLocal()
    try:
        initial_query = initial_db.query(models.Notification)
        if isinstance(user, models.Admin):
            initial_query = initial_query.filter(models.Notification.admin_id == user.id)
        else:
            initial_query = initial_query.filter(models.Notification.user_id == user.id)
        newest = initial_query.order_by(models.Notification.id.desc()).first()
        last_notification_id = newest.id if newest else 0
    finally:
        initial_db.close()

    try:
        # Poll the persisted notification stream on a short interval. This
        # works from synchronous FastAPI routes as well as async routes and
        # keeps WebSocket delivery reliable for administrator registrations.
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
            except asyncio.TimeoutError:
                poll_db: Session = database.SessionLocal()
                try:
                    query = poll_db.query(models.Notification).filter(
                        models.Notification.id > last_notification_id
                    )
                    if isinstance(user, models.Admin):
                        query = query.filter(models.Notification.admin_id == user.id)
                    else:
                        query = query.filter(models.Notification.user_id == user.id)
                    newest = query.order_by(models.Notification.id.desc()).first()
                    if newest:
                        last_notification_id = newest.id
                        await websocket.send_json({
                            "id": newest.id,
                            "text": newest.text,
                            "type": newest.type or "info",
                            "read": bool(newest.read),
                            "action_url": newest.action_url,
                        })
                finally:
                    poll_db.close()
    except (WebSocketDisconnect, RuntimeError):
        manager.disconnect(connection_key, websocket)


@router.websocket("/ws/meetings/{session_id}")
async def meeting_signalling_endpoint(websocket: WebSocket, session_id: int):
    """Authenticated, two-participant WebRTC signalling for one scheduled session."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    from ..utils import SECRET_KEY, ALGORITHM
    try:
        from jose import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role", "")
    except Exception:
        await websocket.close(code=4001)
        return

    db: Session = database.SessionLocal()
    try:
        user = db.query(models.Student).filter(models.Student.email == email).first()
        session = db.query(models.MentorshipSession).filter(models.MentorshipSession.id == session_id).first()
        if session and session.status == "Scheduled":
            session.status = "Upcoming"
            db.commit()
        if (
            role not in {"student", "alumni"} or not user or user.status != "Active" or not session
            or user.id not in {session.request.student_id, session.request.mentor_id}
            or session.request.status not in {"Accepted", "Completed"}
            or session.status in {"Completed", "Missed", "Cancelled"}
        ):
            await websocket.close(code=4003)
            return
        early = int(os.getenv("MEETING_EARLY_JOIN_MINUTES", "15"))
        late = int(os.getenv("MEETING_LATE_GRACE_MINUTES", "30"))
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        duration_minutes = session.duration_minutes or 60
        if now < session.scheduled_at - timedelta(minutes=early) or now > session.scheduled_at + timedelta(minutes=duration_minutes + late):
            if (
                now > session.scheduled_at + timedelta(minutes=duration_minutes + late)
                and not session.started_at
            ):
                session.status = "Missed"
                session.ended_at = now
                db.commit()
            await websocket.close(code=4004)
            return
        user_id = user.id
        participant_role = "mentor" if user.id == session.request.mentor_id else "student"
    finally:
        db.close()

    peer_present = await meeting_manager.connect(session_id, user_id, websocket)
    _record_meeting_join(session_id, user_id, participant_role, peer_present)
    await meeting_manager.relay(session_id, user_id, {"type": "peer-ready", "role": participant_role})
    await websocket.send_json({"type": "connected", "role": participant_role, "peer_present": peer_present})
    allowed_types = {"ready", "offer", "answer", "ice-candidate", "media-state", "leave"}
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") not in allowed_types:
                continue
            data["sender_role"] = participant_role
            await meeting_manager.relay(session_id, user_id, data)
            if data.get("type") == "leave":
                break
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        room_empty = await meeting_manager.disconnect(session_id, user_id)
        if room_empty:
            _complete_finished_meeting(session_id)
