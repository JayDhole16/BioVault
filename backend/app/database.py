from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Database setup based on DB_TYPE
if settings.DB_TYPE == "sqlite":
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG
    )
elif settings.DB_TYPE == "mongodb":
    from pymongo import MongoClient
    client = MongoClient(settings.DATABASE_URL)
    db = client.biovault
else:
    raise ValueError(f"Unsupported database type: {settings.DB_TYPE}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
