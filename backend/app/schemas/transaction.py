from pydantic import BaseModel
from typing import Optional


class TransactionSimulate(BaseModel):
    from_address: str
    to_address: str
    amount: float
    data: Optional[str] = None


class TransactionExecute(BaseModel):
    from_address: str
    to_address: str
    amount: float
    data: Optional[str] = None
    gas_limit: Optional[int] = None
    gas_fee: Optional[float] = None


class TransactionResponse(BaseModel):
    hash: str
    status: str  # pending, confirmed, failed
    from_address: str
    to_address: str
    amount: float
    gas_fee: float
    created_at: str

    class Config:
        from_attributes = True


class TransactionHistory(BaseModel):
    total: int
    transactions: list[TransactionResponse]
