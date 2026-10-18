import sys
import os
from datetime import datetime, date

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def seed_events():
    db = SessionLocal()

    print("==================================================")
    print(" SEEDING REALISTIC CAMPUS EVENTS DATASET         ")
    print("==================================================")

    # 1. Clean up old dummy events
    dummy_events = db.query(models.Event).filter(
        (models.Event.title.like("%Test%")) | 
        (models.Event.title.like("%Dummy%"))
    ).all()

    for d in dummy_events:
        db.delete(d)
    db.commit()
    print(f"[CLEANUP] Removed {len(dummy_events)} dummy event records.")

    # 2. Define 4 Realistic Events covering Completed, Ongoing, and Upcoming
    events_dataset = [
        # COMPLETED EVENT (July 2026 < August 13 2026)
        {
            "title": "Annual Tech Conference & Alumni Meet 2026",
            "type": "Conference",
            "audience": "All Students & Alumni",
            "date": date(2026, 7, 15),
            "time": "09:30 AM - 05:00 PM",
            "location": "Main University Auditorium",
            "description": "Annual flagship technology conference featuring keynotes from industry leaders and alumni panel discussions on emerging software engineering trends.",
            "organizer": "Department of Computer Science",
            "attendees": 350,
            "start_datetime": datetime(2026, 7, 15, 9, 30),
            "end_datetime": datetime(2026, 7, 15, 17, 0)
        },
        # ONGOING EVENT (Starts Aug 13 10:00 AM, Ends Aug 15 06:00 PM)
        {
            "title": "48-Hour Hackathon 2026 – Code for Campus",
            "type": "Hackathon",
            "audience": "All Students",
            "date": date(2026, 8, 13),
            "time": "10:00 AM (Aug 13) - 06:00 PM (Aug 15)",
            "location": "Innovation & Incubation Hub, Block B",
            "description": "Intensive 48-hour inter-college hackathon focusing on AI, Cloud, and Web Solutions with cash prizes and mentor guidance from alumni developers.",
            "organizer": "Campus Tech Club & Incubation Cell",
            "attendees": 180,
            "start_datetime": datetime(2026, 8, 13, 10, 0),
            "end_datetime": datetime(2026, 8, 15, 18, 0)
        },
        # UPCOMING EVENT 1 (September 2026)
        {
            "title": "Global Leadership & Entrepreneurship Summit 2026",
            "type": "Summit",
            "audience": "Students & Alumni",
            "date": date(2026, 9, 20),
            "time": "10:00 AM - 04:30 PM",
            "location": "Convention Center, Gate 2",
            "description": "High-impact summit connecting student founders with venture capitalists, startup mentors, and successful alumni entrepreneurs.",
            "organizer": "University Entrepreneurship Cell",
            "attendees": 220,
            "start_datetime": datetime(2026, 9, 20, 10, 0),
            "end_datetime": datetime(2026, 9, 20, 16, 30)
        },
        # UPCOMING EVENT 2 (October 2026)
        {
            "title": "Autumn Cultural & Music Festival 2026",
            "type": "Cultural",
            "audience": "All Students",
            "date": date(2026, 10, 10),
            "time": "05:00 PM - 10:00 PM",
            "location": "University Open Air Theatre",
            "description": "Annual autumn celebration featuring live band performances, dance competitions, food stalls, and interactive cultural showcases.",
            "organizer": "Student Cultural Council",
            "attendees": 500,
            "start_datetime": datetime(2026, 10, 10, 17, 0),
            "end_datetime": datetime(2026, 10, 10, 22, 0)
        }
    ]

    added_count = 0
    now = datetime.now()

    for data in events_dataset:
        existing = db.query(models.Event).filter(models.Event.title == data["title"]).first()
        if existing:
            # Update start_datetime and end_datetime
            existing.start_datetime = data["start_datetime"]
            existing.end_datetime = data["end_datetime"]
            existing.date = data["date"]
            existing.time = data["time"]
            existing.location = data["location"]
            existing.description = data["description"]
            existing.organizer = data["organizer"]
        else:
            event_obj = models.Event(**data)
            db.add(event_obj)
            added_count += 1

    db.commit()
    print(f"[SUCCESS] Processed events dataset. Added {added_count} new events.")

    # 3. Print All Events with Calculated Status
    all_events = db.query(models.Event).all()
    print(f"\nTotal Events in DB: {len(all_events)}")
    for e in all_events:
        start_dt = e.start_datetime or (datetime.combine(e.date, datetime.min.time().replace(hour=9)) if e.date else None)
        end_dt = e.end_datetime or (datetime.combine(e.date, datetime.min.time().replace(hour=18)) if e.date else None)
        
        if start_dt and end_dt:
            if now > end_dt:
                status_str = "Completed"
            elif now >= start_dt and now <= end_dt:
                status_str = "Ongoing"
            else:
                status_str = "Upcoming"
        else:
            status_str = "Upcoming"

        print(f" - ID {e.id}: {e.title} | Status: [{status_str}] | Start: {start_dt} | End: {end_dt}")

    db.close()
    print("==================================================")
    print(" EVENT DB SEEDING COMPLETED SUCCESSFULLY          ")
    print("==================================================")

if __name__ == "__main__":
    seed_events()
