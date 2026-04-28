from datetime import datetime

from eth_account import Account
from eth_keys import keys
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.jwt import verify_token
from ..blockchain.client import blockchain
from ..database import get_db
from ..models import User, Wallet
from ..schemas import wallet as wallet_schemas

router = APIRouter()


def _generate_wallet_for_user(db: Session, user_id: int) -> Wallet:
    db.query(Wallet).filter(Wallet.user_id == user_id).delete()
    account = Account.create()
    priv = keys.PrivateKey(account.key)
    public_key_hex = priv.public_key.to_hex()
    wallet = Wallet(
        user_id=user_id,
        address=account.address,
        public_key=public_key_hex,
        network="hardhat",
        created_at=datetime.utcnow(),
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


@router.post("/wallet/create", response_model=wallet_schemas.WalletResponse)
@router.post("/wallet/generate", response_model=wallet_schemas.WalletResponse)
async def create_or_generate_wallet(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    wallet = _generate_wallet_for_user(db, user.id)
    return wallet_schemas.WalletResponse(
        address=wallet.address,
        public_key=wallet.public_key,
        created_at=wallet.created_at.isoformat() if wallet.created_at else "",
        network=wallet.network,
    )


@router.get("/wallet/balance")
async def get_wallet_balance(
    wallet_address: str,
    db: Session = Depends(get_db),
):
    balance = blockchain.get_balance(wallet_address)
    return {
        "address": wallet_address,
        "balance": balance,
        "currency": "ETH",
    }


@router.get("/wallet/info")
async def get_wallet_info(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == int(user_id)).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No wallet for user")

    balance = blockchain.get_balance(wallet.address)
    tx_count = blockchain.get_transaction_count(wallet.address)
    return {
        "address": wallet.address,
        "public_key": wallet.public_key,
        "balance": balance,
        "transaction_count": tx_count,
        "network": wallet.network,
        "created_at": wallet.created_at.isoformat() if wallet.created_at else "",
    }


@router.get("/wallet/transactions")
async def get_wallet_transactions(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return {
        "total": 0,
        "transactions": [],
    }


@router.post("/wallet/faucet")
async def request_faucet(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Request 10 ETH from faucet for testing (Hardhat only).
    Uses the Hardhat default account (index 0) to send funds.
    """
    # Get user's wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == int(user_id)).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No wallet for user")
    
    # Only allow faucet on hardhat network
    if wallet.network != "hardhat":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faucet only available on hardhat network, your network: {wallet.network}"
        )
    
    try:
        # Hardhat account 0 (unlocked by default)
        hardhat_account_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        private_key_account_0 = "0xac0974bec39a17e36ba88a6c6a0a38b650e3291b5349b9e11eab8976c2f3b147"
        
        # Send 10 ETH to user's wallet
        tx_hash = blockchain.send_transaction(
            from_address=hardhat_account_0,
            to_address=wallet.address,
            amount=10.0,  # 10 ETH
            private_key=private_key_account_0,
        )
        
        if not tx_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send faucet transaction"
            )
        
        return {
            "status": "success",
            "message": "10 ETH sent to your wallet",
            "transaction_hash": tx_hash,
            "amount": "10 ETH",
            "to_address": wallet.address,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Faucet error: {str(e)}"
        )
