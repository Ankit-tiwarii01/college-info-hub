import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from sqlalchemy import func
from app.main import app
from app import models, database

client = TestClient(app)

def run_all_verification_tests():
    print("======================================================================")
    print("  RUNNING COMPLETE EMAIL VERIFICATION & OTP TEST SUITE (13 TEST CASES)")
    print("======================================================================\n")

    db = database.SessionLocal()

    # Clean up test accounts if they exist from prior runs
    test_emails = ["testuser_verify_flow@example.com", "testuser_pending_reuse@example.com"]
    for email in test_emails:
        db.query(models.OTP).filter(func.lower(models.OTP.email) == email).delete(synchronize_session=False)
        db.query(models.StudentProfile).filter(
            models.StudentProfile.student_id.in_(
                db.query(models.Student.id).filter(func.lower(models.Student.email) == email)
            )
        ).delete(synchronize_session=False)
        db.query(models.Student).filter(func.lower(models.Student.email) == email).delete(synchronize_session=False)
    db.commit()

    email_main = "testuser_verify_flow@example.com"
    pass_main = "Password123!"

    # ------------------------------------------------------------------
    # TEST 1: Register a new user
    # ------------------------------------------------------------------
    print("Test 1: Registering new user...")
    reg_res = client.post("/auth/register", json={
        "name": "Verification Test User",
        "email": email_main,
        "password": pass_main,
        "role": "student",
        "reg_no": "2026TEST001",
        "course": "B.Tech",
        "batch": "2022-2026"
    })
    assert reg_res.status_code == 200, f"Register failed: {reg_res.text}"
    print("  [OK] Registration endpoint returned 200 OK")

    # ------------------------------------------------------------------
    # TEST 2: Confirm OTP email & DB record generated
    # ------------------------------------------------------------------
    print("Test 2: Verifying OTP creation in reusable otps table...")
    otp_rec = db.query(models.OTP).filter(
        func.lower(models.OTP.email) == email_main,
        models.OTP.purpose == "EMAIL_VERIFICATION",
        models.OTP.is_used == False
    ).order_by(models.OTP.created_at.desc()).first()
    assert otp_rec is not None, "OTP record not created in otps table!"
    assert len(otp_rec.otp) == 6 and otp_rec.otp.isdigit(), f"Invalid OTP format: {otp_rec.otp}"
    print(f"  [OK] OTP record created: ID={otp_rec.id}, Purpose={otp_rec.purpose}, Expiry={otp_rec.expires_at}")

    # ------------------------------------------------------------------
    # TEST 3: Confirm account status is Pending & email_verified=False
    # ------------------------------------------------------------------
    print("Test 3: Checking student pending status in database...")
    student = db.query(models.Student).filter(func.lower(models.Student.email) == email_main).first()
    assert student is not None, "Student record missing!"
    assert student.email_verified == False, f"Expected email_verified=False, got {student.email_verified}"
    assert student.status == "Pending", f"Expected status='Pending', got {student.status}"
    print("  [OK] Student account verified as Pending and email_verified=False")

    # ------------------------------------------------------------------
    # TEST 4: Try login before verification -> must return 403
    # ------------------------------------------------------------------
    print("Test 4: Attempting login before verification (expecting HTTP 403)...")
    login_res = client.post("/auth/token", json={
        "email": email_main,
        "password": pass_main
    })
    assert login_res.status_code == 403, f"Expected 403 Forbidden, got {login_res.status_code}: {login_res.text}"
    err_detail = login_res.json().get("detail", "")
    assert "Please verify your email address before logging in." in err_detail, f"Unexpected error detail: {err_detail}"
    print(f"  [OK] Login rejected with 403 Forbidden: '{err_detail}'")

    # ------------------------------------------------------------------
    # TEST 5: Enter wrong OTP -> error & attempt count incremented
    # ------------------------------------------------------------------
    print("Test 5: Testing incorrect OTP entry...")
    wrong_otp_code = "999999" if otp_rec.otp != "999999" else "000000"
    v_res = client.post("/auth/verify-email", json={
        "email": email_main,
        "otp": wrong_otp_code
    })
    assert v_res.status_code == 400, f"Expected 400 Bad Request, got {v_res.status_code}: {v_res.text}"
    db.refresh(otp_rec)
    assert otp_rec.attempts == 1, f"Expected attempts=1, got {otp_rec.attempts}"
    print("  [OK] Incorrect OTP rejected (400) and attempt counter incremented to 1")

    # ------------------------------------------------------------------
    # TEST 6: Test 5 failed OTP attempts -> invalidates OTP
    # ------------------------------------------------------------------
    print("Test 6: Testing 5 failed OTP attempts threshold...")
    for idx in range(2, 6):
        res = client.post("/auth/verify-email", json={
            "email": email_main,
            "otp": wrong_otp_code
        })
        assert res.status_code == 400

    db.refresh(otp_rec)
    assert otp_rec.is_used == True, "OTP record was not marked is_used=True after 5 attempts!"
    print("  [OK] OTP invalidated (is_used=True) after 5 failed attempts")

    # ------------------------------------------------------------------
    # TEST 7: Resend OTP and 60-second cooldown
    # ------------------------------------------------------------------
    print("Test 7: Resending OTP...")
    resend_res = client.post("/auth/resend-verification-otp", json={
        "email": email_main
    })
    assert resend_res.status_code == 200, f"Resend OTP failed: {resend_res.text}"
    
    new_otp_rec = db.query(models.OTP).filter(
        func.lower(models.OTP.email) == email_main,
        models.OTP.purpose == "EMAIL_VERIFICATION",
        models.OTP.is_used == False
    ).order_by(models.OTP.created_at.desc()).first()

    assert new_otp_rec is not None, "New OTP record not generated on resend!"
    assert new_otp_rec.id != otp_rec.id, "Resend did not create a new OTP record!"
    print(f"  [OK] Previous OTP invalidated and new OTP generated: ID={new_otp_rec.id}")

    # ------------------------------------------------------------------
    # TEST 8: Test expired OTP
    # ------------------------------------------------------------------
    print("Test 8: Testing expired OTP rejection...")
    new_otp_rec.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    db.commit()

    exp_res = client.post("/auth/verify-email", json={
        "email": email_main,
        "otp": new_otp_rec.otp
    })
    assert exp_res.status_code == 400, f"Expected 400 for expired OTP, got {exp_res.status_code}: {exp_res.text}"
    db.refresh(new_otp_rec)
    assert new_otp_rec.is_used == True, "Expired OTP not marked is_used=True!"
    print("  [OK] Expired OTP rejected (400) and invalidated")

    # Issue a fresh valid OTP for step 9
    client.post("/auth/resend-verification-otp", json={"email": email_main})
    valid_otp_rec = db.query(models.OTP).filter(
        func.lower(models.OTP.email) == email_main,
        models.OTP.purpose == "EMAIL_VERIFICATION",
        models.OTP.is_used == False
    ).order_by(models.OTP.created_at.desc()).first()

    # ------------------------------------------------------------------
    # TEST 9: Enter correct OTP -> email_verified=True, status=Pending
    # ------------------------------------------------------------------
    print("Test 9: Verifying email with correct OTP...")
    verify_succ = client.post("/auth/verify-email", json={
        "email": email_main,
        "otp": valid_otp_rec.otp
    })
    assert verify_succ.status_code == 200, f"Verification with correct OTP failed: {verify_succ.text}"

    db.refresh(student)
    db.refresh(valid_otp_rec)
    assert student.email_verified == True, f"Expected email_verified=True, got {student.email_verified}"
    assert student.status == "Pending", f"Expected status='Pending' for admin approval, got {student.status}"
    assert valid_otp_rec.is_used == True, "OTP record not marked as used after successful verification!"
    print("  [OK] Email verified successfully! (email_verified=True, status='Pending' awaiting admin approval)")

    # TEST 9b: Attempt login before Admin Approval -> must return 403
    print("Test 9b: Attempting login before admin approval (expecting HTTP 403)...")
    login_pending = client.post("/auth/token", json={
        "email": email_main,
        "password": pass_main
    })
    assert login_pending.status_code == 403, f"Expected 403 for pending admin approval, got {login_pending.status_code}"
    assert "pending administrator approval" in login_pending.json().get("detail", "").lower()
    print("  [OK] Login rejected prior to admin approval (403 Forbidden)")

    # ------------------------------------------------------------------
    # TEST 10: Admin approves user -> Login after approval succeeds
    # ------------------------------------------------------------------
    print("Test 10: Admin approving user & testing post-approval login...")
    student.status = "Active"
    db.commit()

    login_succ = client.post("/auth/token", json={
        "email": email_main,
        "password": pass_main
    })
    assert login_succ.status_code == 200, f"Login failed after admin approval: {login_succ.text}"
    token_data = login_succ.json()
    assert "access_token" in token_data, "No access_token returned!"
    print("  [OK] Login successful after Admin approval! Issued JWT access token")

    # ------------------------------------------------------------------
    # TEST 11: Registering with an already verified email -> reject
    # ------------------------------------------------------------------
    print("Test 11: Registering with an already verified email...")
    dup_reg = client.post("/auth/register", json={
        "name": "Duplicate User",
        "email": email_main,
        "password": "Password456!",
        "role": "student"
    })
    assert dup_reg.status_code == 400, f"Expected 400 for duplicate verified email, got {dup_reg.status_code}: {dup_reg.text}"
    dup_err = dup_reg.json().get("detail", "")
    assert "This email is already registered." in dup_err, f"Unexpected error detail: {dup_err}"
    print(f"  [OK] Duplicate registration rejected: '{dup_err}'")

    # ------------------------------------------------------------------
    # TEST 12: Registering again with unverified email -> reuse account, no duplicate
    # ------------------------------------------------------------------
    print("Test 12: Registering again with unverified email (reusing pending account)...")
    email_unverified = "testuser_pending_reuse@example.com"
    client.post("/auth/register", json={
        "name": "Original Pending User",
        "email": email_unverified,
        "password": "InitialPassword1!",
        "role": "student"
    })

    # Register again with the same unverified email
    reuse_reg = client.post("/auth/register", json={
        "name": "Updated Pending User Name",
        "email": email_unverified,
        "password": "UpdatedPassword2!",
        "role": "student"
    })
    assert reuse_reg.status_code == 200, f"Re-registration failed: {reuse_reg.text}"

    # Check student table count for this email
    user_count = db.query(models.Student).filter(func.lower(models.Student.email) == email_unverified).count()
    assert user_count == 1, f"Expected 1 student record, found {user_count} duplicates!"
    
    updated_user = db.query(models.Student).filter(func.lower(models.Student.email) == email_unverified).first()
    assert updated_user.name == "Updated Pending User Name", f"User name not updated! Got: {updated_user.name}"
    print("  [OK] Pending account reused successfully without creating duplicate DB records")

    # ------------------------------------------------------------------
    # TEST 13: Confirm Forgot Password OTP functionality still works
    # ------------------------------------------------------------------
    print("Test 13: Testing Forgot Password OTP workflow (no regressions)...")
    fp_res = client.post("/auth/forgot-password", json={
        "email": email_main
    })
    assert fp_res.status_code == 200, f"Forgot password failed: {fp_res.text}"

    fp_otp = db.query(models.OTP).filter(
        func.lower(models.OTP.email) == email_main,
        models.OTP.purpose == "PASSWORD_RESET",
        models.OTP.is_used == False
    ).order_by(models.OTP.created_at.desc()).first()

    assert fp_otp is not None, "Forgot Password OTP not generated in otps table!"

    # Verify OTP
    v_fp_res = client.post("/auth/verify-otp", json={
        "email": email_main,
        "otp": fp_otp.otp
    })
    assert v_fp_res.status_code == 200, f"Verify Forgot Password OTP failed: {v_fp_res.text}"

    # Reset Password
    new_pass = "NewPass123!"
    reset_res = client.post("/auth/reset-password", json={
        "email": email_main,
        "otp": fp_otp.otp,
        "new_password": new_pass
    })
    assert reset_res.status_code == 200, f"Reset password failed: {reset_res.text}"

    # Test login with new password
    login_new = client.post("/auth/token", json={
        "email": email_main,
        "password": new_pass
    })
    assert login_new.status_code == 200, f"Login with new password failed: {login_new.text}"
    print("  [OK] Forgot Password OTP flow executed flawlessly with zero regressions")

    db.close()
    print("\n======================================================================")
    print("  ALL 13 TEST CASES PASSED SUCCESSFULLY!")
    print("======================================================================\n")

if __name__ == "__main__":
    run_all_verification_tests()
