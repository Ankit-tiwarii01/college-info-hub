from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Boolean, Enum, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Admin(Base):
    __tablename__ = "admin"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(15))
    created_at = Column(DateTime, server_default=func.now())

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(15))
    role = Column(Enum('Student', 'Alumni'), default='Student')
    # Updated status enum to match frontend: Active, Blocked, Pending
    status = Column(String(20), default='Pending')
    created_at = Column(DateTime, server_default=func.now())
    reg_no = Column(String(50))
    course = Column(String(100))
    batch = Column(String(50))
    session = Column(String(50))
    section = Column(String(50), nullable=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    verification_status = Column(String(20), default="pending", index=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    college_name = Column(String(255), nullable=True)
    university_name = Column(String(255), nullable=True)
    branch = Column(String(150), nullable=True)
    current_semester = Column(String(50), nullable=True)
    admission_year = Column(Integer, nullable=True)
    expected_graduation_year = Column(Integer, nullable=True)
    university_roll_no = Column(String(100), nullable=True, index=True)
    identity_document_path = Column(Text, nullable=True)
    identity_document_name = Column(String(255), nullable=True)
    identity_document_mime = Column(String(100), nullable=True)
    identity_document_kind = Column(String(50), nullable=True)
    terms_accepted = Column(Boolean, default=False)
    document_consent_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("admin.id"), nullable=True)
    resubmitted_at = Column(DateTime, nullable=True)

    academic = relationship("StudentAcademic", back_populates="student", uselist=False)
    experience = relationship("StudentExperience", back_populates="student")
    profile = relationship("StudentProfile", back_populates="student", uselist=False)
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    mentorship_requests_sent = relationship("MentorshipRequest", foreign_keys="[MentorshipRequest.student_id]", back_populates="student", cascade="all, delete-orphan")
    mentorship_requests_received = relationship("MentorshipRequest", foreign_keys="[MentorshipRequest.mentor_id]", back_populates="mentor", cascade="all, delete-orphan")

    # Added for cascade delete
    reports = relationship("Report", back_populates="reporter", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="student", cascade="all, delete-orphan")
    event_attendance = relationship("EventAttendee", back_populates="student", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="user", cascade="all, delete-orphan")

    @property
    def bio(self):
        return self.profile.bio if self.profile and self.profile.bio else "Experienced Alumni Mentor."

    @property
    def skills(self):
        return self.profile.skills if self.profile else ""

    @property
    def location(self):
        return self.profile.location if self.profile else "Campus"

    @property
    def avatar(self):
        return self.profile.avatar if self.profile else None

    @property
    def linkedin(self):
        return self.profile.linkedin if self.profile else None

    @property
    def github(self):
        return self.profile.github if self.profile else None

    @property
    def instagram(self):
        return self.profile.instagram if self.profile else None

    @property
    def facebook(self):
        return self.profile.facebook if self.profile else None

    @property
    def x_twitter(self):
        return self.profile.x_twitter if self.profile else None

    @property
    def portfolio(self):
        return self.profile.portfolio if self.profile else None

    @property
    def expertise(self):
        if self.experience:
            first_exp = self.experience[0]
            return f"{first_exp.role} at {first_exp.company_name}"
        return "Career & Industry Mentorship"

    @property
    def company(self):
        if self.profile and self.profile.current_company:
            return self.profile.current_company
        if self.experience:
            return self.experience[0].company_name
        return "Tech Solutions Inc."

    @property
    def current_company(self):
        if self.profile and self.profile.current_company:
            return self.profile.current_company
        if self.experience:
            return self.experience[0].company_name
        return "Tech Solutions Inc."

    @property
    def designation(self):
        if self.profile and self.profile.designation:
            return self.profile.designation
        if self.experience:
            return self.experience[0].role
        return "Senior Engineer"

    @property
    def previous_company(self):
        if self.profile and self.profile.previous_company:
            return self.profile.previous_company
        if len(self.experience) > 1:
            return ", ".join([e.company_name for e in self.experience[1:]])
        return ""


class StudentAcademic(Base):
    __tablename__ = "student_academic"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    enrollment_no = Column(String(50))
    degree = Column(String(50))
    specialization = Column(String(100))
    department = Column(String(100))
    year = Column(Enum('1st', '2nd'))
    batch = Column(String(20))

    student = relationship("Student", back_populates="academic")

class StudentExperience(Base):
    __tablename__ = "student_experience"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    company_name = Column(String(150))
    role = Column(String(100))
    experience_type = Column(Enum('Internship', 'Job', 'Freelance'))
    start_date = Column(Date)
    end_date = Column(Date)
    description = Column(Text)

    student = relationship("Student", back_populates="experience")

class StudentProfile(Base):
    __tablename__ = "student_profile"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    skills = Column(Text)
    bio = Column(Text)
    achievements = Column(Text)
    location = Column(String(100))
    avatar = Column(Text)
    current_company = Column(String(150), nullable=True)
    designation = Column(String(100), nullable=True)
    previous_company = Column(Text, nullable=True)
    linkedin = Column(String(500), nullable=True)
    github = Column(String(500), nullable=True)
    instagram = Column(String(500), nullable=True)
    facebook = Column(String(500), nullable=True)
    x_twitter = Column(String(500), nullable=True)
    portfolio = Column(String(500), nullable=True)

    student = relationship("Student", back_populates="profile")

class Notice(Base):
    __tablename__ = "notices"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), default="General")
    target_audience = Column(String(100), default="All")
    target_course = Column(String(50), default="All Courses")
    is_published = Column(Boolean, default=True)
    published_date = Column(DateTime, server_default=func.now())
    posted_by_alumni_id = Column(Integer, ForeignKey("alumni.id"), nullable=True)

    posted_by_alumni = relationship("Alumni")

