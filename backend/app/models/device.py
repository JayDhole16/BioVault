from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean

from ..database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_name = Column(String, nullable=False)
    device_id = Column(String, unique=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    credential_id = Column(String, unique=True, nullable=False, index=True)
    credential_data = Column(String, nullable=False)  # JSON encoded credential
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # new_device, guardian_invite, password_reset
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
