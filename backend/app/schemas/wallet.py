from pydantic import BaseModel
from typing import Optional


class WalletCreate(BaseModel):
    user_id: str


class WalletResponse(BaseModel):
    address: str
    public_key: str
    created_at: str
    network: str

    class Config:
        from_attributes = True


class WalletBalance(BaseModel):
    address: str
    balance: float
    currency: str = "ETH"


class TransactionCount(BaseModel):
    address: str
    count: int