class Alumni(Base):
    __tablename__ = "alumni"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    enrollment_number = Column(String(100), unique=True, index=True, nullable=False)
    mobile_number = Column(String(50), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    course_completed = Column(String(100), nullable=False)
    year_of_admission = Column(Integer, nullable=False)
    year_of_completion = Column(Integer, nullable=False)
    university_institute = Column(String(255), nullable=False)
    other_institution = Column(String(255), nullable=True)
    profession = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    organization = Column(String(255), nullable=False)
    previous_company = Column(Text, nullable=True)
    current_city = Column(String(100), nullable=False)
    current_state = Column(String(100), nullable=False)
    current_country = Column(String(100), nullable=False, default="India")
    professional_picture = Column(Text, nullable=True)
    linkedin = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)
    instagram = Column(String(255), nullable=True)
    x_twitter = Column(String(255), nullable=True)
    github = Column(String(500), nullable=True)
    portfolio = Column(String(500), nullable=True)
    youtube = Column(String(255), nullable=True)
    willing_to_attend_events = Column(String(10), nullable=False, default="Yes")
    contributions = Column(Text, nullable=False)
    other_contribution_specify = Column(Text, nullable=True)
    status = Column(String(50), default="Active")
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    academic_proof_path = Column(Text, nullable=True)
    academic_proof_name = Column(String(255), nullable=True)
    academic_proof_mime = Column(String(100), nullable=True)
    branch = Column(String(150), nullable=True)
    employment_status = Column(String(100), nullable=True)
    industry = Column(String(150), nullable=True)
    total_experience = Column(String(50), nullable=True)
    work_location = Column(String(150), nullable=True)
    technical_skills = Column(Text, nullable=True)
    professional_bio = Column(Text, nullable=True)
    areas_of_expertise = Column(Text, nullable=True)
    mentorship_interested = Column(Boolean, default=False)
    mentorship_topics = Column(Text, nullable=True)
    mentorship_mode = Column(String(50), nullable=True)
    mentorship_availability = Column(String(255), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("admin.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("students.id"), index=True)
    admin_id = Column(Integer, ForeignKey("admin.id"), nullable=True, index=True)
    content = Column(Text)
    image = Column(Text)
    type = Column(String(50), default='general')
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    # Moderation
    is_approved = Column(Boolean, default=False)  # Posts are hidden until admin approves
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)  # Admin name snapshot
    approval_status = Column(String(20), default="Pending")
    rejection_reason = Column(Text, nullable=True)

    user = relationship("Student", back_populates="posts")
    admin = relationship("Admin", foreign_keys=[admin_id])
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")

    @property
    def liked_by(self):
        # Legacy compatibility for student/alumni clients. Administrator likes
        # are represented in liked_by_keys so table IDs can never collide.
        return [like.user_id for like in self.likes if like.user_id is not None]

    @property
    def liked_by_keys(self):
        return [like.actor_key for like in self.likes]

    @property
    def author(self):
        actor = self.admin if self.admin_id is not None else self.user
        if actor is None:
            return None
        return {
            "id": actor.id,
            "name": actor.name,
            "role": "Admin" if self.admin_id is not None else str(actor.role),
            "avatar": None if self.admin_id is not None else actor.avatar,
        }

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("students.id"))
    admin_id = Column(Integer, ForeignKey("admin.id"), nullable=True, index=True)
    text = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="comments")
    user = relationship("Student", back_populates="comments")
    admin = relationship("Admin", foreign_keys=[admin_id])

    @property
    def author(self):
        actor = self.admin if self.admin_id is not None else self.user
        if actor is None:
            return None
        return {
            "id": actor.id,
            "name": actor.name,
            "role": "Admin" if self.admin_id is not None else str(actor.role),
            "avatar": None if self.admin_id is not None else actor.avatar,
        }

