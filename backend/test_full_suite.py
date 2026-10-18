import sys
import os
import unittest
from datetime import datetime
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import get_db, SessionLocal
from app import models, utils

client = TestClient(app)

def run_tests():
    print("==================================================")
    print(" STARTING YEAR VALIDATION EXHAUSTIVE SUITE        ")
    print("==================================================")

    db = SessionLocal()

    # Clean previous test records
    db.query(models.Alumni).filter(models.Alumni.email.like("test_y_%")).delete(synchronize_session=False)
    db.commit()

    base_form = {
        "name": "Test Alumnus",
        "mobile_number": "9812345678",
        "date_of_birth": "1995-08-15",
        "course_completed": "MCA",
        "profession": "Private Service",
        "designation": "Software Engineer",
        "organization": "Tech Corp",
        "current_city": "Delhi",
        "current_state": "Delhi",
        "current_country": "India",
        "willing_to_attend_events": "Yes",
        "contributions": "Financially (Individual)",
    }

    def try_register(adm_year, comp_year, tag):
        form = base_form.copy()
        form["year_of_admission"] = str(adm_year)
        form["year_of_completion"] = str(comp_year)
        form["email"] = f"test_y_{tag}_{adm_year}_{comp_year}@university.edu.in"
        form["enrollment_number"] = f"REG_Y_{tag}_{adm_year}_{comp_year}"
        return client.post("/api/alumni/register", data=form)

    # 1. Admission 2003 -> REJECT
    res_2003 = try_register(2003, 2005, "t1")
    assert res_2003.status_code == 400, f"Expected 400 for admission 2003, got {res_2003.status_code}"
    print("[PASS] Admission 2003 -> Rejected (HTTP 400)")

    # 2. Admission 2004 -> ALLOW (2004 + 2006)
    res_2004 = try_register(2004, 2006, "t2")
    assert res_2004.status_code == 201, f"Expected 201 for admission 2004, got {res_2004.status_code}"
    print("[PASS] Admission 2004 + Completion 2006 -> Allowed (HTTP 201)")

    # 3. Admission 2024 + Completion 2025 -> REJECT
    res_2024_2025 = try_register(2024, 2025, "t3")
    assert res_2024_2025.status_code == 400, f"Expected 400 for 2024 + 2025, got {res_2024_2025.status_code}"
    print("[PASS] Admission 2024 + Completion 2025 -> Rejected (HTTP 400)")

    # 4. Admission 2024 + Completion 2026 -> ALLOW
    res_2024_2026 = try_register(2024, 2026, "t4")
    assert res_2024_2026.status_code == 201, f"Expected 201 for 2024 + 2026, got {res_2024_2026.status_code}"
    print("[PASS] Admission 2024 + Completion 2026 -> Allowed (HTTP 201)")

    # 5. Admission 2023 + Completion 2024 -> REJECT
    res_2023_2024 = try_register(2023, 2024, "t5")
    assert res_2023_2024.status_code == 400, f"Expected 400 for 2023 + 2024, got {res_2023_2024.status_code}"
    print("[PASS] Admission 2023 + Completion 2024 -> Rejected (HTTP 400)")

    # 6. Admission 2023 + Completion 2025 -> ALLOW
    res_2023_2025 = try_register(2023, 2025, "t6")
    assert res_2023_2025.status_code == 201, f"Expected 201 for 2023 + 2025, got {res_2023_2025.status_code}"
    print("[PASS] Admission 2023 + Completion 2025 -> Allowed (HTTP 201)")

    # 7. Admission 2023 + Completion 2026 -> ALLOW
    res_2023_2026 = try_register(2023, 2026, "t7")
    assert res_2023_2026.status_code == 201, f"Expected 201 for 2023 + 2026, got {res_2023_2026.status_code}"
    print("[PASS] Admission 2023 + Completion 2026 -> Allowed (HTTP 201)")

    # 8. Admission 2025 -> REJECT (2025 > 2024)
    res_2025 = try_register(2025, 2027, "t8")
    assert res_2025.status_code == 400, f"Expected 400 for admission 2025, got {res_2025.status_code}"
    print("[PASS] Admission 2025 -> Rejected (HTTP 400)")

    db.close()
    print("==================================================")
    print(" ALL YEAR VALIDATION CASES PASSED 100%!          ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
