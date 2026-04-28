import joblib
import numpy as np
from typing import Tuple
from ..config import settings
import os


class FraudDetectionModel:
    """Isolation Forest model for transaction fraud detection"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.load_model()
    
    def load_model(self):
        """Load pre-trained model and scaler from disk"""
        try:
            model_path = settings.MODEL_PATH
            scaler_path = settings.MODEL_SCALER_PATH
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                print(f"✓ Model loaded from {model_path}")
            else:
                print(f"⚠ Model not found at {model_path}")
                print("  Using mock predictions for now")
        except Exception as e:
            print(f"Error loading model: {e}")
    
    def predict(self, features: np.ndarray) -> Tuple[float, str]:
        """
        Predict fraud risk
        
        Args:
            features: Feature vector for transaction
            
        Returns:
            Tuple of (risk_score: float, risk_level: str)
        """
        try:
            if self.model is None or self.scaler is None:
                # Return mock prediction
                risk_score = np.random.random()
            else:
                # Scale features
                scaled_features = self.scaler.transform([features])
                
                # Predict anomaly score (-1 for outliers, 1 for inliers)
                prediction = self.model.predict(scaled_features)[0]
                
                # Get anomaly scores (negative distance to separation hyperplane)
                anomaly_score = self.model.score_samples(scaled_features)[0]
                
                # Normalize to 0-1 range
                risk_score = 1 / (1 + np.exp(anomaly_score))  # Sigmoid
            
            # Classify risk level based on threshold
            if risk_score >= settings.HIGH_RISK_THRESHOLD:
                risk_level = "HIGH"
            elif risk_score >= settings.FRAUD_THRESHOLD:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"
            
            return risk_score, risk_level
        
        except Exception as e:
            print(f"Error in prediction: {e}")
            return 0.5, "MEDIUM"  # Default to medium risk on error
    
    def extract_features(self, transaction_data: dict) -> np.ndarray:
        """
        Extract features from transaction data
        
        Features:
        - amount (normalized)
        - hour_of_day
        - day_of_week
        - is_new_recipient (0/1)
        - transaction_count_24h
        - avg_transaction_amount
        """
        # TODO: Implement feature extraction from transaction data
        # For now, return mock features
        features = np.array([
            transaction_data.get("amount", 0.0),
            transaction_data.get("hour", 12),
            transaction_data.get("day", 3),
            1 if transaction_data.get("new_recipient", False) else 0,
            transaction_data.get("tx_count_24h", 1),
            transaction_data.get("avg_amount", 0.1)
        ])
        return features


# Global instance
fraud_detector = FraudDetectionModel()


def analyze_transaction(transaction_data: dict) -> dict:
    """
    Analyze transaction for fraud risk
    
    Returns dict with keys:
    - risk_score: float between 0 and 1
    - risk_level: "LOW", "MEDIUM", "HIGH"
    - recommendation: "APPROVE", "REVIEW", "BLOCK"
    """
    features = fraud_detector.extract_features(transaction_data)
    risk_score, risk_level = fraud_detector.predict(features)
    
    # Determine recommendation
    if risk_level == "HIGH":
        recommendation = "BLOCK"
    elif risk_level == "MEDIUM":
        recommendation = "REVIEW"
    else:
        recommendation = "APPROVE"
    
    return {
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "factors": {
            "unusual_amount": transaction_data.get("amount", 0) > 100,
            "new_recipient": transaction_data.get("new_recipient", False),
            "high_frequency": transaction_data.get("tx_count_24h", 0) > 10
        }
    }
