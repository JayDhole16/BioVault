from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .config import settings
from .database import Base, engine
from .services.webauthn_service import WebAuthnService

# Import routes
from .api import auth, wallet, transactions, fraud, guardian, recovery


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import models so metadata is registered
    from .models import (  # noqa: F401
        User,
        Wallet,
        Guardian,
        RecoveryRequest,
        RecoveryApproval,
        Transaction,
        FraudLog,
        Device,
        WebAuthnCredential,
        OTPCode,
    )

    Base.metadata.create_all(bind=engine)
    
    # Initialize WebAuthn service with origin from RP_ORIGIN setting
    WebAuthnService.set_origin(settings.RP_ORIGIN or settings.FRONTEND_URL or "http://localhost:3000")
    WebAuthnService.RP_ID = settings.RP_ID
    
    yield


# Create FastAPI instance
app = FastAPI(
    title=settings.APP_NAME,
    description="BioVault - Biometric-Secured Web3 Wallet",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Add trusted host middleware FIRST (so CORS runs first)
# Allow localhost and network IPs
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "10.2.0.2", "0.0.0.0", "*"],
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["auth"])
app.include_router(wallet.router, prefix=settings.API_PREFIX, tags=["wallet"])
app.include_router(transactions.router, prefix=settings.API_PREFIX, tags=["transactions"])
app.include_router(fraud.router, prefix=settings.API_PREFIX, tags=["fraud"])
app.include_router(guardian.router, prefix=settings.API_PREFIX, tags=["guardian"])
app.include_router(recovery.router, prefix=settings.API_PREFIX, tags=["recovery"])


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to BioVault API",
        "docs": "/api/docs",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
