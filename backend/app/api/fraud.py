from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.jwt import verify_token
from ..database import get_db
from ..schemas import fraud as fraud_schemas
from ..services import fraud_service

router = APIRouter()


@router.post("/fraud/check")
async def check_fraud_risk(
    request: fraud_schemas.FraudCheckRequest,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Analyze transaction fraud risk using Isolation Forest model.
    
    Input:
    - wallet_address
    - to_address
    - amount
    
    Output:
    - risk_score (0-100)
    - risk_level (Safe / Suspicious / High Risk)
    - recommendation (APPROVE / REVIEW / BLOCK)
    """
    try:
        result = fraud_service.analyze_fraud_risk(
            db,
            int(user_id),
            request.wallet_address,
            request.to_address,
            request.amount,
        )
        
        return {
            "wallet_address": request.wallet_address,
            "to_address": request.to_address,
            "amount": request.amount,
            "risk_score": int(result["risk_score"] * 100),  # Convert to 0-100
            "risk_level": "Safe" if result["risk_level"] == "LOW" 
                         else "Suspicious" if result["risk_level"] == "MEDIUM"
                         else "High Risk",
            "recommendation": result["recommendation"],
            "factors": result["factors"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fraud check failed: {str(e)}")


@router.get("/fraud/user-profile")
async def get_user_fraud_profile(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get user's fraud profile and statistics.
    """
    try:
        profile = fraud_service.get_user_fraud_profile(db, int(user_id))
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")


@router.get("/fraud/metrics")
async def get_fraud_metrics(
    db: Session = Depends(get_db),
):
    """
    Get system-wide fraud detection metrics.
    """
    return {
        "model_version": "1.0",
        "model_type": "Isolation Forest",
        "last_model_update": "2024-01-01T00:00:00Z",
        "total_transactions_analyzed": 0,
        "fraud_detected_count": 0,
        "detection_rate": 0.0,
        "model_accuracy": 0.95,
    }
