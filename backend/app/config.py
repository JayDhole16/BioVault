from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    # App Config
    APP_NAME: str = "BioVault API"
    DEBUG: bool = False
    
    # Server Config
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    
    # Frontend URL (for WebAuthn origins)
    FRONTEND_URL: str = "https://karima-nonurban-unpolitely.ngrok-free.dev"
    
    # CORS Config (allow only frontend origins)
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://0.0.0.0:3000",
        "https://karima-nonurban-unpolitely.ngrok-free.dev"
    ]
    
    # Database Config
    DATABASE_URL: str = "sqlite:///./biovault.db"
    # For MongoDB: "mongodb://localhost:27017/biovault"
    DB_TYPE: str = "sqlite"  # sqlite or mongodb
    
    # JWT Config
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # WebAuthn Config
    RP_ID: str = "karima-nonurban-unpolitely.ngrok-free.dev"
    RP_NAME: str = "BioVault"
    RP_ORIGIN: str = "https://karima-nonurban-unpolitely.ngrok-free.dev"
    
    # Blockchain Config
    HARDHAT_RPC_URL: str = "http://127.0.0.1:8545"
    NETWORK: str = "hardhat"
    
    # ML Model Config
    MODEL_PATH: str = "ml_models/fraud_detection_model.pkl"
    MODEL_SCALER_PATH: str = "ml_models/scaler.pkl"
    
    # Fraud Detection Thresholds
    FRAUD_THRESHOLD: float = 0.5
    HIGH_RISK_THRESHOLD: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
