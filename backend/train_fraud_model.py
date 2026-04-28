"""
Fraud Detection Model Training Script

This script trains an Isolation Forest model on synthetic transaction data.
Run this to generate the fraud_detection_model.pkl and scaler.pkl files.

Usage:
    python train_fraud_model.py
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler


def generate_synthetic_data(n_samples=1000):
    """
    Generate synthetic transaction data for training.
    
    Features:
    1. Transaction amount (ETH)
    2. Hour of day (0-23)
    3. Day of week (0-6)
    4. Is new recipient (0 or 1)
    5. Transaction count in 24h
    6. Average transaction amount
    """
    np.random.seed(42)
    
    # Normal transactions
    normal_data = np.random.randn(n_samples, 6)
    normal_data[:, 0] = np.abs(normal_data[:, 0]) * 5 + 1  # Amount: 1-10+ ETH
    normal_data[:, 1] = np.abs(normal_data[:, 1] * 6 + 12) % 24  # Hour
    normal_data[:, 2] = np.abs(normal_data[:, 2] * 3.5 + 3.5) % 7  # Day
    normal_data[:, 3] = (normal_data[:, 3] > 0).astype(float) * 0.2  # 20% new recipients
    normal_data[:, 4] = np.abs(normal_data[:, 4] * 3 + 5)  # TX count
    normal_data[:, 5] = np.abs(normal_data[:, 5] * 3 + 2)  # Avg amount
    
    # Anomalous transactions (extreme values)
    n_anomalies = int(0.1 * n_samples)  # 10% anomalies
    anomaly_data = np.random.randn(n_anomalies, 6) * 3
    anomaly_data[:, 0] = np.abs(anomaly_data[:, 0]) * 50 + 100  # Huge amounts
    anomaly_data[:, 1] = np.random.choice([2, 3, 4, 5], n_anomalies)  # Unusual hours
    anomaly_data[:, 4] = np.abs(anomaly_data[:, 4]) * 20  # Very high frequency
    anomaly_data[:, 3] = 1.0  # All new recipients
    
    # Combine
    X = np.vstack([normal_data, anomaly_data])
    y = np.hstack([np.zeros(n_samples), np.ones(n_anomalies)])
    
    return X, y


def train_model(X, model_path="ml_models", test_size=0.2):
    """
    Train Isolation Forest model
    """
    print(f"\n🤖 Training Isolation Forest fraud detection model...")
    print(f"   Training samples: {len(X)}")
    print(f"   Features: 6 (amount, hour, day, new_recipient, tx_count_24h, avg_amount)")
    
    # Normalize features
    scaler = MinMaxScaler(feature_range=(0, 1))
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=100,
        contamination=0.1,  # 10% expected to be anomalies
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)
    
    print("   ✓ Model training complete")
    
    # Create directory if needed
    os.makedirs(model_path, exist_ok=True)
    
    # Save model and scaler
    model_file = os.path.join(model_path, "fraud_detection_model.pkl")
    scaler_file = os.path.join(model_path, "scaler.pkl")
    
    joblib.dump(model, model_file)
    joblib.dump(scaler, scaler_file)
    
    print(f"   ✓ Model saved to: {model_file}")
    print(f"   ✓ Scaler saved to: {scaler_file}")
    
    return model, scaler


def evaluate_model(model, scaler, X, y):
    """
    Evaluate model performance
    """
    X_scaled = scaler.transform(X)
    predictions = model.predict(X_scaled)
    
    # Convert -1 (anomaly) and 1 (normal) to 0 and 1
    predictions = (predictions == -1).astype(int)
    
    # Calculate metrics
    tp = np.sum((predictions == 1) & (y == 1))
    fp = np.sum((predictions == 1) & (y == 0))
    tn = np.sum((predictions == 0) & (y == 0))
    fn = np.sum((predictions == 0) & (y == 1))
    
    accuracy = (tp + tn) / len(y)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    print(f"\n📊 Model Evaluation:")
    print(f"   Accuracy:  {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall:    {recall:.3f}")
    print(f"   F1-Score:  {f1:.3f}")


if __name__ == "__main__":
    print("=" * 60)
    print("BioVault Fraud Detection Model Training")
    print("=" * 60)
    
    # Generate synthetic data
    X, y = generate_synthetic_data(n_samples=2000)
    print(f"\n📈 Generated {len(X)} synthetic transaction samples")
    
    # Train model
    model, scaler = train_model(X, model_path="ml_models")
    
    # Evaluate
    evaluate_model(model, scaler, X, y)
    
    print("\n" + "=" * 60)
    print("✅ Model training complete!")
    print("=" * 60)
    print("\nYou can now use the model in the fraud detection service.")
    print("Place the .pkl files in backend/ml_models/")
