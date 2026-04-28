# BioVault – Biometric-Secured Web3 Wallet with AI Fraud Detection

A production-ready Web3 wallet featuring biometric authentication, blockchain integration, and AI-powered fraud detection. Built with modern technologies for security, scalability, and developer experience.

## Features

- **Biometric Authentication**: Real WebAuthn/FIDO2 fingerprint and face ID verification
- **Social Recovery**: 3-guardian approval system for wallet recovery
- **AI Fraud Detection**: Real-time Isolation Forest-based transaction anomaly detection
- **Multi-Device Support**: OTP-based device verification and management
- **Blockchain Integration**: Ethereum wallet generation & transaction signing on Hardhat network
- **REST API**: FastAPI backend with comprehensive, auto-documented endpoints
- **Modern Frontend**: Next.js React frontend with TypeScript, TailwindCSS, and shadcn/ui
- **Dockerized**: Full Docker Compose setup for one-click deployment

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS, shadcn/ui |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Authentication | JWT, WebAuthn |
| Blockchain | Hardhat, Solidity, ethers.js, web3.py |
| ML | scikit-learn (Isolation Forest) |
| Database | SQLite (development) |
| DevOps | Docker, Docker Compose |

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         Frontend (Next.js React)                │
│         http://localhost:3000                   │
└────────────────────┬────────────────────────────┘
                     │ HTTP/REST API Calls
                     ▼
┌─────────────────────────────────────────────────┐
│       Backend API (FastAPI)                     │
│       http://localhost:8000                     │
├─────────────────────────────────────────────────┤
│ ├─ /api/v1/auth     - Register, Login, OTP     │
│ ├─ /api/v1/wallet   - Balance, Info            │
│ ├─ /api/v1/guardian - Management, Invite       │
│ ├─ /api/v1/recovery - Request, Approve         │
│ ├─ /api/v1/transaction - Simulate, Execute    │
│ └─ /api/v1/fraud    - Detection, Metrics       │
├─────────────────────────────────────────────────┤
│ Services Layer (Business Logic)                │
│ ├─ auth_service.py                              │
│ ├─ guardian_service.py                          │
│ ├─ fraud_service.py                             │
│ ├─ transaction_service.py                       │
│ └─ Web3/Blockchain Integration                  │
├─────────────────────────────────────────────────┤
│ Data Layer (SQLite)                             │
│ ├─ Users, Wallets, Transactions                 │
│ ├─ Guardian Relationships, Recovery Requests   │
│ └─ Device & OTP Management                      │
└─────────────────────────────────────────────────┘
                     │
                     │ Web3 RPC Calls
                     ▼
┌─────────────────────────────────────────────────┐
│   Blockchain (Hardhat Node)                     │
│   http://127.0.0.1:8545                         │
├─────────────────────────────────────────────────┤
│ BioVaultWallet Smart Contract (Solidity)        │
│ ├─ simulateTransaction(to, amount)              │
│ ├─ executeTransaction(to, amount)               │
│ ├─ getBalance(wallet)                           │
│ ├─ getUserTransactions(user)                    │
│ └─ getTransaction(index)                        │
└─────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Nakshtra
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Blockchain RPC: http://localhost:8545

## Environment Variables

### Backend (.env.example)
| Variable | Description | Default |
|----------|-------------|---------|
| APP_NAME | Application name | BioVault API |
| DEBUG | Debug mode | True |
| API_HOST | API host | 0.0.0.0 |
| API_PORT | API port | 8000 |
| API_PREFIX | API prefix | /api/v1 |
| CORS_ORIGINS | Allowed CORS origins | ["http://localhost:3000","http://localhost:8000"] |
| DATABASE_URL | Database connection URL | sqlite:///./data/biovault.db |
| DB_TYPE | Database type | sqlite |
| SECRET_KEY | JWT secret key | your-super-secret-key-change-in-production |
| ALGORITHM | JWT algorithm | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access token expiration | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh token expiration | 7 |
| RP_ID | WebAuthn relying party ID | localhost |
| RP_NAME | WebAuthn relying party name | BioVault |
| RP_ORIGIN | WebAuthn origin | http://localhost:3000 |
| HARDHAT_RPC_URL | Hardhat RPC URL | http://hardhat:8545 |
| NETWORK | Blockchain network | hardhat |
| MODEL_PATH | Fraud model path | /app/ml_models/fraud_detection_model.pkl |
| MODEL_SCALER_PATH | Scaler path | /app/ml_models/scaler.pkl |
| FRAUD_THRESHOLD | Fraud risk threshold | 0.5 |
| HIGH_RISK_THRESHOLD | High risk threshold | 0.7 |

