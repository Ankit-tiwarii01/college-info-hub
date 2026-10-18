"""Create a new administrator without overwriting an existing account."""
from getpass import getpass
from sqlalchemy import func
from app import database, models, utils

if __name__ == '__main__':
    models.Base.metadata.create_all(database.engine)
    name = input('Admin name: ').strip()
    email = input('Admin email: ').strip().lower()
    password = getpass('Password (at least 12 characters): ')
    if not name or '@' not in email or len(password) < 12:
        raise SystemExit('A name, valid email and password of at least 12 characters are required.')
    with database.SessionLocal() as db:
        if db.query(models.Admin).filter(func.lower(models.Admin.email) == email).first() or db.query(models.Student).filter(func.lower(models.Student.email) == email).first():
            raise SystemExit('An account already uses that email. Nothing was changed.')
        db.add(models.Admin(name=name, email=email, password=utils.get_password_hash(password)))
        db.commit()
    print('Administrator created. Sign in using the regular login page.')
