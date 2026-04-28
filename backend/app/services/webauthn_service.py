"""
WebAuthn/FIDO2 biometric authentication service
Handles registration and authentication challenges/verification
"""
import secrets
import json
import base64
from datetime import datetime
from sqlalchemy.orm import Session
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorAttestationResponse,
    AuthenticatorAssertionResponse,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    AttestationConveyancePreference,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.base64url_to_bytes import base64url_to_bytes

from ..models import User, WebAuthnCredential
from ..config import settings


class WebAuthnService:
    """Service for WebAuthn biometric authentication"""
    
    RP_ID = "localhost"  # Relying Party ID - will be set based on hostname
    RP_NAME = "BioVault"
    ORIGIN = "http://localhost:3000"  # Will be set based on environment
    
    @classmethod
    def set_origin(cls, origin: str):
        """Set the origin based on frontend URL"""
        cls.ORIGIN = origin
        # Extract domain from origin
        if "://" in origin:
            domain = origin.split("://")[1].split(":")[0]
        else:
            domain = "localhost"
        cls.RP_ID = domain
    
    @staticmethod
    def generate_registration_challenge(user_id: int, email: str, username: str) -> dict:
        """
        Generate registration options for fingerprint enrollment
        Returns challenge that frontend will use with navigator.credentials.create()
        """
        challenge = secrets.token_bytes(32)
        
        options = generate_registration_options(
            rp_id=WebAuthnService.RP_ID,
            rp_name=WebAuthnService.RP_NAME,
            user_id=str(user_id).encode(),
            user_name=username,
            user_display_name=email,
            supported_pub_key_algs=[-7, -257],  # ES256, RS256
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            attestation=AttestationConveyancePreference.DIRECT,
        )
        
        # Convert challenge to base64 for transmission
        challenge_b64 = base64.b64encode(challenge).decode('utf-8')
        options_json = options_to_json(options)
        
        # Store challenge in session/cache for verification
        return {
            "challenge": challenge_b64,
            "options": json.loads(options_json),
        }
    
    @staticmethod
    def verify_registration_response(
        db: Session,
        user_id: int,
        credential: dict,
        challenge: str,
    ) -> WebAuthnCredential:
        """
        Verify registration response from client
        Stores the verified credential
        """
        try:
            # Convert base64 challenge back to bytes
            challenge_bytes = base64.b64decode(challenge)
            
            # Format credential for verification
            credential_data = RegistrationCredential(
                id=credential["id"],
                raw_id=base64url_to_bytes(credential["rawId"]),
                response=AuthenticatorAttestationResponse(
                    client_data_json=base64url_to_bytes(credential["response"]["clientDataJSON"]),
                    attestation_object=base64url_to_bytes(credential["response"]["attestationObject"]),
                ),
            )
            
            # Verify the registration
            verified = verify_registration_response(
                credential=credential_data,
                expected_challenge=challenge_bytes,
                expected_origin=WebAuthnService.ORIGIN,
                expected_rp_id=WebAuthnService.RP_ID,
            )
            
            # Store the credential
            credential_obj = WebAuthnCredential(
                user_id=user_id,
                credential_id=credential["id"],
                credential_data=json.dumps({
                    "credential_id": credential["id"],
                    "public_key": base64.b64encode(verified.credential_public_key).decode('utf-8'),
                    "sign_count": verified.sign_count,
                    "transports": credential.get("response", {}).get("transports", []),
                }),
            )
            
            db.add(credential_obj)
            db.commit()
            db.refresh(credential_obj)
            
            return credential_obj
            
        except Exception as e:
            db.rollback()
            raise ValueError(f"Registration verification failed: {str(e)}")
    
    @staticmethod
    def generate_authentication_challenge(
        db: Session,
        username: str,
    ) -> dict:
        """
        Generate authentication options for fingerprint login
        Returns challenge that frontend will use with navigator.credentials.get()
        """
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise ValueError("User not found")
        
        # Get user's registered credentials
        credentials = db.query(WebAuthnCredential).filter(
            WebAuthnCredential.user_id == user.id
        ).all()
        
        if not credentials:
            raise ValueError("No biometric credentials registered for this user")
        
        challenge = secrets.token_bytes(32)
        
        # Extract credential IDs for the client
        credential_ids = [cred.credential_id for cred in credentials]
        
        options = generate_authentication_options(
            rp_id=WebAuthnService.RP_ID,
            user_verification=UserVerificationRequirement.PREFERRED,
            allow_credentials=[
                PublicKeyCredentialDescriptor(id=base64url_to_bytes(cid))
                for cid in credential_ids
            ],
        )
        
        challenge_b64 = base64.b64encode(challenge).decode('utf-8')
        options_json = options_to_json(options)
        
        return {
            "challenge": challenge_b64,
            "credential_ids": credential_ids,
            "options": json.loads(options_json),
        }
    
    @staticmethod
    def verify_authentication_response(
        db: Session,
        username: str,
        assertion: dict,
        challenge: str,
    ) -> User:
        """
        Verify authentication response from client
        Returns user if verification successful
        """
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise ValueError("User not found")
            
            # Find the credential being used
            credential = db.query(WebAuthnCredential).filter(
                WebAuthnCredential.user_id == user.id,
                WebAuthnCredential.credential_id == assertion["id"],
            ).first()
            
            if not credential:
                raise ValueError("Credential not found for user")
            
            # Convert base64 challenge back to bytes
            challenge_bytes = base64.b64decode(challenge)
            
            # Store credential data for verification
            stored_cred_data = json.loads(credential.credential_data)
            public_key_bytes = base64.b64decode(stored_cred_data["public_key"])
            
            # Format assertion for verification
            resp = assertion["response"]
            assertion_data = AuthenticationCredential(
                id=assertion["id"],
                raw_id=base64url_to_bytes(assertion["rawId"]),
                response=AuthenticatorAssertionResponse(
                    client_data_json=base64url_to_bytes(resp["clientDataJSON"]),
                    authenticator_data=base64url_to_bytes(
                        resp.get("authenticatorData") or resp.get("authenticator_data")
                    ),
                    signature=base64url_to_bytes(resp["signature"]),
                    user_handle=base64url_to_bytes(resp["userHandle"])
                        if resp.get("userHandle") else None,
                ),
            )
            
            # Verify the authentication
            verified = verify_authentication_response(
                credential=assertion_data,
                expected_challenge=challenge_bytes,
                expected_origin=WebAuthnService.ORIGIN,
                expected_rp_id=WebAuthnService.RP_ID,
                credential_public_key=public_key_bytes,
                credential_current_sign_count=stored_cred_data.get("sign_count", 0),
            )
            
            # Update sign count
            stored_cred_data["sign_count"] = verified.new_sign_count
            credential.credential_data = json.dumps(stored_cred_data)
            db.commit()
            
            return user
            
        except Exception as e:
            raise ValueError(f"Authentication verification failed: {str(e)}")
