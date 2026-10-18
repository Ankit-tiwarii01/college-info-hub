from app.database import SessionLocal, engine
from app import models, utils
import traceback
import sys
from datetime import datetime

def test_db():
    print("Initializing Session...")
    db = SessionLocal()
    try:
        print("Creating tables (if not exist)...")
        models.Base.metadata.create_all(bind=engine)
        
        # Check if user exists
        existing_user = db.query(models.Student).filter(models.Student.email == "debug@test.com").first()
        if existing_user:
             print("User 'debug@test.com' already exists. Deleting...")
             db.delete(existing_user)
             db.commit()

        print("Attempting to create user...")
        hashed_pwd = utils.get_password_hash("password")
        user = models.Student(
            email="debug@test.com", 
            name="Debug User", 
            password=hashed_pwd, 
            role="Student"
        )
        db.add(user)
        db.commit()
        print("✅ User created successfully!")

        # Create event
        event = models.Event(
            title="RSVP Test Event",
            description="Test Description",
            date="2024-12-31", 
            audience="Student"
        )
        db.add(event)
        db.commit() # Commit to get ID
        print(f"✅ Event created! ID: {event.id}")

        # Simulate RSVP
        print("Simulating RSVP...")
        attendee = models.EventAttendee(
            event_id=event.id,
            student_id=user.id,
            status="going"
        )
        db.add(attendee)
        # db.commit() # Commit attendee first?

        # Calculate count
        count = db.query(models.EventAttendee).filter(
            models.EventAttendee.event_id == event.id,
            (models.EventAttendee.status == "going") | (models.EventAttendee.status == "attending")
        ).count()
        print(f"Calculated Count: {count}")

        event.attendees = count
        db.add(event) # Explicit add used
        db.commit()
        
        # Verify persistence
        db.refresh(event)
        print(f"Event Attendees in DB: {event.attendees}")
        
        if event.attendees != 1:
            print("❌ Count update FAILED!")
        else:
            print("✅ Count update SUCCESS!")

        # Cleanup
        db.delete(attendee)
        db.delete(event)
        db.delete(user)
        db.commit()
        
    except Exception as e:
        print("❌ Error:")
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_db()
