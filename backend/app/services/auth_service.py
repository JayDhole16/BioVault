"""
Authentication service with wallet generation and OTP management
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import string

from sqlalchemy.orm import Session
from eth_keys import keys

from ..models import User, Wallet, OTPCode
from ..blockchain.client import blockchain


def generate_ethereum_wallet() -> dict:
    """Generate a new Ethereum wallet"""
    account = blockchain.create_account()
    
    # Extract public key from private key using eth_keys
    private_key_bytes = bytes.fromhex(account.key.hex()[2:])
    private_key_obj = keys.PrivateKey(private_key_bytes)
    public_key = private_key_obj.public_key.to_hex()
    
    return {
        "address": account.address,
        "private_key": account.key.hex(),
        "public_key": public_key,
    }


def create_user_wallet(db: Session, user_id: int) -> Wallet:
    """Create wallet for user during registration"""
    wallet_info = generate_ethereum_wallet()
    
    wallet = Wallet(
        user_id=user_id,
        address=wallet_info["address"],
        public_key=wallet_info["public_key"],
        network="hardhat",
        created_at=datetime.utcnow(),
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def generate_otp(length: int = 6) -> str:
    """Generate a random OTP code"""
    return "".join(random.choices(string.digits, k=length))


def create_otp(
    db: Session,
    email: str,
    purpose: str,
    expiration_minutes: int = 15,
) -> str:
    """Create and store OTP code"""
    code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
    
    otp = OTPCode(
        email=email,
        code=code,
        purpose=purpose,
        is_used=False,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()
    return code


def verify_otp(db: Session, email: str, code: str, purpose: str) -> bool:
    """Verify OTP code"""
    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.email == email,
            OTPCode.code == code,
            OTPCode.purpose == purpose,
            OTPCode.is_used == False,
        )
        .first()
    )
    
    if not otp:
        return False
    
    # Check expiration
    now = datetime.now(timezone.utc)
    if otp.expires_at.replace(tzinfo=timezone.utc) < now:
        return False
    
    # Mark as used
    otp.is_used = True
    db.commit()
    return True


def send_otp_email(email: str, code: str, purpose: str) -> bool:
    """
    Mock email sending for hackathon.
    In production, use SendGrid, AWS SES, etc.
    """
    print(f"\n🔔 MOCK EMAIL TO: {email}")
    print(f"📧 Purpose: {purpose}")
    print(f"🔐 OTP Code: {code}")
    print("---\n")
    return True
