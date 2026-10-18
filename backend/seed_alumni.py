import sys
import os
from datetime import date

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models

def seed_database():
    db = SessionLocal()

    print("==================================================")
    print(" SEEDING REALISTIC INDIAN ALUMNI TEST DATASET     ")
    print("==================================================")

    # 1. Clean up old test / dummy alumni records
    dummy_records = db.query(models.Alumni).filter(
        (models.Alumni.name.like("%Test%")) | 
        (models.Alumni.name.like("%Vikramaditya%")) |
        (models.Alumni.email.like("%test%"))
    ).all()
    
    deleted_count = len(dummy_records)
    for d in dummy_records:
        db.delete(d)
    db.commit()
    print(f"[CLEANUP] Removed {deleted_count} dummy alumni records.")

    # 2. Define 8 Realistic Indian Alumni Records
    indian_alumni_dataset = [
        {
            "name": "Aarav Sharma",
            "enrollment_number": "0101MCA2022001",
            "mobile_number": "9810123451",
            "email": "aarav.sharma@alumni.university.edu",
            "date_of_birth": date(1998, 4, 12),
            "course_completed": "MCA",
            "year_of_admission": 2022,
            "year_of_completion": 2024,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Senior Software Engineer",
            "organization": "Google India",
            "current_city": "Bengaluru",
            "current_state": "Karnataka",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/aarav-sharma-tech",
            "willing_to_attend_events": "Yes",
            "contributions": "Placements",
            "status": "Active"
        },
        {
            "name": "Ananya Verma",
            "enrollment_number": "0201MBA2021002",
            "mobile_number": "9810123452",
            "email": "ananya.verma@alumni.university.edu",
            "date_of_birth": date(1997, 8, 25),
            "course_completed": "MBA",
            "year_of_admission": 2021,
            "year_of_completion": 2023,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Senior Product Manager",
            "organization": "Microsoft India",
            "current_city": "Gurugram",
            "current_state": "Haryana",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/ananya-verma-pm",
            "willing_to_attend_events": "Yes",
            "contributions": "Financially (Individual)",
            "status": "Active"
        },
        {
            "name": "Rohan Kumar",
            "enrollment_number": "0301MTECH2023003",
            "mobile_number": "9810123453",
            "email": "rohan.kumar@alumni.university.edu",
            "date_of_birth": date(1999, 1, 15),
            "course_completed": "MTech",
            "year_of_admission": 2023,
            "year_of_completion": 2025,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Cloud Infrastructure Architect",
            "organization": "Amazon Web Services",
            "current_city": "Hyderabad",
            "current_state": "Telangana",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/rohan-kumar-cloud",
            "willing_to_attend_events": "Yes",
            "contributions": "Services",
            "status": "Active"
        },
        {
            "name": "Priya Singh",
            "enrollment_number": "0401MCA2024004",
            "mobile_number": "9810123454",
            "email": "priya.singh@alumni.university.edu",
            "date_of_birth": date(2000, 11, 5),
            "course_completed": "MCA",
            "year_of_admission": 2024,
            "year_of_completion": 2026,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Lead Data Scientist",
            "organization": "Flipkart",
            "current_city": "Bengaluru",
            "current_state": "Karnataka",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/priya-singh-ai",
            "willing_to_attend_events": "Yes",
            "contributions": "Placements",
            "status": "Active"
        },
        {
            "name": "Aditya Raj",
            "enrollment_number": "0501MBA2020005",
            "mobile_number": "9810123455",
            "email": "aditya.raj@alumni.university.edu",
            "date_of_birth": date(1996, 6, 30),
            "course_completed": "MBA",
            "year_of_admission": 2020,
            "year_of_completion": 2022,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Strategy Consultant",
            "organization": "McKinsey & Company",
            "current_city": "Mumbai",
            "current_state": "Maharashtra",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/aditya-raj-consulting",
            "willing_to_attend_events": "Yes",
            "contributions": "Financially (As a batch)",
            "status": "Active"
        },
        {
            "name": "Neha Kumari",
            "enrollment_number": "0601MTECH2022006",
            "mobile_number": "9810123456",
            "email": "neha.kumari@alumni.university.edu",
            "date_of_birth": date(1998, 3, 19),
            "course_completed": "MTech",
            "year_of_admission": 2022,
            "year_of_completion": 2024,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "AI Research Scientist",
            "organization": "Adobe Research",
            "current_city": "Noida",
            "current_state": "Uttar Pradesh",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/neha-kumari-research",
            "willing_to_attend_events": "Yes",
            "contributions": "Services",
            "status": "Active"
        },
        {
            "name": "Rahul Mishra",
            "enrollment_number": "0701MCA2019007",
            "mobile_number": "9810123457",
            "email": "rahul.mishra@alumni.university.edu",
            "date_of_birth": date(1995, 9, 10),
            "course_completed": "MCA",
            "year_of_admission": 2019,
            "year_of_completion": 2021,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Business/Entrepreneur",
            "designation": "Founder & CTO",
            "organization": "FinTech Solutions",
            "current_city": "New Delhi",
            "current_state": "Delhi",
            "current_country": "India",
            "linkedin": None, # Test case without LinkedIn
            "willing_to_attend_events": "Yes",
            "contributions": "Financially (Individual),Placements",
            "status": "Active"
        },
        {
            "name": "Sneha Gupta",
            "enrollment_number": "0801MBA2018008",
            "mobile_number": "9810123458",
            "email": "sneha.gupta@alumni.university.edu",
            "date_of_birth": date(1994, 12, 2),
            "course_completed": "MBA",
            "year_of_admission": 2018,
            "year_of_completion": 2020,
            "university_institute": "NA",
            "other_institution": "NA",
            "profession": "Private Service",
            "designation": "Vice President - Finance",
            "organization": "HDFC Bank",
            "current_city": "Mumbai",
            "current_state": "Maharashtra",
            "current_country": "India",
            "linkedin": "https://linkedin.com/in/sneha-gupta-finance",
            "willing_to_attend_events": "Yes",
            "contributions": "Financially (Individual)",
            "status": "Active"
        }
    ]

    added_count = 0
    for record in indian_alumni_dataset:
        existing = db.query(models.Alumni).filter(models.Alumni.email == record["email"]).first()
        if not existing:
            alumni_obj = models.Alumni(**record)
            db.add(alumni_obj)
            added_count += 1

    db.commit()
    print(f"[SUCCESS] Added {added_count} realistic Indian Alumni records to database.")

    # 3. Print All Current Records in Alumni Table
    all_alumni = db.query(models.Alumni).filter(models.Alumni.status == "Active").all()
    print(f"\nTotal Active Alumni in DB: {len(all_alumni)}")
    for a in all_alumni:
        print(f" - ID {a.id}: {a.name} | {a.course_completed} ({a.year_of_admission}–{a.year_of_completion}) | {a.designation} at {a.organization} ({a.current_city})")

    db.close()
    print("==================================================")
    print(" DB SEEDING COMPLETED SUCCESSFULLY                ")
    print("==================================================")

if __name__ == "__main__":
    seed_database()
