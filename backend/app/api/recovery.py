from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.jwt import verify_token
from ..database import get_db
from ..schemas import recovery as recovery_schemas
from ..services import guardian_service

router = APIRouter()


@router.post("/recovery/request")
async def request_recovery(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Create a wallet recovery request.
    Notifies all verified guardians.
    Requires 3 guardian approvals to complete.
    """
    try:
        recovery_request = guardian_service.create_recovery_request(db, int(user_id))
        return {
            "recovery_id": recovery_request.id,
            "status": "pending",
            "created_at": recovery_request.created_at.isoformat(),
            "message": "Recovery request created. Guardians have been notified.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recovery/approve", response_model=recovery_schemas.RecoveryStatusResponse)
async def approve_recovery(
    request: recovery_schemas.ApproveRecoveryRequest,
    db: Session = Depends(get_db),
):
    """
    Guardian approves a recovery request.
    Returns updated recovery status.
    Recovery is approved automatically when 3 guardians approve.
    """
    try:
        recovery_request = guardian_service.approve_recovery(
            db,
            request.recovery_request_id,
            request.guardian_id,
        )
        
        status_info = guardian_service.get_recovery_status(
            db,
            recovery_request.id,
        )
        
        return recovery_schemas.RecoveryStatusResponse(**status_info)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recovery/status/{recovery_request_id}", response_model=recovery_schemas.RecoveryStatusResponse)
async def get_recovery_status(
    recovery_request_id: int,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get the status of a recovery request.
    Shows approval count, who approved, etc.
    """
    try:
        status_info = guardian_service.get_recovery_status(db, recovery_request_id)
        return recovery_schemas.RecoveryStatusResponse(**status_info)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
