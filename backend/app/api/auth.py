from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.jwt import create_access_token, verify_token
from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import auth as auth_schemas
from ..services import auth_service
from ..services.webauthn_service import WebAuthnService
from ..services.challenge_session import (
    create_challenge,
    store_registration_session,
    store_authentication_session,
    get_session,
    invalidate_session,
)

router = APIRouter()


def _user_to_response(user: User) -> auth_schemas.UserResponse:
    return auth_schemas.UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.post("/auth/register", response_model=auth_schemas.UserRegisterResponse)
async def register(
    user_data: auth_schemas.UserRegister,
    db: Session = Depends(get_db),
):
    """
    Register a new user with Ethereum wallet generation.
    """
    user = User(email=user_data.email, username=user_data.username)
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    # Generate Ethereum wallet
    try:
        wallet = auth_service.create_user_wallet(db, user.id)
        wallet_response = {
            "address": wallet.address,
            "created_at": wallet.created_at.isoformat() if wallet.created_at else "",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create wallet: {str(e)}",
        )

    # Create JWT token
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=expires,
    )
    
    return auth_schemas.UserRegisterResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_user_to_response(user),
        wallet=wallet_response,
    )


@router.post("/auth/login", response_model=auth_schemas.TokenResponse)
async def login(
    credentials: auth_schemas.WebAuthnLogin,
    db: Session = Depends(get_db),
):
    """
    Login with username. WebAuthn verification is stubbed for hackathon.
    In production, verify biometric credential assertion.
    """
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or credentials",
        )

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=expires,
    )
    return auth_schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/auth/new-device")
async def new_device_login(
    request: auth_schemas.NewDeviceLoginRequest,
    db: Session = Depends(get_db),
):
    """
    New device login flow:
    1. User provides email
    2. Send OTP to email
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists for security
        return {
            "message": "If email exists, OTP has been sent",
            "status": "pending",
        }
    
    # Generate and send OTP
    otp_code = auth_service.create_otp(
        db,
        request.email,
        "new_device",
        expiration_minutes=15,
    )
    
    # Mock email send
    auth_service.send_otp_email(request.email, otp_code, "New Device Login")
    
    return {
        "message": "OTP sent to email",
        "status": "pending",
    }


@router.post("/auth/verify-otp", response_model=auth_schemas.TokenResponse)
async def verify_otp_for_device(
    request: auth_schemas.VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Verify OTP for new device login.
    After verification, user can register biometric for this device.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Verify OTP
    if not auth_service.verify_otp(db, request.email, request.code, "new_device"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )
    
    # Create JWT token
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=expires,
    )
    
    return auth_schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/auth/logout")
async def logout():
    """Logout user (token invalidation handled client-side for JWT)"""
    return {"message": "Logged out successfully"}


@router.get("/auth/me", response_model=auth_schemas.UserResponse)
async def get_current_user(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get current authenticated user info"""
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _user_to_response(user)


# ============ WebAuthn/Biometric Authentication Endpoints ============


@router.post("/auth/webauthn/register/start")
async def webauthn_register_start(
    request_data: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Start WebAuthn registration - generate challenge for fingerprint enrollment
    """
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    try:
        # Generate challenge
        challenge = create_challenge()
        
        # Store session
        session_key = store_registration_session(
            user_id=user.id,
            email=user.email,
            username=user.username,
            challenge=challenge,
        )
        
        # Generate registration options
        challenge_data = WebAuthnService.generate_registration_challenge(
            user_id=user.id,
            email=user.email,
            username=user.username,
        )
        
        return {
            "challenge": challenge,
            "session_key": session_key,
            "options": challenge_data["options"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate registration challenge: {str(e)}",
        )


@router.post("/auth/webauthn/register/complete")
async def webauthn_register_complete(
    credential_data: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Complete WebAuthn registration - verify and store fingerprint credential
    """
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    try:
        # Get session with challenge
        session_key = credential_data.get("session_key")
        if not session_key:
            raise ValueError("Session key not provided")
        
        session = get_session(session_key)
        if not session:
            raise ValueError("Session expired or invalid")
        
        challenge = session["challenge"]
        
        credential_response = {
            "id": credential_data.get("id"),
            "rawId": credential_data.get("rawId"),
            "response": credential_data.get("response", {}),
            "type": credential_data.get("type", "public-key"),
        }
        
        cred_obj = WebAuthnService.verify_registration_response(
            db=db,
            user_id=user.id,
            credential=credential_response,
            challenge=challenge,
        )
        
        # Invalidate session after use
        invalidate_session(session_key)
        
        return {
            "credential_id": cred_obj.credential_id,
            "message": "Fingerprint registered successfully",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration verification failed: {str(e)}",
        )


@router.post("/auth/webauthn/authenticate/start")
async def webauthn_authenticate_start(
    request_data: dict,
    db: Session = Depends(get_db),
):
    """
    Start WebAuthn authentication - generate challenge for fingerprint login
    """
    username = request_data.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username required",
        )
    
    try:
        # Generate challenge
        challenge = create_challenge()
        
        # Store session
        session_key = store_authentication_session(
            username=username,
            challenge=challenge,
        )
        
        # Get credential IDs for user
        challenge_data = WebAuthnService.generate_authentication_challenge(
            db=db,
            username=username,
        )
        
        return {
            "challenge": challenge,
            "session_key": session_key,
            "credential_ids": challenge_data["credential_ids"],
            "options": challenge_data["options"],
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate authentication challenge: {str(e)}",
        )


@router.post("/auth/webauthn/authenticate/complete", response_model=auth_schemas.TokenResponse)
async def webauthn_authenticate_complete(
    request_data: dict,
    db: Session = Depends(get_db),
):
    """
    Complete WebAuthn authentication - verify fingerprint and return token
    """
    username = request_data.get("username")
    assertion_data = request_data.get("assertion_data")
    session_key = request_data.get("session_key")
    
    if not username or not assertion_data or not session_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, assertion_data, and session_key required",
        )
    
    try:
        # Get session with challenge
        session = get_session(session_key)
        if not session:
            raise ValueError("Session expired or invalid")
        
        challenge = session["challenge"]
        
        user = WebAuthnService.verify_authentication_response(
            db=db,
            username=username,
            assertion=assertion_data,
            challenge=challenge,
        )
        
        # Invalidate session after use
        invalidate_session(session_key)
        
        # Create JWT token
        expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=expires,
        )
        
        return auth_schemas.TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )
