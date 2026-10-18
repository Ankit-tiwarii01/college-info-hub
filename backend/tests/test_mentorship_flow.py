"""End-to-end mentorship workflow and participant privacy tests."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

_test_db_path = Path(__file__).resolve().parents[1] / ".test-tmp" / f"mentorship-{uuid.uuid4().hex}.db"
_test_db_path.parent.mkdir(parents=True, exist_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///" + str(_test_db_path)
os.environ["SECRET_KEY"] = "isolated-mentorship-test-key"

from fastapi.testclient import TestClient
from app.main import app
from app import database, models, utils
from app.routers.ws import ConnectionManager

client = TestClient(app)
app.state.limiter.enabled = False


def auth(email, role):
    token = utils.create_access_token({"sub": email, "role": role})
    return {"Authorization": "Bearer " + token}, token


def setup_module():
    users = [
        models.Student(name="Student One", email="student1@test.com", password="x", role="Student", status="Active", email_verified=True, phone_verified=True),
        models.Student(name="Student Two", email="student2@test.com", password="x", role="Student", status="Active", email_verified=True, phone_verified=True),
        models.Student(name="Verified Mentor", email="mentor@test.com", password="x", role="Alumni", status="Active", email_verified=True, phone_verified=True),
        models.Student(name="Other Mentor", email="mentor2@test.com", password="x", role="Alumni", status="Active", email_verified=True, phone_verified=True),
        models.Student(name="Unverified Mentor", email="hidden@test.com", password="x", role="Alumni", status="Active", email_verified=False, phone_verified=False),
    ]
    with database.SessionLocal() as db:
        db.add_all(users)
        db.commit()


def teardown_module():
    database.engine.dispose()
    _test_db_path.unlink(missing_ok=True)


def test_complete_mentorship_workflow_and_privacy():
    student_headers, student_token = auth("student1@test.com", "student")
    other_student_headers, _ = auth("student2@test.com", "student")
    mentor_headers, mentor_token = auth("mentor@test.com", "alumni")
    other_mentor_headers, _ = auth("mentor2@test.com", "alumni")

    mentors = client.get("/mentorship/mentors", headers=student_headers)
    assert mentors.status_code == 200, mentors.text
    mentor_names = {item["name"] for item in mentors.json()}
    assert "Verified Mentor" in mentor_names
    assert "Unverified Mentor" not in mentor_names
    mentor_id = next(item["id"] for item in mentors.json() if item["name"] == "Verified Mentor")

    payload = {
        "mentor_id": mentor_id,
        "topic": "Backend career guidance",
        "message": "Please help me prepare for backend engineering interviews.",
        "preferred_datetime": (datetime.utcnow() + timedelta(days=2)).isoformat(),
    }
    response = client.post("/mentorship/request", json=payload, headers=student_headers)
    assert response.status_code == 201, response.text
    request_id = response.json()["id"]
    assert client.post("/mentorship/request", json=payload, headers=student_headers).status_code == 409
    assert client.get("/mentorship/requests/incoming", headers=student_headers).status_code == 403
    assert client.put(f"/mentorship/requests/{request_id}", json={"status": "Accepted"}, headers=student_headers).status_code == 403
    assert client.put(f"/mentorship/requests/{request_id}", json={"status": "Accepted"}, headers=other_mentor_headers).status_code == 403

    decision = client.put(
        f"/mentorship/requests/{request_id}",
        json={"status": "Accepted", "notes": "Happy to help."},
        headers=mentor_headers,
    )
    assert decision.status_code == 200, decision.text
    assert decision.json()["status"] == "Accepted"
    assert client.put(f"/mentorship/requests/{request_id}", json={"status": "Rejected"}, headers=mentor_headers).status_code == 409

    session_payload = {
        "request_id": request_id,
        "topic": "Backend interview preparation",
        "scheduled_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "duration_minutes": 45,
        "notes": "Bring your resume.",
    }
    invalid_duration = {**session_payload, "duration_minutes": None}
    invalid_topic = {**session_payload, "topic": "  "}
    assert client.post("/mentorship/sessions", json=invalid_duration, headers=mentor_headers).status_code == 422
    assert client.post("/mentorship/sessions", json=invalid_topic, headers=mentor_headers).status_code == 422
    assert client.post("/mentorship/sessions", json=session_payload, headers=student_headers).status_code == 403
    scheduled = client.post("/mentorship/sessions", json=session_payload, headers=mentor_headers)
    assert scheduled.status_code == 201, scheduled.text
    assert scheduled.json()["status"] == "Upcoming"
    session_id = scheduled.json()["id"]
    assert client.get(f"/mentorship/sessions/{session_id}/access", headers=student_headers).status_code == 403
    assert client.get(f"/mentorship/sessions/{request_id}", headers=other_student_headers).status_code == 403

    with database.SessionLocal() as db:
        session = db.query(models.MentorshipSession).filter_by(id=session_id).first()
        session.scheduled_at = datetime.utcnow()
        db.commit()

    assert client.get(f"/mentorship/sessions/{session_id}/access", headers=other_student_headers).status_code == 403
    assert client.get(f"/mentorship/sessions/{session_id}/access", headers=student_headers).status_code == 200
    assert client.get(f"/mentorship/sessions/{session_id}/access", headers=mentor_headers).status_code == 200

    with client.websocket_connect(f"/ws/meetings/{session_id}?token={student_token}") as student_ws:
        assert student_ws.receive_json()["type"] == "connected"
        with client.websocket_connect(f"/ws/meetings/{session_id}?token={mentor_token}") as mentor_ws:
            assert student_ws.receive_json()["type"] == "peer-ready"
            assert mentor_ws.receive_json()["peer_present"] is True
            mentor_ws.send_json({"type": "offer", "sdp": {"type": "offer", "sdp": "test"}})
            assert student_ws.receive_json()["type"] == "offer"

    with database.SessionLocal() as db:
        session = db.query(models.MentorshipSession).filter_by(id=session_id).first()
        assert session.status == "Completed"
        assert session.student_joined_at is not None
        assert session.mentor_joined_at is not None
        assert session.started_at is not None
        assert session.ended_at is not None

    ended = client.post(f"/mentorship/sessions/{session_id}/end", headers=student_headers)
    assert ended.status_code == 409, ended.text
    assert client.put(f"/mentorship/sessions/{session_id}", json={"status": "Scheduled"}, headers=mentor_headers).status_code == 409
    own_requests = client.get("/mentorship/requests", headers=student_headers).json()
    assert next(item for item in own_requests if item["id"] == request_id)["status"] == "Completed"
    assert client.get(f"/mentorship/sessions/{session_id}/access", headers=mentor_headers).status_code == 403

    student_notifications = client.get("/notifications/", headers=student_headers).json()
    mentor_notifications = client.get("/notifications/", headers=mentor_headers).json()
    assert any(item["entity_type"] == "mentorship_session" for item in student_notifications)
    assert any(item["entity_type"] == "mentorship_request" for item in mentor_notifications)
    unread = client.get("/notifications/unread-count", headers=mentor_headers)
    assert unread.status_code == 200, unread.text
    assert unread.json()["unread_count"] >= 1


def test_legacy_short_messages_do_not_break_alumni_inbox():
    with database.SessionLocal() as db:
        student = db.query(models.Student).filter_by(email="student2@test.com").first()
        mentor = db.query(models.Student).filter_by(email="mentor2@test.com").first()
        legacy = models.MentorshipRequest(
            student_id=student.id, mentor_id=mentor.id, topic="Legacy request",
            message="abc", status="Pending", expires_at=datetime.utcnow() + timedelta(days=1),
        )
        db.add(legacy)
        db.commit()
        legacy_id = legacy.id

    mentor_headers, _ = auth("mentor2@test.com", "alumni")
    response = client.get("/mentorship/requests/incoming", headers=mentor_headers)
    assert response.status_code == 200, response.text
    assert any(item["id"] == legacy_id and item["message"] == "abc" for item in response.json())


def test_expired_request_does_not_block_a_new_request_and_manual_completion_notifies():
    student_headers, _ = auth("student1@test.com", "student")
    mentor_headers, _ = auth("mentor@test.com", "alumni")
    with database.SessionLocal() as db:
        student = db.query(models.Student).filter_by(email="student1@test.com").first()
        mentor = db.query(models.Student).filter_by(email="mentor@test.com").first()
        expired = models.MentorshipRequest(
            student_id=student.id,
            mentor_id=mentor.id,
            topic="Expired request",
            message="This old request should no longer block a replacement.",
            status="Pending",
            expires_at=datetime.utcnow() - timedelta(minutes=1),
        )
        db.add(expired)
        db.commit()
        expired_id = expired.id
        mentor_id = mentor.id

    create = client.post(
        "/mentorship/request",
        json={
            "mentor_id": mentor_id,
            "topic": "Fresh guidance request",
            "message": "Please help me review a new career plan and next steps.",
            "preferred_datetime": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        },
        headers=student_headers,
    )
    assert create.status_code == 201, create.text
    request_id = create.json()["id"]
    with database.SessionLocal() as db:
        assert db.query(models.MentorshipRequest).filter_by(id=expired_id).first().status == "Rejected"

    accepted = client.put(
        f"/mentorship/requests/{request_id}",
        json={"status": "Accepted", "notes": "Let's meet."},
        headers=mentor_headers,
    )
    assert accepted.status_code == 200, accepted.text
    scheduled = client.post(
        "/mentorship/sessions",
        json={
            "request_id": request_id,
            "topic": "Career plan review",
            "scheduled_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "duration_minutes": 30,
        },
        headers=mentor_headers,
    )
    assert scheduled.status_code == 201, scheduled.text
    session_id = scheduled.json()["id"]
    with database.SessionLocal() as db:
        session = db.query(models.MentorshipSession).filter_by(id=session_id).first()
        session.status = "Ongoing"
        joined_at = datetime.utcnow()
        session.student_joined_at = joined_at
        session.mentor_joined_at = joined_at
        session.started_at = joined_at
        db.commit()

    completed = client.put(
        f"/mentorship/sessions/{session_id}",
        json={"status": "Completed", "notes": "Goals reviewed."},
        headers=mentor_headers,
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "Completed"
    notifications = client.get("/notifications/", headers=student_headers).json()
    assert any(item["entity_type"] == "mentorship_session" and item["entity_id"] == session_id for item in notifications)


def test_notification_manager_keeps_other_tabs_connected():
    class FakeSocket:
        def __init__(self):
            self.accepted = False
            self.messages = []

        async def accept(self):
            self.accepted = True

        async def send_text(self, payload):
            self.messages.append(payload)

    async def scenario():
        manager = ConnectionManager()
        first = FakeSocket()
        second = FakeSocket()
        await manager.connect(42, first)
        await manager.connect(42, second)
        manager.disconnect(42, first)
        await manager.push(42, {"type": "info", "text": "New request"})
        assert first.messages == []
        assert len(second.messages) == 1

    asyncio.run(scenario())


def test_meeting_tabs_auto_missed_counts_sorting_and_participant_details():
    student_headers, _ = auth("student2@test.com", "student")
    outsider_headers, _ = auth("student1@test.com", "student")
    now = datetime.utcnow()
    with database.SessionLocal() as db:
        student = db.query(models.Student).filter_by(email="student2@test.com").first()
        mentor = db.query(models.Student).filter_by(email="mentor2@test.com").first()
        request = models.MentorshipRequest(
            student_id=student.id,
            mentor_id=mentor.id,
            topic="Status lifecycle",
            message="Verify each persisted mentorship meeting lifecycle category.",
            status="Accepted",
        )
        db.add(request)
        db.flush()
        completed_start = now - timedelta(days=1)
        sessions = [
            models.MentorshipSession(
                request_id=request.id,
                topic="No show meeting",
                scheduled_at=now - timedelta(hours=3),
                duration_minutes=30,
                status="Upcoming",
            ),
            models.MentorshipSession(
                request_id=request.id,
                topic="Completed meeting",
                scheduled_at=completed_start,
                duration_minutes=30,
                status="Completed",
                student_joined_at=completed_start,
                mentor_joined_at=completed_start,
                started_at=completed_start,
                ended_at=completed_start + timedelta(minutes=25),
            ),
            models.MentorshipSession(
                request_id=request.id,
                topic="Future meeting",
                scheduled_at=now + timedelta(days=1),
                duration_minutes=30,
                status="Scheduled",  # legacy value is normalised on read
            ),
            models.MentorshipSession(
                request_id=request.id,
                topic="Attended meeting awaiting explicit end",
                scheduled_at=now - timedelta(hours=2),
                duration_minutes=30,
                status="Ongoing",
                student_joined_at=now - timedelta(hours=2),
                mentor_joined_at=now - timedelta(hours=2),
                started_at=now - timedelta(hours=2),
            ),
        ]
        db.add_all(sessions)
        db.commit()
        request_id = request.id
        ids = {session.topic: session.id for session in sessions}

    response = client.get("/mentorship/sessions", headers=student_headers)
    assert response.status_code == 200, response.text
    by_id = {item["id"]: item for item in response.json()}
    assert by_id[ids["No show meeting"]]["status"] == "Missed"
    assert by_id[ids["Future meeting"]]["status"] == "Upcoming"
    assert by_id[ids["Attended meeting awaiting explicit end"]]["status"] == "Ongoing"
    assert by_id[ids["Completed meeting"]]["actual_duration_minutes"] == 25
    assert by_id[ids["Future meeting"]]["student"]["name"] == "Student Two"
    assert by_id[ids["Future meeting"]]["mentor"]["name"] == "Other Mentor"

    upcoming = client.get("/mentorship/sessions?status=upcoming", headers=student_headers)
    assert upcoming.status_code == 200, upcoming.text
    assert [item["id"] for item in upcoming.json()] == [
        ids["Attended meeting awaiting explicit end"],
        ids["Future meeting"],
    ]
    assert all(item["status"] in {"Upcoming", "Ongoing"} for item in upcoming.json())
    assert [item["id"] for item in client.get(
        "/mentorship/sessions?status=completed", headers=student_headers
    ).json()] == [ids["Completed meeting"]]
    assert [item["id"] for item in client.get(
        "/mentorship/sessions?status=missed", headers=student_headers
    ).json()] == [ids["No show meeting"]]

    counts = client.get("/mentorship/sessions/counts", headers=student_headers)
    assert counts.status_code == 200, counts.text
    assert counts.json() == {"upcoming": 2, "completed": 1, "missed": 1}
    assert client.get(
        f"/mentorship/sessions/{request_id}", headers=outsider_headers
    ).status_code == 403

    with database.SessionLocal() as db:
        missed = db.query(models.MentorshipSession).filter_by(id=ids["No show meeting"]).first()
        request = db.query(models.MentorshipRequest).filter_by(id=request_id).first()
        assert missed.status == "Missed"
        assert request.status == "Accepted"  # an active session still exists


def test_completion_requires_concurrent_attendance_and_handles_multiple_sessions():
    student_headers, _ = auth("student2@test.com", "student")
    mentor_headers, _ = auth("mentor2@test.com", "alumni")
    now = datetime.utcnow()
    with database.SessionLocal() as db:
        student = db.query(models.Student).filter_by(email="student2@test.com").first()
        mentor = db.query(models.Student).filter_by(email="mentor2@test.com").first()
        request = models.MentorshipRequest(
            student_id=student.id,
            mentor_id=mentor.id,
            topic="Multiple meetings",
            message="Ensure one completed session does not close another active session.",
            status="Accepted",
        )
        db.add(request)
        db.flush()
        first = models.MentorshipSession(
            request_id=request.id,
            topic="First attended meeting",
            scheduled_at=now,
            duration_minutes=30,
            status="Ongoing",
            student_joined_at=now,
            mentor_joined_at=now,
            started_at=now,
        )
        second = models.MentorshipSession(
            request_id=request.id,
            topic="Second upcoming meeting",
            scheduled_at=now + timedelta(days=1),
            duration_minutes=30,
            status="Upcoming",
        )
        non_overlapping = models.MentorshipSession(
            request_id=request.id,
            topic="Non-overlapping attendance",
            scheduled_at=now,
            duration_minutes=30,
            status="Ongoing",
            student_joined_at=now,
            mentor_joined_at=now + timedelta(minutes=5),
            started_at=None,
        )
        db.add_all([first, second, non_overlapping])
        db.commit()
        request_id, first_id, second_id, non_overlapping_id = (
            request.id, first.id, second.id, non_overlapping.id
        )

    rejected = client.post(
        f"/mentorship/sessions/{non_overlapping_id}/end", headers=student_headers
    )
    assert rejected.status_code == 409
    assert "Both participants" in rejected.json()["detail"]

    completed_first = client.put(
        f"/mentorship/sessions/{first_id}",
        json={"status": "Completed"},
        headers=mentor_headers,
    )
    assert completed_first.status_code == 200, completed_first.text
    with database.SessionLocal() as db:
        request = db.query(models.MentorshipRequest).filter_by(id=request_id).first()
        assert request.status == "Accepted"
        second = db.query(models.MentorshipSession).filter_by(id=second_id).first()
        second.status = "Ongoing"
        second.scheduled_at = datetime.utcnow()
        second.student_joined_at = datetime.utcnow()
        second.mentor_joined_at = datetime.utcnow()
        second.started_at = datetime.utcnow()
        # The unrelated non-overlapping session is no longer active, so it
        # cannot keep the request open after the second successful meeting.
        non_overlapping = db.query(models.MentorshipSession).filter_by(id=non_overlapping_id).first()
        non_overlapping.status = "Cancelled"
        db.commit()

    completed_second = client.post(
        f"/mentorship/sessions/{second_id}/end", headers=student_headers
    )
    assert completed_second.status_code == 200, completed_second.text
    with database.SessionLocal() as db:
        request = db.query(models.MentorshipRequest).filter_by(id=request_id).first()
        assert request.status == "Completed"
