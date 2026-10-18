import logging
import sys
import time
import json
from pythonjsonlogger import jsonlogger
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .limiter import limiter

from fastapi.staticfiles import StaticFiles
import os as _os

from . import models, database
from .routers import auth, users, posts, events, jobs, mentorship, notifications, admin, ws, reports, mail, public, alumni

# --- Structured Logging Setup ---
class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            now = time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime())
            log_record['timestamp'] = f"{now}Z"
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname

logger = logging.getLogger()
logHandler = logging.StreamHandler(sys.stdout)
formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

# Create all tables (normally use Alembic for migrations, but this is simpler for initial setup)
models.Base.metadata.create_all(bind=database.engine)

from sqlalchemy import text
try:
    with database.engine.connect() as conn:
        for col_def in [
            "target_identifier VARCHAR(255)",
            "image_url TEXT",
            "action_taken TEXT"
        ]:
            try:
                conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_def}"))
                conn.commit()
            except Exception:
                pass
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN email_verified BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        for statement in [
            "ALTER TABLE students ADD COLUMN phone_verified BOOLEAN DEFAULT 0",
            "ALTER TABLE students ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE students ADD COLUMN date_of_birth DATE",
            "ALTER TABLE students ADD COLUMN gender VARCHAR(30)",
            "ALTER TABLE students ADD COLUMN address TEXT",
            "ALTER TABLE students ADD COLUMN city VARCHAR(100)",
            "ALTER TABLE students ADD COLUMN state VARCHAR(100)",
            "ALTER TABLE students ADD COLUMN country VARCHAR(100) DEFAULT 'India'",
            "ALTER TABLE students ADD COLUMN college_name VARCHAR(255)",
            "ALTER TABLE students ADD COLUMN university_name VARCHAR(255)",
            "ALTER TABLE students ADD COLUMN branch VARCHAR(150)",
            "ALTER TABLE students ADD COLUMN current_semester VARCHAR(50)",
            "ALTER TABLE students ADD COLUMN admission_year INTEGER",
            "ALTER TABLE students ADD COLUMN expected_graduation_year INTEGER",
            "ALTER TABLE students ADD COLUMN university_roll_no VARCHAR(100)",
            "ALTER TABLE students ADD COLUMN identity_document_path TEXT",
            "ALTER TABLE students ADD COLUMN identity_document_name VARCHAR(255)",
            "ALTER TABLE students ADD COLUMN identity_document_mime VARCHAR(100)",
            "ALTER TABLE students ADD COLUMN identity_document_kind VARCHAR(50)",
            "ALTER TABLE students ADD COLUMN terms_accepted BOOLEAN DEFAULT 0",
            "ALTER TABLE students ADD COLUMN document_consent_at DATETIME",
            "ALTER TABLE students ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE students ADD COLUMN reviewed_at DATETIME",
            "ALTER TABLE students ADD COLUMN reviewed_by INTEGER",
            "ALTER TABLE students ADD COLUMN resubmitted_at DATETIME",
            "ALTER TABLE alumni ADD COLUMN email_verified BOOLEAN DEFAULT 0",
            "ALTER TABLE alumni ADD COLUMN phone_verified BOOLEAN DEFAULT 0",
            "ALTER TABLE alumni ADD COLUMN academic_proof_path TEXT",
            "ALTER TABLE alumni ADD COLUMN academic_proof_name VARCHAR(255)",
            "ALTER TABLE alumni ADD COLUMN academic_proof_mime VARCHAR(100)",
            "ALTER TABLE alumni ADD COLUMN branch VARCHAR(150)",
            "ALTER TABLE alumni ADD COLUMN employment_status VARCHAR(100)",
            "ALTER TABLE alumni ADD COLUMN industry VARCHAR(150)",
            "ALTER TABLE alumni ADD COLUMN total_experience VARCHAR(50)",
            "ALTER TABLE alumni ADD COLUMN work_location VARCHAR(150)",
            "ALTER TABLE alumni ADD COLUMN technical_skills TEXT",
            "ALTER TABLE alumni ADD COLUMN professional_bio TEXT",
            "ALTER TABLE alumni ADD COLUMN areas_of_expertise TEXT",
            "ALTER TABLE alumni ADD COLUMN mentorship_interested BOOLEAN DEFAULT 0",
            "ALTER TABLE alumni ADD COLUMN mentorship_topics TEXT",
            "ALTER TABLE alumni ADD COLUMN mentorship_mode VARCHAR(50)",
            "ALTER TABLE alumni ADD COLUMN mentorship_availability VARCHAR(255)",
            "ALTER TABLE alumni ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE alumni ADD COLUMN reviewed_at DATETIME",
            "ALTER TABLE alumni ADD COLUMN reviewed_by INTEGER",
            "ALTER TABLE posts ADD COLUMN approval_status VARCHAR(20) DEFAULT 'Pending'",
            "ALTER TABLE posts ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE posts ADD COLUMN admin_id INTEGER",
            "ALTER TABLE comments ADD COLUMN admin_id INTEGER",
            "ALTER TABLE post_likes ADD COLUMN admin_id INTEGER",
            "ALTER TABLE jobs ADD COLUMN posted_by_user_id INTEGER",
            "ALTER TABLE jobs ADD COLUMN approval_status VARCHAR(20) DEFAULT 'Approved'",
            "ALTER TABLE jobs ADD COLUMN approved_at DATETIME",
            "ALTER TABLE jobs ADD COLUMN approved_by VARCHAR(100)",
            "ALTER TABLE jobs ADD COLUMN rejection_reason TEXT",
            "ALTER TABLE jobs ADD COLUMN salary VARCHAR(150)",
            "ALTER TABLE jobs ADD COLUMN required_skills TEXT",
            "ALTER TABLE jobs ADD COLUMN eligibility TEXT",
            "ALTER TABLE jobs ADD COLUMN application_deadline DATE",
            "ALTER TABLE student_profile ADD COLUMN linkedin VARCHAR(500)",
            "ALTER TABLE student_profile ADD COLUMN github VARCHAR(500)",
            "ALTER TABLE student_profile ADD COLUMN instagram VARCHAR(500)",
            "ALTER TABLE student_profile ADD COLUMN facebook VARCHAR(500)",
            "ALTER TABLE student_profile ADD COLUMN x_twitter VARCHAR(500)",
            "ALTER TABLE student_profile ADD COLUMN portfolio VARCHAR(500)",
            "ALTER TABLE alumni ADD COLUMN github VARCHAR(500)",
            "ALTER TABLE alumni ADD COLUMN portfolio VARCHAR(500)",
            "ALTER TABLE notifications ADD COLUMN admin_id INTEGER",
            "ALTER TABLE notifications ADD COLUMN recipient_role VARCHAR(20)",
            "ALTER TABLE notifications ADD COLUMN action_url VARCHAR(255)",
            "ALTER TABLE notifications ADD COLUMN entity_type VARCHAR(50)",
            "ALTER TABLE notifications ADD COLUMN entity_id INTEGER",
            "ALTER TABLE notifications ADD COLUMN event_key VARCHAR(255)",
            "ALTER TABLE otps ADD COLUMN otp_hash VARCHAR(64)",
            "ALTER TABLE otps ADD COLUMN channel VARCHAR(20) DEFAULT 'email'",
            "ALTER TABLE otps ADD COLUMN sent_count INTEGER DEFAULT 1",
            "ALTER TABLE otps ADD COLUMN last_sent_at DATETIME",
            "ALTER TABLE mentorship_requests ADD COLUMN topic VARCHAR(255) DEFAULT 'General mentorship'",
            "ALTER TABLE mentorship_requests ADD COLUMN preferred_datetime DATETIME",
            "ALTER TABLE mentorship_sessions ADD COLUMN meeting_code VARCHAR(100)",
            "ALTER TABLE mentorship_sessions ADD COLUMN started_at DATETIME",
            "ALTER TABLE mentorship_sessions ADD COLUMN student_joined_at DATETIME",
            "ALTER TABLE mentorship_sessions ADD COLUMN mentor_joined_at DATETIME",
            "ALTER TABLE mentorship_sessions ADD COLUMN ended_at DATETIME",
            "ALTER TABLE account_verification_history ADD COLUMN email_delivery_status VARCHAR(20)",
            "ALTER TABLE account_verification_history ADD COLUMN email_delivery_error TEXT",
            "ALTER TABLE account_verification_history ADD COLUMN email_delivered_at DATETIME",
            "ALTER TABLE account_verification_history ADD COLUMN email_attempts INTEGER DEFAULT 0",
        ]:
            try:
                conn.execute(text(statement))
                conn.commit()
            except Exception:
                pass
        # Existing active users and content are grandfathered in; only new
        # registrations/submissions enter the verification queues.
        for statement in [
            "UPDATE students SET email_verified = 1, phone_verified = 1 WHERE status = 'Active'",
            "UPDATE students SET verification_status = CASE WHEN status = 'Active' THEN 'approved' WHEN status = 'Rejected' THEN 'rejected' WHEN status = 'Blocked' THEN 'suspended' ELSE 'pending' END WHERE verification_status IS NULL OR verification_status = ''",
            "UPDATE alumni SET email_verified = 1, phone_verified = 1 WHERE status = 'Active'",
            "UPDATE posts SET approval_status = CASE WHEN is_approved = 1 THEN 'Approved' ELSE 'Pending' END WHERE approval_status IS NULL OR approval_status = ''",
            "UPDATE jobs SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''",
            "UPDATE otps SET channel = 'email' WHERE channel IS NULL OR channel = ''",
            "UPDATE mentorship_requests SET topic = 'General mentorship' WHERE topic IS NULL OR topic = ''",
            "UPDATE mentorship_sessions SET duration_minutes = 60 WHERE duration_minutes IS NULL",
            "UPDATE mentorship_sessions SET status = 'Upcoming' WHERE status = 'Scheduled' OR status IS NULL OR status = ''",
            "CREATE INDEX IF NOT EXISTS ix_mentorship_sessions_status_scheduled ON mentorship_sessions (status, scheduled_at)",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_mentorship_pending_pair ON mentorship_requests (student_id, mentor_id) WHERE status = 'Pending'",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_post_admin_like_idx ON post_likes (post_id, admin_id) WHERE admin_id IS NOT NULL",
            "UPDATE posts SET admin_id = (SELECT id FROM admin WHERE admin.name = posts.approved_by LIMIT 1) WHERE user_id IS NULL AND admin_id IS NULL AND approved_by IS NOT NULL",
            "UPDATE posts SET admin_id = (SELECT id FROM admin ORDER BY id LIMIT 1) WHERE user_id IS NULL AND admin_id IS NULL AND (SELECT COUNT(*) FROM admin) = 1",
            "UPDATE comments SET admin_id = (SELECT id FROM admin ORDER BY id LIMIT 1) WHERE user_id IS NULL AND admin_id IS NULL AND (SELECT COUNT(*) FROM admin) = 1",
            "UPDATE account_verification_history SET email_attempts = 0 WHERE email_attempts IS NULL",
            "UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id)",
            "CREATE INDEX IF NOT EXISTS ix_jobs_application_deadline ON jobs (application_deadline)",
            "UPDATE student_profile SET avatar = (SELECT professional_picture FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id))) WHERE (avatar IS NULL OR avatar = '') AND EXISTS (SELECT 1 FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id)) AND professional_picture IS NOT NULL)",
            "UPDATE student_profile SET linkedin = (SELECT linkedin FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id))) WHERE (linkedin IS NULL OR linkedin = '')",
            "UPDATE student_profile SET instagram = (SELECT instagram FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id))) WHERE (instagram IS NULL OR instagram = '')",
            "UPDATE student_profile SET facebook = (SELECT facebook FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id))) WHERE (facebook IS NULL OR facebook = '')",
            "UPDATE student_profile SET x_twitter = (SELECT x_twitter FROM alumni WHERE lower(alumni.email) = lower((SELECT email FROM students WHERE students.id = student_profile.student_id))) WHERE (x_twitter IS NULL OR x_twitter = '')",
        ]:
            try:
                conn.execute(text(statement))
                conn.commit()
            except Exception:
                pass
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN section VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN experience VARCHAR(100) DEFAULT '0-2 Years'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE notices ADD COLUMN target_course VARCHAR(50) DEFAULT 'All Courses'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE events ADD COLUMN organizer VARCHAR(255) DEFAULT 'Campus InfoHub Committee'"))
            conn.commit()
        except Exception:
            pass
        for dt_col in ["start_datetime DATETIME", "end_datetime DATETIME", "posted_by VARCHAR(100) DEFAULT 'Campus InfoHub Committee'", "is_published BOOLEAN DEFAULT 1", "is_active BOOLEAN DEFAULT 1"]:
            try:
                conn.execute(text(f"ALTER TABLE events ADD COLUMN {dt_col}"))
                conn.commit()
            except Exception:
                pass
        for tbl in ["notices", "events", "jobs"]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN posted_by_alumni_id INTEGER"))
                conn.commit()
            except Exception:
                pass
