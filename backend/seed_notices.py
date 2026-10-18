import sys
import os
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def seed_notices():
    db = SessionLocal()

    print("==================================================")
    print(" SEEDING REALISTIC CAMPUS NOTICES DATASET        ")
    print("==================================================")

    # 1. Clean up old dummy notices if any exist
    dummy_notices = db.query(models.Notice).filter(
        (models.Notice.title.like("%Test Notice%")) | 
        (models.Notice.title.like("%Lorem%")) |
        (models.Notice.title.like("%Notice 1%")) |
        (models.Notice.title.like("%Dummy%"))
    ).all()

    for d in dummy_notices:
        db.delete(d)
    db.commit()
    print(f"[CLEANUP] Removed {len(dummy_notices)} dummy notice records.")

    # 2. Define 8 Realistic Campus Notice Records
    realistic_notices = [
        {
            "title": "Semester Examination Schedule Released",
            "category": "Examination",
            "target_audience": "All Students",
            "content": "The official schedule for the upcoming End-Semester Examinations for MCA, MBA, and MTech programs has been published. All students are advised to download the date sheet from the portal and check their exam slots.",
            "is_published": True,
            "published_date": datetime(2026, 8, 12, 10, 30)
        },
        {
            "title": "Campus Placement Drive – Software Developer & Analyst Roles",
            "category": "Placement",
            "target_audience": "Final Year Students",
            "content": "Top tech partners including Google, Microsoft, and Flipkart will be conducting campus placement drives next week for MCA and MTech final-year students. Ensure your resume and portfolio profiles are updated.",
            "is_published": True,
            "published_date": datetime(2026, 8, 11, 14, 15)
        },
        {
            "title": "Annual Alumni Interaction & Mentorship Session",
            "category": "Alumni",
            "target_audience": "Students & Alumni",
            "content": "Join us for an interactive virtual session with distinguished alumni working across global tech and management leadership. Get insights on career growth, interview preparation, and industry trends.",
            "is_published": True,
            "published_date": datetime(2026, 8, 10, 11, 0)
        },
        {
            "title": "Central Library Extended Timings for Exam Season",
            "category": "General",
            "target_audience": "All Students",
            "content": "To facilitate student preparation for upcoming mid-term and semester examinations, the Central Campus Library will remain open until 11:00 PM on all working days and weekends.",
            "is_published": True,
            "published_date": datetime(2026, 8, 8, 9, 45)
        },
        {
            "title": "Independence Day Celebration & Cultural Fest",
            "category": "Event",
            "target_audience": "All Students & Faculty",
            "content": "The university will celebrate Independence Day with flag hoisting at 8:30 AM in the main quadrangle, followed by cultural performances and alumni address. All students, staff, and faculty are cordially invited.",
            "is_published": True,
            "published_date": datetime(2026, 8, 7, 16, 0)
        },
        {
            "title": "Mid-Term Project & Assignment Submission Deadline",
            "category": "Academic",
            "target_audience": "Students",
            "content": "All postgraduate students (MCA, MBA, MTech) must submit their mid-term project reports and capstone assignments through the portal before 11:59 PM on Friday. Late submissions will attract penalties.",
            "is_published": True,
            "published_date": datetime(2026, 8, 5, 12, 30)
        },
        {
            "title": "Campus Recruitment Registration Open for 2026 Batch",
            "category": "Placement",
            "target_audience": "Eligible Students",
            "content": "Registration for the 2026 placement cycle is now live. Eligible students must verify their academic records and submit their verified resumes to the Training & Placement Office by the end of this week.",
            "is_published": True,
            "published_date": datetime(2026, 8, 3, 10, 0)
        },
        {
            "title": "Institutional Holiday Notice - Festival Break",
            "category": "Holiday",
            "target_audience": "All Students & Staff",
            "content": "The university campus and administrative offices will remain closed on Monday on account of the upcoming public festival holiday. Regular classes and lab sessions will resume on Tuesday.",
            "is_published": True,
            "published_date": datetime(2026, 8, 1, 15, 20)
        },
        {
            "title": "Draft Internal Notice - Faculty Meeting Agenda",
            "category": "Internal",
            "target_audience": "Faculty Only",
            "content": "Unpublished internal review draft.",
            "is_published": False, # MUST REMAIN HIDDEN FROM PUBLIC API
            "published_date": datetime(2026, 8, 13, 9, 0)
        }
    ]

    added_count = 0
    for data in realistic_notices:
        existing = db.query(models.Notice).filter(models.Notice.title == data["title"]).first()
        if not existing:
            notice_obj = models.Notice(**data)
            db.add(notice_obj)
            added_count += 1

    db.commit()
    print(f"[SUCCESS] Added {added_count} realistic Notice records to database.")

    # 3. Verify Active Published Notices
    public_notices = db.query(models.Notice).filter(models.Notice.is_published == True).order_by(models.Notice.published_date.desc()).all()
    print(f"\nTotal Published Notices in DB: {len(public_notices)}")
    for n in public_notices:
        print(f" - ID {n.id}: [{n.category}] {n.title} (Audience: {n.target_audience}, Date: {n.published_date.strftime('%Y-%m-%d')})")

    db.close()
    print("==================================================")
    print(" NOTICE DB SEEDING COMPLETED SUCCESSFULLY         ")
    print("==================================================")

if __name__ == "__main__":
    seed_notices()
