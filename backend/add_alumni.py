
from app.database import SessionLocal
from app.models import Student, StudentProfile
from app.utils import get_password_hash

def add_alumni():
    db = SessionLocal()
    try:
        # Check if already exists
        email = "alumni@collegehub.com"
        existing = db.query(Student).filter(Student.email == email).first()
        if existing:
            print(f"Alumni user {email} already exists.")
            return

        # Create Alumni
        # Note: In a real app, we might want more specific fields, but this is a basic user
        alumni = Student(
            name="Alice Alumni",
            email=email,
            password=get_password_hash("alumni123"),
            role="Alumni",
            status="Active",
            reg_no="ALM2020001",
            course="B.Tech CS",
            batch="2020",
            session="2016-2020"
        )
        db.add(alumni)
        db.commit()
        db.refresh(alumni)

        # Add Profile
        profile = StudentProfile(
            student_id=alumni.id,
            bio="Senior Software Engineer at TechCorp. Happy to mentor!",
            skills="Python, React, System Design",
            location="Bangalore, India",
            achievements="Best Outgoing Student 2020",
            avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
        )
        db.add(profile)
        db.commit()
        
        print(f"Successfully created Alumni user: {email} / alumni123")
        print(f"ID: {alumni.id}")

    except Exception as e:
        print(f"Error creating alumni: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_alumni()
