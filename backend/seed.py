from app import models, database, utils
from datetime import datetime, timedelta
import random

def seed_data():
    db = database.SessionLocal()

    # Ensure all new tables/columns exist first
    models.Base.metadata.create_all(bind=database.engine)

    print("Clearing existing data...")
    try:
        # Delete child records before parents (cascade order)
        db.query(models.JobApplicationStatusHistory).delete()
        db.query(models.JobApplication).delete()
        db.query(models.MentorshipSession).delete()
        db.query(models.Report).delete()
        db.query(models.PostLike).delete()
        db.query(models.Comment).delete()
        db.query(models.Post).delete()
        db.query(models.Notification).delete()
        db.query(models.EventAttendee).delete()
        db.query(models.MentorshipRequest).delete()
        db.query(models.Job).delete()
        db.query(models.Event).delete()
        db.query(models.StudentAcademic).delete()
        db.query(models.Student).delete()
        db.query(models.Admin).delete()
        db.commit()
    except Exception as e:
        print(f"Error clearing data: {e}")
        db.rollback()

    print("Seeding Admin...")
    admin_password = utils.get_password_hash("admin123")
    admin = models.Admin(
        email="admin@collegehub.com",
        name="System Admin",
        password=admin_password
    )
    db.add(admin)
    db.commit()

    print("Seeding Users (Alumni & Students)...")
    common_password = utils.get_password_hash("password")
    
    alumni_data = [
        {"email": "alumni1@test.com", "name": "Priya Mehta", "role": "Alumni", "batch": "2021", "course": "B.Tech Computer Science", "company": "Google", "designation": "Software Engineer"},
        {"email": "alumni2@test.com", "name": "Arjun Patel", "role": "Alumni", "batch": "2019", "course": "B.Tech Electronics", "company": "Microsoft", "designation": "Product Manager"},
        {"email": "alumni3@test.com", "name": "Neha Sharma", "role": "Alumni", "batch": "2022", "course": "B.Tech IT", "company": "Amazon", "designation": "Cloud Architect"},
    ]
    alumni_list = []
    for data in alumni_data:
        alumni = models.Student(
            email=data["email"],
            name=data["name"],
            password=common_password,
            role=data["role"],
            status="Active",
            batch=data["batch"],
            course=data["course"]
        )
        db.add(alumni)
        db.flush() # flush to get alumni.id
        
        # Add profile
        profile = models.StudentProfile(student_id=alumni.id, bio=f"Working as a {data['designation']} at {data['company']}.")
        db.add(profile)
        
        # Add experience
        exp = models.StudentExperience(
            student_id=alumni.id,
            company_name=data["company"],
            role=data["designation"],
            experience_type="Job",
            start_date=datetime.now().date()
        )
        db.add(exp)
        
        alumni_list.append(alumni)
    db.commit()
    for a in alumni_list: db.refresh(a)

    student_data = [
        {"email": "student1@test.com", "name": "Rahul Kumar", "batch": "2025", "course": "B.Tech Computer Science"},
        {"email": "student2@test.com", "name": "Ananya Singh", "batch": "2025", "course": "B.Tech IT"},
        {"email": "student3@test.com", "name": "Rohan Gupta", "batch": "2026", "course": "B.Tech Computer Science"},
        {"email": "student4@test.com", "name": "Kavya Desai", "batch": "2026", "course": "B.Tech Electronics"},
    ]
    student_list = []
    for data in student_data:
        student = models.Student(
            email=data["email"],
            name=data["name"],
            password=common_password,
            role="Student",
            status="Active",
            batch=data["batch"],
            course=data["course"]
        )
        db.add(student)
        db.flush() # Get student id
        
        profile = models.StudentProfile(student_id=student.id, bio="Aspiring software developer looking for mentorship and opportunities.")
        db.add(profile)
        
        student_list.append(student)
    db.commit()
    for s in student_list: db.refresh(s)

    print("Seeding Jobs...")
    jobs = [
        {"title": "Frontend Developer Intern", "company": "Google", "type": "Internship", "location": "Bangalore", "description": "Looking for React enthusiasts. Requirements: React, Tailwind.", "posted_by": str(alumni_list[0].id), "is_active": True},
        {"title": "SDE-1", "company": "Microsoft", "type": "Full Time", "location": "Hyderabad", "description": "Join the Azure team. Requirements: C++, Python.", "posted_by": str(alumni_list[1].id), "is_active": True},
        {"title": "Cloud Ops Intern", "company": "Amazon", "type": "Internship", "location": "Remote", "description": "AWS internship. Requirements: AWS, Linux.", "posted_by": str(alumni_list[2].id), "is_active": True},
    ]
    job_objs = []
    for j in jobs:
        db_job = models.Job(**j)
        db.add(db_job)
        job_objs.append(db_job)
    db.commit()
    for j in job_objs: db.refresh(j)

    print("Seeding Job Applications...")
    applications = [
        {"job_id": job_objs[0].id, "student_id": student_list[0].id, "status": "Applied", "cover_letter": "I love React!"},
        {"job_id": job_objs[0].id, "student_id": student_list[1].id, "status": "Shortlisted", "cover_letter": "I have experience with Tailwind."},
        {"job_id": job_objs[1].id, "student_id": student_list[0].id, "status": "Interviewing", "cover_letter": "Azure is great."},
        {"job_id": job_objs[2].id, "student_id": student_list[3].id, "status": "Rejected", "cover_letter": "I know AWS."},
    ]
    for app in applications:
        db_app = models.JobApplication(**app, applied_date=datetime.utcnow(), updated_at=datetime.utcnow())
        db.add(db_app)
        db.commit()
        db.refresh(db_app)
        # Add history
        history = models.JobApplicationStatusHistory(
            application_id=db_app.id,
            old_status="Applied",
            new_status=app["status"],
            changed_at=datetime.utcnow(),
            note="Status updated from seed."
        )
        db.add(history)
    db.commit()

    print("Seeding Mentorship Requests & Sessions...")
    m_requests = [
        {"student_id": student_list[0].id, "mentor_id": alumni_list[0].id, "status": "Accepted", "message": "Hi Priya, I need help with frontend prep."},
        {"student_id": student_list[1].id, "mentor_id": alumni_list[1].id, "status": "Pending", "message": "Hi Arjun, need guidance for PM roles."},
        {"student_id": student_list[2].id, "mentor_id": alumni_list[2].id, "status": "Rejected", "message": "Hi Neha, AWS tips?", "mentor_note": "Sorry, busy right now."},
    ]
    req_objs = []
    for mr in m_requests:
        db_mr = models.MentorshipRequest(**mr, created_at=datetime.utcnow())
        db.add(db_mr)
        req_objs.append(db_mr)
    db.commit()
    for r in req_objs: db.refresh(r)

    # Session for the accepted request
    session = models.MentorshipSession(
        request_id=req_objs[0].id,
        scheduled_at=datetime.utcnow() + timedelta(days=2),
        duration_minutes=30,
        notes="Meeting link: https://meet.google.com/abc-defg-hij",
        topic="Frontend Interview Prep",
        status="Scheduled"
    )
    db.add(session)
    db.commit()

    print("Seeding Posts...")
    posts = [
        {"user_id": alumni_list[0].id, "content": "Just posted a new internship opening at Google. Apply via the Jobs portal!", "type": "general", "is_approved": True, "approved_by": "System Admin"},
        {"user_id": student_list[0].id, "content": "Excited to start my final year project on AI!", "type": "general", "is_approved": True, "approved_by": "System Admin"},
        {"user_id": student_list[1].id, "content": "Can anyone share resources for learning React?", "type": "academic", "is_approved": True, "approved_by": "System Admin"},
        {"user_id": student_list[2].id, "content": "Here is a post awaiting admin approval.", "type": "general", "is_approved": False},
    ]
    for p in posts:
        db_p = models.Post(
            user_id=p["user_id"],
            content=p["content"],
            type=p["type"],
            is_approved=p["is_approved"],
            approved_by=p.get("approved_by"),
            created_at=datetime.utcnow(),
            approved_at=datetime.utcnow() if p["is_approved"] else None
        )
        db.add(db_p)
    db.commit()

    print("Seeding Events...")
    events = [
        {"title": "Alumni Meet 2024", "type": "Networking", "audience": "All", "date": (datetime.now() + timedelta(days=15)).date(), "location": "Main Auditorium", "description": "Annual alumni networking event."},
        {"title": "Microsoft SDE Prep", "type": "Career", "audience": "Final Year", "date": (datetime.now() + timedelta(days=3)).date(), "location": "Online", "description": "Prep session by alumni at Microsoft."},
    ]
    for e in events:
        db_event = models.Event(**e)
        db.add(db_event)
    db.commit()

    print("Seeding Notifications...")
    notifications = [
        {"user_id": student_list[0].id, "text": "Your Mentorship Request to Priya was accepted!", "type": "success", "read": False},
        {"user_id": student_list[0].id, "text": "Your application for Google Intern has been updated to Applied.", "type": "info", "read": False},
        {"user_id": alumni_list[0].id, "text": "New job application from Rahul for Frontend Intern.", "type": "info", "read": False},
    ]
    for n in notifications:
        db.add(models.Notification(**n))
    db.commit()

    print("Seeding Completed Successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
