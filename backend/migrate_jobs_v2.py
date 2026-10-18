
from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Starting migration for posted_by...")
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN posted_by VARCHAR(50)"))
            conn.commit()
            print("Successfully added 'posted_by' to 'jobs' table.")
        except Exception as e:
            print(f"Error (might already exist): {e}")

if __name__ == "__main__":
    migrate()
