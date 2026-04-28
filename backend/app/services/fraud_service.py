"""
Fraud detection service using Isolation Forest model
"""
import json
from datetime import datetime, timedelta
from typing import Optional

import joblib
import numpy as np
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Transaction, FraudLog


class FraudDetectionModel:
    """Isolation Forest model for fraud detection"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.load_model()
    
    def load_model(self):
        """Load pre-trained model"""
        try:
            self.model = joblib.load(settings.MODEL_PATH)
            self.scaler = joblib.load(settings.MODEL_SCALER_PATH)
            print(f"✓ Fraud model loaded: {settings.MODEL_PATH}")
        except FileNotFoundError:
            print(f"⚠ Model not found at {settings.MODEL_PATH}")
            print("  Using mock predictions")
    
    def extract_features(self, transaction_data: dict, user_history: dict) -> np.ndarray:
        """Extract features from transaction data"""
        features = [
            float(transaction_data.get("amount", 0)),  # Amount
            float(transaction_data.get("hour", 12)),  # Hour of day
            float(transaction_data.get("day", 3)),  # Day of week
            1.0 if transaction_data.get("is_new_recipient", False) else 0.0,  # New recipient
            float(user_history.get("tx_count_24h", 1)),  # Transaction count in 24h
            float(user_history.get("avg_amount", 0.1)),  # Average transaction amount
        ]
        return np.array([features])
    
    def predict(self, features: np.ndarray) -> tuple[float, str]:
        """Predict fraud risk"""
        try:
            if self.model is None or self.scaler is None:
                # Mock prediction for demo
                risk_score = np.random.random()
            else:
                # Scale and predict
                scaled = self.scaler.transform(features)
                anomaly_score = self.model.score_samples(scaled)[0]
                # Convert anomaly score to risk probability (0-1)
                risk_score = 1.0 / (1.0 + np.exp(-anomaly_score))
            
            # Classify risk level
            if risk_score >= settings.HIGH_RISK_THRESHOLD:
                risk_level = "HIGH"
            elif risk_score >= settings.FRAUD_THRESHOLD:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"
            
            return risk_score, risk_level
        except Exception as e:
            print(f"Error in prediction: {e}")
            return 0.5, "MEDIUM"


# Global model instance
fraud_model = FraudDetectionModel()


def analyze_fraud_risk(
    db: Session,
    user_id: int,
    from_address: str,
    to_address: str,
    amount: float,
) -> dict:
    """
    Analyze transaction for fraud risk
    
    Returns:
        dict with risk_score, risk_level, recommendation, factors
    """
    # Get user's transaction history
    recent_txs = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= datetime.utcnow() - timedelta(hours=24),
    ).all()
    
    # Calculate statistics
    tx_count_24h = len(recent_txs)
    avg_amount = np.mean([tx.amount for tx in recent_txs]) if recent_txs else 0.1
    
    # Check if recipient is new
    existing_recipient = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.to_address == to_address,
    ).first()
    is_new_recipient = existing_recipient is None
    
    # Prepare transaction data
    now = datetime.utcnow()
    transaction_data = {
        "amount": amount,
        "hour": now.hour,
        "day": now.weekday(),
        "is_new_recipient": is_new_recipient,
    }
    
    user_history = {
        "tx_count_24h": tx_count_24h,
        "avg_amount": avg_amount,
    }
    
    # Extract features and predict
    features = fraud_model.extract_features(transaction_data, user_history)
    risk_score, risk_level = fraud_model.predict(features)
    
    # Determine recommendation
    if risk_level == "HIGH":
        recommendation = "BLOCK"
    elif risk_level == "MEDIUM":
        recommendation = "REVIEW"
    else:
        recommendation = "APPROVE"
    
    # Identify risk factors
    factors = {
        "unusual_amount": amount > avg_amount * 3 if avg_amount > 0 else False,
        "new_recipient": is_new_recipient,
        "high_frequency": tx_count_24h > 10,
        "unusual_time": now.hour in [2, 3, 4, 5],  # 2-5 AM
    }
    
    return {
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "factors": factors,
    }


def log_fraud_analysis(
    db: Session,
    transaction_id: int,
    user_id: int,
    risk_score: float,
    risk_level: str,
    recommendation: str,
    factors: dict,
) -> FraudLog:
    """Log fraud analysis to database"""
    fraud_log = FraudLog(
        transaction_id=transaction_id,
        user_id=user_id,
        risk_score=risk_score,
        risk_level=risk_level,
        recommendation=recommendation,
        factors=json.dumps(factors),
    )
    db.add(fraud_log)
    db.commit()
    db.refresh(fraud_log)
    return fraud_log


def get_user_fraud_profile(db: Session, user_id: int) -> dict:
    """Get user's fraud profile statistics"""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).all()
    
    fraud_logs = db.query(FraudLog).filter(
        FraudLog.user_id == user_id
    ).all()
    
    high_risk_count = len([f for f in fraud_logs if f.risk_level == "HIGH"])
    blocked_count = len([f for f in fraud_logs if f.recommendation == "BLOCK"])
    
    amounts = [tx.amount for tx in transactions if tx.amount]
    avg_amount = np.mean(amounts) if amounts else 0.0
    
    recipients = set(tx.to_address for tx in transactions)
    
    return {
        "user_id": user_id,
        "total_transactions": len(transactions),
        "average_transaction_amount": float(avg_amount),
        "unique_recipients": len(recipients),
        "high_risk_transactions": high_risk_count,
        "blocked_transactions": blocked_count,
    }
