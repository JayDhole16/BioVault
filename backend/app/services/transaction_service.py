"""
Transaction service
"""
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import Transaction


def simulate_transaction(
    db: Session,
    user_id: int,
    from_address: str,
    to_address: str,
    amount: float,
) -> Transaction:
    """
    Simulate a transaction (preview before execution)
    """
    transaction = Transaction(
        user_id=user_id,
        from_address=from_address,
        to_address=to_address,
        amount=amount,
        status="simulated",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def create_transaction(
    db: Session,
    user_id: int,
    from_address: str,
    to_address: str,
    amount: float,
    gas_fee: float = 0.0,
) -> Transaction:
    """
    Create a transaction record
    """
    transaction = Transaction(
        user_id=user_id,
        from_address=from_address,
        to_address=to_address,
        amount=amount,
        gas_fee=gas_fee,
        status="pending",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction_status(
    db: Session,
    transaction_id: int,
    status: str,
    transaction_hash: str = None,
) -> Transaction:
    """
    Update transaction status
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise ValueError("Transaction not found")
    
    transaction.status = status
    if transaction_hash:
        transaction.transaction_hash = transaction_hash
    if status == "confirmed":
        transaction.executed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(transaction)
    return transaction


def get_user_transactions(
    db: Session,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> list[Transaction]:
    """
    Get user's transaction history
    """
    return db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(limit).offset(offset).all()


def get_transaction(db: Session, transaction_id: int) -> Transaction:
    """
    Get transaction by ID
    """
    return db.query(Transaction).filter(
        Transaction.id == transaction_id
    ).first()
