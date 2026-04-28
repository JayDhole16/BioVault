from pydantic import BaseModel
from typing import List, Optional


class ApproveRecoveryRequest(BaseModel):
    recovery_request_id: int
    guardian_id: int


class ApprovalInfo(BaseModel):
    guardian_id: int
    approved: bool
    approved_at: str


class RecoveryStatusResponse(BaseModel):
    recovery_id: int
    status: str  # pending, approved, rejected
    approval_count: int
    required_approvals: int
    approvals: List[ApprovalInfo]
    created_at: str
