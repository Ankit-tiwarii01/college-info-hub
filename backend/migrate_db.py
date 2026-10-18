from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Starting migration...")
        
        # Add apply_link to jobs
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN apply_link VARCHAR(255)"))
            print("Successfully added 'apply_link' to 'jobs' table.")
        except Exception as e:
            print(f"Skipping 'apply_link': {e}")

        # Add type to posts
        try:
            conn.execute(text("ALTER TABLE posts ADD COLUMN type VARCHAR(50) DEFAULT 'general'"))
            print("Successfully added 'type' to 'posts' table.")
        except Exception as e:
            print(f"Skipping 'type': {e}")

        # Mentorship meeting lifecycle/attendance migration.  These statements
        # are intentionally idempotent so this script is safe on existing data.
        for column in [
            "started_at DATETIME",
            "student_joined_at DATETIME",
            "mentor_joined_at DATETIME",
            "ended_at DATETIME",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE mentorship_sessions ADD COLUMN {column}"))
                print(f"Added mentorship_sessions.{column.split()[0]}.")
            except Exception as e:
                print(f"Skipping mentorship_sessions.{column.split()[0]}: {e}")

        conn.execute(text(
            "UPDATE mentorship_sessions SET status = 'Upcoming' "
            "WHERE status = 'Scheduled' OR status IS NULL OR status = ''"
        ))
        try:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_mentorship_sessions_status_scheduled "
                "ON mentorship_sessions (status, scheduled_at)"
            ))
        except Exception as e:
            print(f"Skipping mentorship session status index: {e}")
        
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
