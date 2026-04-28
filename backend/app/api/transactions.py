from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.jwt import verify_token
from ..blockchain.client import blockchain
from ..database import get_db
from ..models import Wallet
from ..schemas import transaction as txn_schemas
from ..services import transaction_service, fraud_service

router = APIRouter()


# Public test endpoint for CORS debugging
@router.get("/transaction/test")
async def test_transaction():
    """
    Public endpoint to test CORS is working (no auth required).
    Can be called from frontend to verify backend is responding.
    """
    return {
        "status": "ok",
        "message": "If you see this, CORS is working!",
        "endpoint": "/api/v1/transaction/test",
    }


def _simulate_transaction_result(transaction_data: txn_schemas.TransactionSimulate) -> dict:
    """Calculate gas estimate using Hardhat when available"""
    w3 = blockchain.w3
    
    try:
        from_addr = w3.to_checksum_address(transaction_data.from_address)
        to_addr = w3.to_checksum_address(transaction_data.to_address)
        value_wei = w3.to_wei(transaction_data.amount, "ether")
        
        tx = {"from": from_addr, "to": to_addr, "value": value_wei}
        gas = w3.eth.estimate_gas(tx)
    except Exception:
        gas = 21000
    
    try:
        gas_price = w3.eth.gas_price
    except Exception:
        gas_price = w3.to_wei(20, "gwei")  # Default gas price
    
    gas_fee_eth = float(w3.from_wei(gas * gas_price, "ether"))
    total = transaction_data.amount + gas_fee_eth
    
    return {
        "from_address": transaction_data.from_address,
        "to_address": transaction_data.to_address,
        "amount": transaction_data.amount,
        "gas_fee": round(gas_fee_eth, 8),
        "total": round(total, 8),
        "estimated_time": "~15 seconds",
        "gas_units": gas,
        "network": "hardhat",
    }


