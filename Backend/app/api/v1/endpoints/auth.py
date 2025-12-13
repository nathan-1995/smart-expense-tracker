from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.schemas.token import Token, RefreshTokenRequest, RefreshTokenResponse
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Register a new user.

    Creates a new user account with email and password.

    Args:
        user_data: User registration data (email, password, first_name, last_name)
        db: Database session (injected)

    Returns:
        Created user data (without password)

    Raises:
        400: Email already registered
        422: Validation error (invalid email, weak password, etc.)

    Example:
        POST /api/v1/auth/register
        {
            "email": "user@example.com",
            "password": "SecurePass123",
            "first_name": "John",
            "last_name": "Doe"
        }
    """
    user = await AuthService.register_user(db, user_data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    Login with email and password.

    Authenticates user and returns JWT access and refresh tokens.

    Args:
        credentials: Login credentials (email, password)
        db: Database session (injected)

    Returns:
        JWT tokens (access_token, refresh_token)

    Raises:
        401: Invalid credentials
        403: Account locked or inactive

    Example:
        POST /api/v1/auth/login
        {
            "email": "user@example.com",
            "password": "SecurePass123"
        }

        Response:
        {
            "access_token": "eyJhbGc...",
            "refresh_token": "eyJhbGc...",
            "token_type": "bearer"
        }
    """
    user = await AuthService.authenticate_user(db, credentials.email, credentials.password)
    tokens = AuthService.create_tokens(user)
    return tokens


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> RefreshTokenResponse:
    """
    Refresh access token using refresh token.

    Creates a new access token when the current one expires.

    Args:
        request: Refresh token request
        db: Database session (injected)

    Returns:
        New access token

    Raises:
        401: Invalid or expired refresh token
        403: User inactive
        404: User not found

    Example:
        POST /api/v1/auth/refresh
        {
            "refresh_token": "eyJhbGc..."
        }

        Response:
        {
            "access_token": "eyJhbGc...",
            "token_type": "bearer"
        }
    """
    access_token = await AuthService.refresh_access_token(db, request.refresh_token)
    return RefreshTokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout() -> dict:
    """
    Logout user.

    Since we use stateless JWT tokens, logout is handled client-side
    by discarding the tokens. This endpoint is provided for consistency
    and future token blacklist implementation.

    Returns:
        Success message

    Example:
        POST /api/v1/auth/logout
        Authorization: Bearer <access_token>

        Response:
        {
            "message": "Successfully logged out"
        }
    """
    return {"message": "Successfully logged out"}


@router.post("/verify-email", response_model=UserResponse)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Verify user's email address using verification token.

    Args:
        token: Email verification token (from email link)
        db: Database session (injected)

    Returns:
        Verified user data

    Raises:
        400: Invalid or expired token
        404: User not found

    Example:
        POST /api/v1/auth/verify-email?token=abc123...

        Response:
        {
            "id": "uuid",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "is_verified": true
        }
    """
    user = await AuthService.verify_email(db, token)
    return UserResponse.model_validate(user)


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    email: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Resend verification email to user.

    Args:
        email: User's email address
        db: Database session (injected)

    Returns:
        Success message

    Raises:
        400: Email already verified
        404: User not found

    Example:
        POST /api/v1/auth/resend-verification?email=user@example.com

        Response:
        {
            "message": "Verification email sent successfully"
        }
    """
    success = await AuthService.resend_verification_email(db, email)
    if success:
        return {"message": "Verification email sent successfully"}
    else:
        return {"message": "Failed to send verification email", "success": False}