class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like"),
        UniqueConstraint("post_id", "admin_id", name="uq_post_admin_like"),
    )
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), index=True)
    user_id = Column(Integer, ForeignKey("students.id"), index=True)
    admin_id = Column(Integer, ForeignKey("admin.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("Student", back_populates="likes")
    admin = relationship("Admin", foreign_keys=[admin_id])
    post = relationship("Post", back_populates="likes")

    @property
    def actor_key(self):
        return f"admin:{self.admin_id}" if self.admin_id is not None else f"user:{self.user_id}"

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    type = Column(String(50))
    audience = Column(String(50))
    date = Column(Date)
    time = Column(String(50))
    location = Column(String(255))
    description = Column(Text)
    image = Column(Text)
    organizer = Column(String(255), nullable=True, default="Campus InfoHub Committee")
    posted_by = Column(String(100), nullable=True, default="Campus InfoHub Committee")
    is_published = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    attendees = Column(Integer, default=0) # Total count cache/denormalized
    start_datetime = Column(DateTime, nullable=True)
    end_datetime = Column(DateTime, nullable=True)
    posted_by_alumni_id = Column(Integer, ForeignKey("alumni.id"), nullable=True)

    posted_by_alumni = relationship("Alumni")
    attendees_relation = relationship("EventAttendee", back_populates="event")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    type = Column(String(50))
    location = Column(String(255))
    apply_link = Column(String(255))
    experience = Column(String(100), nullable=True, default="0-2 Years")
    salary = Column(String(150), nullable=True)
    required_skills = Column(Text, nullable=True)
    eligibility = Column(Text, nullable=True)
    application_deadline = Column(Date, nullable=True, index=True)
    posted_date = Column(DateTime, server_default=func.now())
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    posted_by = Column(String(50)) # Snapshot of user name who posted it
    posted_by_alumni_id = Column(Integer, ForeignKey("alumni.id"), nullable=True)
    posted_by_user_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)
    approval_status = Column(String(20), default="Approved")
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    posted_by_alumni = relationship("Alumni")
    applications = relationship("JobApplication", back_populates="job")

    @property
    def is_expired(self):
        from .job_deadlines import deadline_has_passed
        return deadline_has_passed(self.application_deadline)

    @property
    def days_remaining(self):
        from .job_deadlines import remaining_days
        return remaining_days(self.application_deadline)

class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    mentor_id = Column(Integer, ForeignKey("students.id"))
    topic = Column(String(255), default="General mentorship")
    message = Column(Text)
    preferred_datetime = Column(DateTime, nullable=True)
    status = Column(String(50), default='Pending')  # Pending, Accepted, Rejected, Completed
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # Auto-expire after a set period
    mentor_note = Column(Text, nullable=True)  # Mentor's response note on accept/reject

    student = relationship("Student", foreign_keys=[student_id], back_populates="mentorship_requests_sent")
    mentor = relationship("Student", foreign_keys=[mentor_id], back_populates="mentorship_requests_received")
    sessions = relationship("MentorshipSession", back_populates="request", cascade="all, delete-orphan")

class MentorshipSession(Base):
    """Tracks individual meetings/sessions between a mentor and mentee."""
    __tablename__ = "mentorship_sessions"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("mentorship_requests.id", ondelete="CASCADE"))
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    topic = Column(String(255))
    notes = Column(Text, nullable=True)  # Post-session notes from mentor
    # Canonical lifecycle values are Upcoming, Ongoing, Completed, Missed and
    # Cancelled.  Older databases used "Scheduled"; the startup migration and
    # API normalisation keep those rows backwards compatible.
    status = Column(String(50), default='Upcoming', index=True)
    meeting_code = Column(String(100), nullable=True, unique=True)
    started_at = Column(DateTime, nullable=True)
    student_joined_at = Column(DateTime, nullable=True)
    mentor_joined_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    request = relationship("MentorshipRequest", back_populates="sessions")

    @property
    def student(self):
        """Expose the participant without duplicating participant ids."""
        return self.request.student if self.request else None

    @property
    def mentor(self):
        """Expose the mentor for participant-safe session responses."""
        return self.request.mentor if self.request else None

    @property
    def actual_duration_minutes(self):
        if not self.started_at or not self.ended_at:
            return None
        return max(0, round((self.ended_at - self.started_at).total_seconds() / 60))

