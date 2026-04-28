"""
Guardian and social recovery service
"""
from sqlalchemy.orm import Session

from ..models import Guardian, RecoveryRequest, RecoveryApproval, User
from .auth_service import send_otp_email, create_otp


def add_guardian(
    db: Session,
    user_id: int,
    guardian_name: str,
    guardian_email: str,
    relationship: str,
) -> Guardian:
    """Add a new guardian for social recovery"""
    # Check if guardian already exists
    existing = (
        db.query(Guardian)
        .filter(
            Guardian.user_id == user_id,
            Guardian.guardian_email == guardian_email,
        )
        .first()
    )
    if existing:
        raise ValueError("Guardian already exists")
    
    guardian = Guardian(
        user_id=user_id,
        guardian_name=guardian_name,
        guardian_email=guardian_email,
        relationship_type=relationship,
        is_verified=False,
    )
    db.add(guardian)
    db.commit()
    db.refresh(guardian)
    return guardian


def get_user_guardians(db: Session, user_id: int) -> list[Guardian]:
    """Get all guardians for a user"""
    return db.query(Guardian).filter(Guardian.user_id == user_id).all()


def invite_guardian(db: Session, guardian_id: int) -> str:
    """Send invitation to guardian with OTP"""
    guardian = db.query(Guardian).filter(Guardian.id == guardian_id).first()
    if not guardian:
        raise ValueError("Guardian not found")
    
    if guardian.is_verified:
        raise ValueError("Guardian already verified")
    
    # Generate OTP
    otp_code = create_otp(
        db,
        email=guardian.guardian_email,
        purpose="guardian_invite",
        expiration_minutes=30,
    )
    
    # Send mock email
    send_otp_email(
        guardian.guardian_email,
        otp_code,
        f"Guardian invitation from {guardian.user_id}",
    )
    
    return otp_code


def verify_guardian_invitation(
    db: Session,
    guardian_id: int,
    otp_code: str,
) -> Guardian:
    """Verify guardian's OTP and mark as verified"""
    guardian = db.query(Guardian).filter(Guardian.id == guardian_id).first()
    if not guardian:
        raise ValueError("Guardian not found")
    
    # Import here to avoid circular dependency
    from .auth_service import verify_otp
    
    if not verify_otp(db, guardian.guardian_email, otp_code, "guardian_invite"):
        raise ValueError("Invalid or expired OTP")
    
    guardian.is_verified = True
    db.commit()
    db.refresh(guardian)
    return guardian


def create_recovery_request(db: Session, user_id: int) -> RecoveryRequest:
    """Create a new recovery request"""
    # Check if user has at least 3 guardians
    guardians = db.query(Guardian).filter(
        Guardian.user_id == user_id,
        Guardian.is_verified == True,
    ).all()
    
    if len(guardians) < 3:
        raise ValueError(f"Need at least 3 verified guardians, have {len(guardians)}")
    
    recovery_request = RecoveryRequest(
        user_id=user_id,
        status="pending",
        approval_count=0,
        required_approvals=3,
    )
    db.add(recovery_request)
    db.commit()
    db.refresh(recovery_request)
    
    # Create approval records for each guardian
    for guardian in guardians:
        approval = RecoveryApproval(
            recovery_request_id=recovery_request.id,
            guardian_id=guardian.id,
            approved=False,
        )
        db.add(approval)
    
    db.commit()
    
    # Send notification to guardians (mock)
    user = db.query(User).filter(User.id == user_id).first()
    for guardian in guardians:
        print(f"\n🔔 Recovery Request Notification")
        print(f"📧 To: {guardian.guardian_email}")
        print(f"👤 User: {user.email}")
        print(f"⏰ Recovery ID: {recovery_request.id}")
        print("---\n")
    
    return recovery_request


def approve_recovery(
    db: Session,
    recovery_request_id: int,
    guardian_id: int,
) -> RecoveryRequest:
    """Guardian approves a recovery request"""
    recovery_request = db.query(RecoveryRequest).filter(
        RecoveryRequest.id == recovery_request_id
    ).first()
    if not recovery_request:
        raise ValueError("Recovery request not found")
    
    if recovery_request.status != "pending":
        raise ValueError(f"Recovery already {recovery_request.status}")
    
    approval = db.query(RecoveryApproval).filter(
        RecoveryApproval.recovery_request_id == recovery_request_id,
        RecoveryApproval.guardian_id == guardian_id,
    ).first()
    
    if not approval:
        raise ValueError("Approval record not found")
    
    if approval.approved:
        raise ValueError("Guardian already approved")
    
    approval.approved = True
    db.commit()
    
    # Count approvals
    approved_count = db.query(RecoveryApproval).filter(
        RecoveryApproval.recovery_request_id == recovery_request_id,
        RecoveryApproval.approved == True,
    ).count()
    
    recovery_request.approval_count = approved_count
    
    if approved_count >= recovery_request.required_approvals:
        recovery_request.status = "approved"
    
    db.commit()
    db.refresh(recovery_request)
    
    return recovery_request


def get_recovery_status(
    db: Session,
    recovery_request_id: int,
) -> dict:
    """Get recovery request status and approvals"""
    recovery_request = db.query(RecoveryRequest).filter(
        RecoveryRequest.id == recovery_request_id
    ).first()
    
    if not recovery_request:
        raise ValueError("Recovery request not found")
    
    approvals = db.query(RecoveryApproval).filter(
        RecoveryApproval.recovery_request_id == recovery_request_id
    ).all()
    
    return {
        "recovery_id": recovery_request.id,
        "status": recovery_request.status,
        "approval_count": recovery_request.approval_count,
        "required_approvals": recovery_request.required_approvals,
        "approvals": [
            {
                "guardian_id": a.guardian_id,
                "approved": a.approved,
                "approved_at": a.created_at.isoformat(),
            }
            for a in approvals
        ],
        "created_at": recovery_request.created_at.isoformat(),
    }