except Exception as e:
    logger.warning(f"Database migration check completed: {e}")

app = FastAPI(
    title="College Info Hub API",
    description="Refined Premium Backend for College Information and Networking",
    version="2.0.0",
    debug=False # Production ready
)

# --- Mount Static Files for Uploads ---
uploads_dir = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "uploads")
_os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Rate Limiter Configuration
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middleware: Request Logging ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    log_dict = {
        "url": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "process_time_ms": f"{process_time:.2f}ms"
    }
    logger.info("Request processed", extra=log_dict)
    return response

# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception: {str(exc)}", 
        extra={"url": request.url.path, "method": request.method, "error": str(exc)},
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Our team has been notified."}
    )

# --- CORS Middleware ---
_raw_origins = _os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
origin_regex = _os.getenv("ALLOWED_ORIGIN_REGEX")
if not origin_regex and _os.getenv("APP_ENV", "development").lower() != "production":
    # Local development can be opened through localhost or a private LAN IP.
    origin_regex = r"^https?://(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Inclusions ---
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, tags=["Users"])
app.include_router(posts.router, tags=["Posts"])
app.include_router(events.router, tags=["Events"])
app.include_router(jobs.router, tags=["Jobs"])
app.include_router(mentorship.router, tags=["Mentorship"])
app.include_router(notifications.router, tags=["Notifications"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(ws.router, tags=["WebSocket"])
app.include_router(reports.router, tags=["Reports"])
app.include_router(mail.router, tags=["Internal Mail"])
app.include_router(public.router, tags=["Public"])
app.include_router(alumni.router, tags=["Alumni Directory"])

@app.get("/", tags=["Health"])
def read_root():
    return {
        "status": "online",
        "message": "Welcome to College Info Hub API",
        "version": "2.0.0",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Lightweight health probe for load balancers and uptime monitors."""
    return {"status": "healthy", "version": "2.0.3"}



