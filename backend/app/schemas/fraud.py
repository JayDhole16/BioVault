from pydantic import BaseModel, Field
from typing import Dict, Any


class FraudCheckRequest(BaseModel):
    wallet_address: str
    to_address: str
    amount: float


class TransactionFraudAnalysis(BaseModel):
    transaction_hash: str = "pending"
    from_address: str
    to_address: str
    amount: float
    timestamp: str
    gas_price: float = 0.0
    user_history: Dict[str, Any] = Field(default_factory=dict)


class FraudRiskResponse(BaseModel):
    transaction_hash: str
    risk_score: float  # 0.0 to 1.0
    risk_level: str  # LOW, MEDIUM, HIGH
    recommendation: str  # APPROVE, REVIEW, BLOCK
    factors: Dict[str, Any]


class UserFraudProfile(BaseModel):
    user_id: str
    average_transaction_amount: float
    average_transaction_frequency: int
    common_recipients: list[str]
    high_risk_transactions: int
    blocked_transactions: int
