"""Isolated profile-photo, social-link, and deadline-aware job tests."""
import base64
import os
import uuid
from datetime import timedelta
from pathlib import Path

TEST_DB = Path(__file__).resolve().parents[1] / ".test-tmp" / f"profile-jobs-{uuid.uuid4().hex}.db"
TEST_DB.parent.mkdir(parents=True, exist_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///" + str(TEST_DB)
os.environ["SECRET_KEY"] = "profile-jobs-test-key"
os.environ["APP_TIMEZONE"] = "Asia/Kolkata"

from fastapi.testclient import TestClient

from app import database, models, utils
from app.job_deadlines import application_today
from app.main import app


client = TestClient(app)
app.state.limiter.enabled = False


def auth(email: str, role: str):
    return {"Authorization": "Bearer " + utils.create_access_token({"sub": email, "role": role})}


STUDENT_HEADERS = auth("student@example.com", "student")
ALUMNI_HEADERS = auth("alumni@example.com", "alumni")
ADMIN_HEADERS = auth("admin@example.com", "admin")


def setup_module():
    with database.SessionLocal() as db:
        student = models.Student(name="Student", email="student@example.com", password="x", role="Student", status="Active", email_verified=True, verification_status="approved")
        alumni = models.Student(name="Alumni", email="alumni@example.com", password="x", role="Alumni", status="Active", email_verified=True, verification_status="approved")
        db.add_all([student, alumni, models.Admin(name="Admin", email="admin@example.com", password="x")])
        db.flush()
        db.add_all([models.StudentProfile(student_id=student.id), models.StudentProfile(student_id=alumni.id)])
        db.commit()


def teardown_module():
    database.engine.dispose()
    TEST_DB.unlink(missing_ok=True)


def test_social_links_validate_and_persist():
    response = client.put("/users/me", headers=STUDENT_HEADERS, json={
        "linkedin": "https://linkedin.com/in/student",
        "github": "https://github.com/student",
        "portfolio": "https://student.example.com",
    })
    assert response.status_code == 200, response.text
    assert response.json()["github"] == "https://github.com/student"
    refreshed = client.get("/users/me", headers=STUDENT_HEADERS)
    assert refreshed.json()["linkedin"] == "https://linkedin.com/in/student"
    unsafe = client.put("/users/me", headers=STUDENT_HEADERS, json={"portfolio": "javascript:alert(1)"})
    assert unsafe.status_code == 422


def test_profile_photo_upload_is_public_and_removable():
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
    uploaded = client.put(
        "/users/me/profile-photo",
        headers=STUDENT_HEADERS,
        files={"profile_photo": ("avatar.png", png, "image/png")},
    )
    assert uploaded.status_code == 200, uploaded.text
    avatar = uploaded.json()["avatar"]
    assert avatar.startswith("/uploads/profile_photos/")
    assert client.get(avatar).status_code == 200
    removed = client.delete("/users/me/profile-photo", headers=STUDENT_HEADERS)
    assert removed.status_code == 200 and removed.json()["avatar"] is None
    assert client.get(avatar).status_code == 404


def test_jobs_require_deadline_and_follow_moderation_and_expiry():
    base = {
        "title": "Backend Engineer",
        "company": "Example Co",
        "type": "Full-time",
        "location": "Delhi",
        "description": "Build reliable APIs",
        "salary": "8-10 LPA",
        "required_skills": "Python, FastAPI",
        "eligibility": "Final-year students and recent graduates",
    }
    missing = client.post("/jobs/", headers=ALUMNI_HEADERS, json=base)
    assert missing.status_code == 422
    past = client.post("/jobs/", headers=ALUMNI_HEADERS, json={**base, "application_deadline": str(application_today() - timedelta(days=1))})
    assert past.status_code == 422

    future = application_today() + timedelta(days=5)
    created = client.post("/jobs/", headers=ALUMNI_HEADERS, json={**base, "application_deadline": str(future)})
    assert created.status_code == 200, created.text
    job_id = created.json()["id"]
    assert created.json()["approval_status"] == "Pending"
    assert job_id in [job["id"] for job in client.get("/jobs/my/posts", headers=ALUMNI_HEADERS).json()]
    assert job_id not in [job["id"] for job in client.get("/jobs/?category=active", headers=STUDENT_HEADERS).json()]

    approved = client.post(f"/admin/jobs/{job_id}/approve", headers=ADMIN_HEADERS)
    assert approved.status_code == 200, approved.text
    active = client.get("/jobs/?category=active", headers=STUDENT_HEADERS).json()
    published = next(job for job in active if job["id"] == job_id)
    assert published["is_expired"] is False and published["days_remaining"] == 5

    updated = client.put(f"/jobs/{job_id}", headers=ALUMNI_HEADERS, json={"application_deadline": str(future + timedelta(days=2))})
    assert updated.status_code == 200, updated.text
    assert updated.json()["approval_status"] == "Pending"
    assert job_id not in [job["id"] for job in client.get("/jobs/?category=active", headers=STUDENT_HEADERS).json()]
    assert client.post(f"/admin/jobs/{job_id}/approve", headers=ADMIN_HEADERS).status_code == 200

    with database.SessionLocal() as db:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        job.application_deadline = application_today() - timedelta(days=1)
        db.commit()
    assert job_id not in [job["id"] for job in client.get("/jobs/?category=active", headers=STUDENT_HEADERS).json()]
    assert job_id in [job["id"] for job in client.get("/jobs/?category=expired", headers=STUDENT_HEADERS).json()]
    application = client.post(f"/jobs/{job_id}/apply", headers=STUDENT_HEADERS, json={})
    assert application.status_code == 410
