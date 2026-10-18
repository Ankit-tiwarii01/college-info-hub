from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Update these with your actual database credentials
# User: root, Password: (empty), Host: localhost, DB: college_hub
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# The populated project database lives in backend/college_hub.db.  Older builds
# sometimes created an empty backend/app/college_hub.db and then silently used
# it on the next restart.  Prefer the canonical database so existing data is
# never hidden by that stray file.
CANONICAL_DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "college_hub.db"))
LEGACY_APP_DB_PATH = os.path.join(BASE_DIR, "college_hub.db")
DB_PATH = CANONICAL_DB_PATH if os.path.exists(CANONICAL_DB_PATH) else LEGACY_APP_DB_PATH

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.abspath(DB_PATH)}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
