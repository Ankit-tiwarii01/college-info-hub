"""Interactively create or reset an administrator without hardcoded secrets."""
import os
from getpass import getpass

from app import models, database, utils


def reset_admin():
    db = database.SessionLocal()
    try:
        email = (os.getenv("ADMIN_EMAIL") or input("Admin email: ")).strip().lower()
        password = os.getenv("ADMIN_INITIAL_PASSWORD") or getpass("New admin password (at least 12 characters): ")
        name = (os.getenv("ADMIN_NAME") or "System Admin").strip()
        if "@" not in email or len(password) < 12:
            raise SystemExit("A valid email and password of at least 12 characters are required.")
        print(f"Resetting administrator {email}...")
        admin = db.query(models.Admin).filter(models.Admin.email == email).first()
        if not admin:
            admin = models.Admin(
                email=email,
                name=name,
                password=utils.get_password_hash(password),
            )
            db.add(admin)
        else:
            admin.password = utils.get_password_hash(password)
        db.commit()
        print("Administrator credential updated successfully.")
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_admin()
