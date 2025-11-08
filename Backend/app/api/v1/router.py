from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, clients, invoices


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
