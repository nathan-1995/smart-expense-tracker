from fastapi import APIRouter

from app.api.v1.endpoints import auth, users


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
