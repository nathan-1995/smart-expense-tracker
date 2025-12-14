from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import AuthService
from app.core.exceptions import InvalidTokenError, InactiveUserError


# HTTP Bearer token scheme for Swagger UI
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that yields a database session.

    Automatically handles session cleanup and rollback on errors.

    Usage:
        @app.get("/items")
        async def read_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        Current authenticated User object

    Raises:
        HTTPException: 401 if token is invalid or user not found
        HTTPException: 403 if user is inactive

    Usage:
        @app.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    token = credentials.credentials

    try:
        user = await AuthService.verify_access_token(db, token)
        return user
    except (InvalidTokenError, InactiveUserError) as e:
        raise e


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user.

    This adds an extra check on top of get_current_user to ensure user is active.
    (get_current_user already checks this, so this is mostly for clarity)

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        Current active User object

    Raises:
        HTTPException: 403 if user is inactive

    Usage:
        @app.get("/protected")
        async def protected_route(user: User = Depends(get_current_active_user)):
            return {"user_id": user.id}
    """
    if not current_user.is_active:
        raise InactiveUserError()

    return current_user


async def get_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current verified user.

    Ensures the user has verified their email address before allowing
    access to critical operations (creating invoices, clients, etc.).

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        Current verified User object

    Raises:
        HTTPException: 403 if user's email is not verified

    Usage:
        @app.post("/invoices")
        async def create_invoice(user: User = Depends(get_verified_user)):
            return {"user_id": user.id}
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this feature. Check your inbox for the verification link.",
        )

    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current admin user.

    Ensures the user has admin (superuser) privileges before allowing
    access to admin-only operations.

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        Current admin User object

    Raises:
        HTTPException: 403 if user is not a superuser

    Usage:
        @app.get("/admin/users")
        async def list_all_users(admin: User = Depends(get_admin_user)):
            return {"admin_id": admin.id}
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. You do not have permission to access this resource.",
        )

    return current_user
