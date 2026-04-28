from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    username: str


class WebAuthnLogin(BaseModel):
    username: str
    credential_id: Optional[str] = None
    client_data: Optional[dict] = None
    assertion_object: Optional[dict] = None


class NewDeviceLoginRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: str

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    address: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


class UserRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    wallet: WalletResponse
