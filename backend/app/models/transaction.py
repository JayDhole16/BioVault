from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float, Boolean
from sqlalchemy.orm import relationship

from ..database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    from_address = Column(String, nullable=False)
    to_address = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="simulated", nullable=False)  # simulated, pending, confirmed, failed
    transaction_hash = Column(String, nullable=True, unique=True)
    gas_fee = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    executed_at = Column(DateTime, nullable=True)

    user = relationship("User")
    fraud_log = relationship("FraudLog", back_populates="transaction", uselist=False)


class FraudLog(Base):
    __tablename__ = "fraud_logs"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)  # 0.0 to 1.0
    risk_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    recommendation = Column(String, nullable=False)  # APPROVE, REVIEW, BLOCK
    factors = Column(String, nullable=True)  # JSON string of factors
    model_version = Column(String, default="1.0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    transaction = relationship("Transaction", back_populates="fraud_log")
    user = relationship("User")
