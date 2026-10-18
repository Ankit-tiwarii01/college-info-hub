from app.database import engine
from app import models

def reinit_db():
    print("Dropping all tables...")
    models.Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Database schema updated successfully!")

if __name__ == "__main__":
    reinit_db()
