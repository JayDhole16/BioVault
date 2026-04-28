from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship

from ..database import Base


class RecoveryRequest(Base):
    __tablename__ = "recovery_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    approval_count = Column(Integer, default=0, nullable=False)
    required_approvals = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    approvals = relationship("RecoveryApproval", back_populates="recovery_request", cascade="all, delete-orphan")


class RecoveryApproval(Base):
    __tablename__ = "recovery_approvals"

    id = Column(Integer, primary_key=True, index=True)
    recovery_request_id = Column(Integer, ForeignKey("recovery_requests.id"), nullable=False)
    guardian_id = Column(Integer, ForeignKey("guardians.id"), nullable=False)
    approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    recovery_request = relationship("RecoveryRequest", back_populates="approvals")
    guardian = relationship("Guardian", back_populates="recovery_approvals")