# New Tables found in mockData but missing in SQL
class JobApplication(Base):
    __tablename__ = "job_applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    status = Column(String(50), default='Applied')  # Applied, Shortlisted, Interviewing, Hired, Rejected
    applied_date = Column(DateTime, server_default=func.now())
    cover_letter = Column(Text, nullable=True)
    resume_url = Column(String(500), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    job = relationship("Job", back_populates="applications")
    student = relationship("Student", back_populates="job_applications")
    status_history = relationship("JobApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")

class JobApplicationStatusHistory(Base):
    __tablename__ = "job_application_status_history"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"))
    old_status = Column(String(50))
    new_status = Column(String(50))
    changed_at = Column(DateTime, server_default=func.now())
    note = Column(Text, nullable=True)

    application = relationship("JobApplication", back_populates="status_history")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin.id"), nullable=True, index=True)
    recipient_role = Column(String(20), nullable=True, index=True)
    text = Column(Text)
    read = Column(Boolean, default=False)
    type = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    action_url = Column(String(255), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    event_key = Column(String(255), nullable=True, unique=True, index=True)

    user = relationship("Student", back_populates="notifications")

class EventAttendee(Base):
    __tablename__ = "event_attendees"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    status = Column(String(50), default='going') # going, interested, not_going
    created_at = Column(DateTime, server_default=func.now())

    event = relationship("Event", back_populates="attendees_relation")
    student = relationship("Student", back_populates="event_attendance")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("students.id"))
    target_id = Column(Integer, nullable=True) # ID of post, comment, or user
    target_identifier = Column(String(255), nullable=True) # Reg No, Email, Post ID or ID string
    target_type = Column(String(50), default='User') # 'User', 'Post', 'Job', 'Other'
    reason = Column(String(100))
    description = Column(Text)
    image_url = Column(Text, nullable=True) # Optional supporting image URL/path
    status = Column(String(50), default='Pending') # Pending, Resolved, Dismissed
    action_taken = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    reporter = relationship("Student", back_populates="reports")


class InternalMessage(Base):
    """Internal campus mail between users."""
    __tablename__ = "internal_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_starred = Column(Boolean, default=False)
    sender_deleted = Column(Boolean, default=False)
    recipient_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    sender = relationship("Student", foreign_keys=[sender_id])
    recipient = relationship("Student", foreign_keys=[recipient_id])


class SystemSettings(Base):
    """Singleton table for admin-configurable system settings."""
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, default=1)
    site_name = Column(String(255), default="College Community Hub")
    support_email = Column(String(255), default="support@collegehub.com")
    maintenance_mode = Column(Boolean, default=False)
    allow_registration = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=False)
    theme = Column(String(50), default="light")
    primary_color = Column(String(50), default="amber")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OTP(Base):
    """Reusable table for 6-digit email OTPs (registration verification, password resets, etc.)."""
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp = Column(String(6), nullable=False)
    otp_hash = Column(String(64), nullable=True)
    channel = Column(String(20), nullable=False, default="email")
    purpose = Column(String(50), nullable=False, default="EMAIL_VERIFICATION")  # EMAIL_VERIFICATION, PASSWORD_RESET
    attempts = Column(Integer, default=0)
    sent_count = Column(Integer, default=1)
    last_sent_at = Column(DateTime, server_default=func.now())
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# Backward-compatibility aliases
PasswordResetOTP = OTP
RegistrationOTP = OTP


class AccountVerificationHistory(Base):
    __tablename__ = "account_verification_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id = Column(Integer, ForeignKey("admin.id"), nullable=True, index=True)
    decision = Column(String(20), nullable=False)
    reason = Column(Text, nullable=True)
    email_delivery_status = Column(String(20), nullable=True)
    email_delivery_error = Column(Text, nullable=True)
    email_delivered_at = Column(DateTime, nullable=True)
    email_attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