@router.post("/transaction/simulate")
async def simulate_transaction(
    request: txn_schemas.TransactionSimulate,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Simulate a transaction with gas estimate and fraud risk analysis.
    
    Returns:
    - Transaction preview with gas fee
    - Fraud risk score and recommendation
    - Security warnings
    """
    # Get user's wallet
    wallet = db.query(Wallet).filter(
        Wallet.user_id == int(user_id),
        Wallet.address == request.from_address,
    ).first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Simulate transaction locally
    try:
        if blockchain.w3.is_connected():
            sim_result = _simulate_transaction_result(request)
            gas_fee = sim_result["gas_fee"]
        else:
            gas_fee = 0.01
            sim_result = {
                "from_address": request.from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "gas_fee": gas_fee,
                "total": request.amount + gas_fee,
                "estimated_time": "~15 seconds",
                "warning": "Blockchain RPC unreachable; using placeholder estimates",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
    
    # Store simulation in database
    tx = transaction_service.simulate_transaction(
        db,
        int(user_id),
        request.from_address,
        request.to_address,
        request.amount,
    )
    
    # Perform fraud analysis
    fraud_result = fraud_service.analyze_fraud_risk(
        db,
        int(user_id),
        request.from_address,
        request.to_address,
        request.amount,
    )
    
    # Log fraud analysis
    fraud_service.log_fraud_analysis(
        db,
        tx.id,
        int(user_id),
        fraud_result["risk_score"],
        fraud_result["risk_level"],
        fraud_result["recommendation"],
        fraud_result["factors"],
    )
    
    return {
        "transaction_id": tx.id,
        "preview": sim_result,
        "fraud_analysis": fraud_result,
        "warnings": _get_security_warnings(fraud_result),
    }


def _get_security_warnings(fraud_result: dict) -> list[str]:
    """Generate human-readable security warnings"""
    warnings = []
    
    if fraud_result["risk_level"] == "HIGH":
        warnings.append("⚠️ HIGH RISK TRANSACTION - Review carefully")
    elif fraud_result["risk_level"] == "MEDIUM":
        warnings.append("⚠️ MEDIUM RISK - Some unusual patterns detected")
    
    factors = fraud_result.get("factors", {})
    if factors.get("new_recipient"):
        warnings.append("🆕 New recipient address")
    if factors.get("unusual_amount"):
        warnings.append("💰 Unusual transaction amount")
    if factors.get("high_frequency"):
        warnings.append("⚡ High transaction frequency")
    if factors.get("unusual_time"):
        warnings.append("🕐 Transaction at unusual time")
    
    return warnings


@router.post("/transaction/execute")
async def execute_transaction(
    request: txn_schemas.TransactionExecute,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Execute a transaction on the Hardhat network.
    
    IMPORTANT: This is a demo endpoint. In production, never accept private keys!
    Use hardware wallet signing or key management services.
    """
    # Verify wallet ownership
    wallet = db.query(Wallet).filter(
        Wallet.user_id == int(user_id),
        Wallet.address == request.from_address,
    ).first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Check fraud recommendation
    fraud_result = fraud_service.analyze_fraud_risk(
        db,
        int(user_id),
        request.from_address,
        request.to_address,
        request.amount,
    )
    
    if fraud_result["recommendation"] == "BLOCK":
        raise HTTPException(
            status_code=403,
            detail=f"Transaction blocked due to fraud risk: {fraud_result['risk_level']}"
        )
    
    # Create transaction record
    tx = transaction_service.create_transaction(
        db,
        int(user_id),
        request.from_address,
        request.to_address,
        request.amount,
        request.gas_fee or 0.01,
    )

    # In production: Sign and send via blockchain
    # For hackathon: Just return transaction ID
    return {
        "transaction_id": tx.id,
        "status": "pending",
        "from": request.from_address,
        "to": request.to_address,
        "amount": request.amount,
        "created_at": tx.created_at.isoformat(),
        "message": "Transaction submitted (hackathon demo mode)",
    }


@router.get("/transaction/history")
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get user's transaction history with fraud analysis.
    """
    transactions = transaction_service.get_user_transactions(
        db,
        int(user_id),
        limit=limit,
        offset=offset,
    )
    
    result = []
    for tx in transactions:
        fraud_log = tx.fraud_log if hasattr(tx, 'fraud_log') and tx.fraud_log else None
        result.append({
            "id": tx.id,
            "from": tx.from_address,
            "to": tx.to_address,
            "amount": tx.amount,
            "status": tx.status,
            "gas_fee": tx.gas_fee,
            "created_at": tx.created_at.isoformat() if tx.created_at else "",
            "fraud_analysis": {
                "risk_score": fraud_log.risk_score if fraud_log else None,
                "risk_level": fraud_log.risk_level if fraud_log else None,
                "recommendation": fraud_log.recommendation if fraud_log else None,
            } if fraud_log else None,
        })
    
    return {"total": len(transactions), "transactions": result}


@router.get("/transaction/{transaction_id}")
async def get_transaction_details(
    transaction_id: int,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get details of a specific transaction.
    """
    tx = transaction_service.get_transaction(db, transaction_id)
    
    if not tx or tx.user_id != int(user_id):
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    fraud_log = tx.fraud_log if hasattr(tx, 'fraud_log') and tx.fraud_log else None
    
    return {
        "id": tx.id,
        "from": tx.from_address,
        "to": tx.to_address,
        "amount": tx.amount,
        "status": tx.status,
        "hash": tx.transaction_hash,
        "gas_fee": tx.gas_fee,
        "created_at": tx.created_at.isoformat() if tx.created_at else "",
        "executed_at": tx.executed_at.isoformat() if tx.executed_at else None,
        "fraud_analysis": {
            "risk_score": fraud_log.risk_score if fraud_log else None,
            "risk_level": fraud_log.risk_level if fraud_log else None,
            "recommendation": fraud_log.recommendation if fraud_log else None,
        } if fraud_log else None,
    }


@router.post("/transactions/execute")
async def execute_transaction(
    transaction: txn_schemas.TransactionExecute,
    db: Session = Depends(get_db),
):
    return {
        "transaction_hash": "",
        "status": "pending",
        "created_at": "",
    }


@router.get("/transactions/{tx_hash}")
async def get_transaction(
    tx_hash: str,
    db: Session = Depends(get_db),
):
    return {
        "hash": tx_hash,
        "status": "confirmed",
        "from": "",
        "to": "",
        "amount": 0.0,
        "gas_fee": 0.0,
        "block_number": 0,
        "timestamp": "",
    }


@router.post("/transactions/{tx_hash}/confirm")
async def confirm_transaction(
    tx_hash: str,
    db: Session = Depends(get_db),
):
    return {
        "message": "Transaction confirmed",
        "transaction_hash": tx_hash,
    }
