from pydantic import BaseModel, EmailStr


class AddGuardianRequest(BaseModel):
    guardian_name: str
    guardian_email: EmailStr
    relationship: str  # friend, family, trusted_contact


class InviteGuardianRequest(BaseModel):
    guardian_id: int


class VerifyGuardianRequest(BaseModel):
    guardian_id: int
    otp_code: str


class GuardianResponse(BaseModel):
    id: str
    guardian_name: str
    guardian_email: str
    relationship: str
    is_verified: bool
    created_at: str

    class Config:
        from_attributes = True