### Frontend (.env.example)
| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:8000 |
| NEXT_PUBLIC_WALLET_NETWORK | Wallet network | hardhat |
| NEXT_PUBLIC_RPC_URL | Blockchain RPC URL | http://localhost:8545 |
| NEXT_PUBLIC_RP_ID | WebAuthn RP ID | localhost |
| NEXT_PUBLIC_RP_NAME | WebAuthn RP name | BioVault |
| NEXT_PUBLIC_ORIGIN | WebAuthn origin | http://localhost:3000 |

## API Endpoints

Full interactive documentation available at http://localhost:8000/docs

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/otp/generate` - Generate OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP

### Wallet
- `GET /api/v1/wallet/{user_id}` - Get wallet info
- `GET /api/v1/wallet/{user_id}/balance` - Get balance

### Guardian (Social Recovery)
- `POST /api/v1/guardian/invite` - Invite guardian
- `GET /api/v1/guardian/{user_id}` - Get guardians list
- `POST /api/v1/guardian/approve` - Approve recovery request

### Recovery
- `POST /api/v1/recovery/request` - Request wallet recovery
- `POST /api/v1/recovery/approve` - Approve recovery request
- `GET /api/v1/recovery/{user_id}/status` - Get recovery status

### Transactions
- `POST /api/v1/transaction/simulate` - Simulate transaction (preview)
- `POST /api/v1/transaction/execute` - Execute transaction
- `GET /api/v1/transaction/history` - Get transaction history

### Fraud Detection
- `GET /api/v1/fraud/check` - Check transaction for fraud
- `GET /api/v1/fraud/metrics` - Get fraud detection metrics

## Project Structure

```
Nakshtra/
├── frontend/                 # Next.js React frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # Reusable React components
│   │   └── lib/             # Utility functions
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies & scripts
│   ├── next.config.ts       # Next.js configuration
│   ├── Dockerfile           # Frontend container image
│   ├── .dockerignore        # Docker ignore rules
│   └── .env.example         # Environment variables template
│
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── config.py        # Configuration from .env
│   │   ├── database.py      # Database setup
│   │   ├── api/             # API route handlers
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── models/          # Database models
│   │   ├── auth/            # Authentication logic (JWT, WebAuthn)
│   │   ├── ml/              # ML fraud detection models
│   │   ├── services/        # Business logic services
│   │   └── blockchain/      # Web3 blockchain client
│   ├── ml_models/           # Trained ML models (.pkl files)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   ├── Dockerfile           # Backend container image
│   ├── .dockerignore        # Docker ignore rules
│   └── train_fraud_model.py # Script to train fraud detection model
│
├── blockchain/              # Hardhat smart contracts & tests
│   ├── contracts/
│   │   └── BioVaultWallet.sol   # Main smart contract
│   ├── scripts/
│   │   └── deploy.js            # Deployment script
│   ├── test/
│   │   └── BioVaultWallet.test.js   # Contract tests
│   ├── hardhat.config.js        # Hardhat configuration
│   ├── package.json             # Dependencies & scripts
│   ├── Dockerfile               # Hardhat container image
│   └── .dockerignore            # Docker ignore rules
│
├── docker-compose.yml       # Multi-container orchestration
├── .dockerignore            # Docker ignore rules (root)
├── .gitignore               # Git ignore rules
├── LICENSE                  # Project license
├── CONTRIBUTING.md          # Contribution guidelines
└── README.md                # This file
```

## Local Development

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Blockchain Setup
```bash
cd blockchain
npm install
npm run node
```

## Production Deployment

1. **Set environment variables** (do not use defaults for production)
2. **Build and start with Docker Compose**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

## Scalability & Performance Highlights

- **Frontend**: Next.js standalone output for optimized production builds
- **Backend**: FastAPI async handling, Docker containerization
- **Database**: SQLite for development, easily swappable for PostgreSQL
- **Blockchain**: Local Hardhat node for development, can connect to testnets/mainnets

## Future Improvements

- [ ] Replace SQLite with PostgreSQL for production
- [ ] Add Redis for caching and session management
- [ ] Implement CI/CD pipeline with GitHub Actions
- [ ] Add monitoring with Prometheus and Grafana
- [ ] Add rate limiting for API endpoints
- [ ] Implement proper key management service
- [ ] Add support for multiple blockchain networks
- [ ] Implement mobile-responsive design improvements
- [ ] Add comprehensive test coverage

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For issues or questions, please open a GitHub issue or check the API documentation at http://localhost:8000/docs
