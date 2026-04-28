from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.jwt import verify_token
from ..database import get_db
from ..models import Guardian
from ..schemas import guardian as guardian_schemas
from ..services import guardian_service

router = APIRouter()


def _guardian_to_response(guardian: Guardian) -> guardian_schemas.GuardianResponse:
    return guardian_schemas.GuardianResponse(
        id=str(guardian.id),
        guardian_name=guardian.guardian_name,
        guardian_email=guardian.guardian_email,
        relationship=guardian.relationship_type,
        is_verified=guardian.is_verified,
        created_at=guardian.created_at.isoformat() if guardian.created_at else "",
    )


@router.post("/guardian/add", response_model=guardian_schemas.GuardianResponse)
async def add_guardian(
    request: guardian_schemas.AddGuardianRequest,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Add a new guardian for social recovery.
    Requires: guardian_name, guardian_email, relationship
    """
    try:
        guardian = guardian_service.add_guardian(
            db,
            int(user_id),
            request.guardian_name,
            request.guardian_email,
            request.relationship,
        )
        return _guardian_to_response(guardian)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/guardian/list", response_model=list[guardian_schemas.GuardianResponse])
async def list_guardians(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get all guardians for the authenticated user.
    """
    guardians = guardian_service.get_user_guardians(db, int(user_id))
    return [_guardian_to_response(g) for g in guardians]


@router.post("/guardian/invite")
async def invite_guardian(
    request: guardian_schemas.InviteGuardianRequest,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Send invitation (with OTP) to a guardian.
    Guardian will receive email with OTP to verify.
    """
    try:
        otp_code = guardian_service.invite_guardian(db, request.guardian_id)
        return {
            "message": "Invitation sent to guardian email",
            "status": "pending",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/guardian/verify", response_model=guardian_schemas.GuardianResponse)
async def verify_guardian_invitation(
    request: guardian_schemas.VerifyGuardianRequest,
    db: Session = Depends(get_db),
):
    """
    Guardian verifies email invitation using OTP.
    """
    try:
        guardian = guardian_service.verify_guardian_invitation(
            db,
            request.guardian_id,
            request.otp_code,
        )
        return _guardian_to_response(guardian)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
