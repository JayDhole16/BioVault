"""
Session storage for WebAuthn challenges
Handles storing and retrieving challenges during WebAuthn flows
"""
import base64
import secrets
import time
from typing import Optional, Dict, Tuple

# Format: {session_key: {"challenge": bytes, "timestamp": float, "type": "register|authenticate"}}
_session_store: Dict[str, Dict] = {}
SESSION_EXPIRY_SECONDS = 600  # 10 minutes


def create_challenge() -> str:
    """Generate a random challenge and return as base64"""
    challenge_bytes = secrets.token_bytes(32)
    return base64.b64encode(challenge_bytes).decode('utf-8')


def store_registration_session(
    user_id: int,
    email: str,
    username: str,
    challenge: str,
) -> str:
    """
    Store registration session and return session key
    """
    session_key = f"reg_{user_id}_{int(time.time() * 1000)}"
    _session_store[session_key] = {
        "challenge": challenge,
        "user_id": user_id,
        "email": email,
        "username": username,
        "timestamp": time.time(),
        "type": "register",
    }
    return session_key


def store_authentication_session(
    username: str,
    challenge: str,
) -> str:
    """
    Store authentication session and return session key
    """
    session_key = f"auth_{username}_{int(time.time() * 1000)}"
    _session_store[session_key] = {
        "challenge": challenge,
        "username": username,
        "timestamp": time.time(),
        "type": "authenticate",
    }
    return session_key


def get_session(session_key: str) -> Optional[Dict]:
    """
    Retrieve session if not expired
    """
    if session_key not in _session_store:
        return None
    
    session = _session_store[session_key]
    elapsed = time.time() - session["timestamp"]
    
    if elapsed > SESSION_EXPIRY_SECONDS:
        del _session_store[session_key]
        return None
    
    return session


def invalidate_session(session_key: str) -> None:
    """
    Remove session after use
    """
    if session_key in _session_store:
        del _session_store[session_key]


def cleanup_expired() -> None:
    """
    Clean up expired sessions
    """
    now = time.time()
    expired = [
        k for k, v in _session_store.items()
        if now - v["timestamp"] > SESSION_EXPIRY_SECONDS
    ]
    for k in expired:
        del _session_store[k]
