from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, clients, invoices, admin, banners, documents, transactions, bank_accounts, api_usage, websocket


# Create main API v1 router
api_router = APIRouter()

# Include auth endpoints
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# Include user endpoints
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

# Include client endpoints
api_router.include_router(
    clients.router,
    prefix="/clients",
    tags=["Clients"]
)

# Include invoice endpoints
api_router.include_router(
    invoices.router,
    prefix="/invoices",
    tags=["Invoices"]
)

# Include admin endpoints
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"]
)

# Include system banner endpoints
api_router.include_router(
    banners.router,
    prefix="/banners",
    tags=["System Banners"]
)

# Include document endpoints
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["Documents"]
)

# Include transaction endpoints
api_router.include_router(
    transactions.router,
    prefix="/transactions",
    tags=["Transactions"]
)

# Include bank account endpoints
api_router.include_router(
    bank_accounts.router,
    prefix="/bank-accounts",
    tags=["Bank Accounts"]
)

# Include API usage endpoints
api_router.include_router(
    api_usage.router,
    prefix="/api-usage",
    tags=["API Usage"]
)

# Include WebSocket endpoint (no prefix, just /ws)
api_router.include_router(
    websocket.router,
    tags=["WebSocket"]
)
