from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship

from ..database import Base


class Guardian(Base):
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    guardian_name = Column(String, nullable=False)
    guardian_email = Column(String, nullable=False, index=True)
    relationship_type = Column(String, nullable=False)  # friend, family, trusted contact
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
    recovery_approvals = relationship("RecoveryApproval", back_populates="guardian")
