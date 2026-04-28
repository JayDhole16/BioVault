from web3 import Web3
from eth_account import Account
from ..config import settings


class BlockchainClient:
    """Client for interacting with Hardhat local network"""
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.HARDHAT_RPC_URL))
        self.verify_connection()
    
    def verify_connection(self):
        """Verify connection to blockchain"""
        try:
            is_connected = self.w3.is_connected()
            if is_connected:
                chain_id = self.w3.eth.chain_id
                print(f"✓ Connected to Hardhat (Chain ID: {chain_id})")
            else:
                print("⚠ Not connected to Hardhat")
        except Exception as e:
            print(f"Error connecting to blockchain: {e}")
    
    def get_balance(self, address: str) -> float:
        """Get ETH balance for address"""
        try:
            balance_wei = self.w3.eth.get_balance(address)
            balance_eth = self.w3.from_wei(balance_wei, "ether")
            return float(balance_eth)
        except Exception as e:
            print(f"Error getting balance: {e}")
            return 0.0
    
    def get_transaction_count(self, address: str) -> int:
        """Get transaction count for address"""
        try:
            return self.w3.eth.get_transaction_count(address)
        except Exception as e:
            print(f"Error getting transaction count: {e}")
            return 0
    
    def get_transaction(self, tx_hash: str) -> dict:
        """Get transaction details"""
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            return dict(tx)
        except Exception as e:
            print(f"Error getting transaction: {e}")
            return {}
    
    def create_account(self):
        """Create a new Ethereum account"""
        account = Account.create()
        return account
    
    def send_transaction(self, from_address: str, to_address: str, amount: float, private_key: str) -> str:
        """
        Send ETH transaction
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            amount: Amount in ETH
            private_key: Private key for signing
            
        Returns:
            Transaction hash
        """
        try:
            account = Account.from_key(private_key)
            
            nonce = self.w3.eth.get_transaction_count(from_address)
            
            tx = {
                "from": from_address,
                "to": Web3.to_checksum_address(to_address),
                "value": self.w3.to_wei(amount, "ether"),
                "gas": 21000,
                "gasPrice": self.w3.eth.gas_price,
                "nonce": nonce,
                "chainId": self.w3.eth.chain_id
            }
            
            signed_tx = account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            return tx_hash.hex()
        except Exception as e:
            print(f"Error sending transaction: {e}")
            return ""


# Global instance
blockchain = BlockchainClient()
