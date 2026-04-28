// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BioVault Wallet Contract
 * @dev Simple contract for transaction simulation and testing
 * @notice This is a demo contract for hackathon prototype
 */
contract BioVaultWallet {
    
    // Events
    event TransactionSimulated(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event TransactionExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 gasUsed,
        uint256 timestamp
    );
    
    // Transaction history
    struct Transaction {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bool executed;
    }
    
    Transaction[] public transactions;
    
    // Mapping user addresses to their transactions
    mapping(address => uint256[]) public userTransactions;
    
    /**
     * @dev Simulate a transaction (doesn't modify state)
     * @param _to Recipient address
     * @param _amount Amount in wei
     */
    function simulateTransaction(
        address _to,
        uint256 _amount
    ) external returns (uint256 gasEstimate) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Estimate gas (simplified)
        gasEstimate = 21000;
        
        emit TransactionSimulated(msg.sender, _to, _amount, block.timestamp);
        
        return gasEstimate;
    }
    
    /**
     * @dev Execute a transaction
     * @param _to Recipient address
     */
    function executeTransaction(address payable _to) external payable {
        require(_to != address(0), "Invalid recipient");
        require(msg.value > 0, "Amount must be greater than 0");
        
        // Create transaction record
        transactions.push(Transaction({
            from: msg.sender,
            to: _to,
            amount: msg.value,
            timestamp: block.timestamp,
            executed: true
        }));
        
        uint256 txIndex = transactions.length - 1;
        userTransactions[msg.sender].push(txIndex);
        userTransactions[_to].push(txIndex);
        
        // Transfer funds
        (bool success, ) = _to.call{value: msg.value}("");
        require(success, "Transfer failed");
        
        emit TransactionExecuted(
            msg.sender,
            _to,
            msg.value,
            21000,
            block.timestamp
        );
    }
    
    /**
     * @dev Get wallet balance
     * @param _wallet Address to check
     * @return Balance in wei
     */
    function getBalance(address _wallet) external view returns (uint256) {
        return _wallet.balance;
    }
    
    /**
     * @dev Get transaction history for user
     * @param _user User address
     * @return Array of transaction indices
     */
    function getUserTransactions(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userTransactions[_user];
    }
    
    /**
     * @dev Get transaction details
     * @param _index Transaction index
     * @return Transaction details
     */
    function getTransaction(uint256 _index)
        external
        view
        returns (Transaction memory)
    {
        require(_index < transactions.length, "Transaction not found");
        return transactions[_index];
    }
    
    /**
     * @dev Get total transaction count
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
