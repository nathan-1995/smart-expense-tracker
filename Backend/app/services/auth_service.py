from datetime import datetime
from typing import Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.token import Token, TokenPayload
from app.repositories.user_repository import UserRepository
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from app.core.email import EmailService
from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    EmailAlreadyExistsError,
    InvalidTokenError,
    InactiveUserError,
    UserNotFoundError,
    InvalidRefreshTokenError,
)


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
        """
        Register a new user and send verification email.

        Args:
            db: Database session
            user_data: User registration data

        Returns:
            Created User object

        Raises:
            EmailAlreadyExistsError: If email already exists
        """
        # Check if email already exists
        existing_user = await UserRepository.get_by_email(db, user_data.email)
        if existing_user:
            raise EmailAlreadyExistsError()

        # Create user
        user = await UserRepository.create(db, user_data)

        # Generate verification token
        token = EmailService.generate_verification_token()
        expires_at = EmailService.get_verification_token_expiry()

        # Store verification token
        await UserRepository.set_verification_token(db, user.id, token, expires_at)

        # Send verification email
        EmailService.send_verification_email(
            to_email=user.email,
            first_name=user.first_name or "there",
            verification_token=token,
            frontend_url=settings.FRONTEND_URL
        )

        return user

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
        """
        Authenticate user with email and password.

        Args:
            db: Database session
            email: User email
            password: Plain text password

        Returns:
            Authenticated User object

        Raises:
            InvalidCredentialsError: If credentials are invalid
            AccountLockedError: If account is locked
            InactiveUserError: If account is inactive
        """
        # Get user by email
        user = await UserRepository.get_by_email(db, email)

        # Check if user exists
        if not user:
            raise InvalidCredentialsError()

        # Check if account is locked
        if user.is_locked:
            raise AccountLockedError(
                detail=f"Account is locked until {user.locked_until.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )

        # Check if account is active
        if not user.is_active:
            raise InactiveUserError()

        # Verify password
        if not verify_password(password, user.password_hash):
            # Increment failed attempts
            await UserRepository.increment_failed_attempts(db, user.id)
            raise InvalidCredentialsError()

        # Reset failed attempts on successful login
        await UserRepository.reset_failed_attempts(db, user.id)

        # Update last login
        await UserRepository.update_last_login(db, user.id)

        return user

    @staticmethod
    def create_tokens(user: User) -> Token:
        """
        Create access and refresh tokens for user.

        Args:
            user: User object

        Returns:
            Token object with access_token and refresh_token
        """
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    @staticmethod
    async def verify_access_token(db: AsyncSession, token: str) -> User:
        """
        Verify access token and return user.

        Args:
            db: Database session
            token: JWT access token

        Returns:
            User object

        Raises:
            InvalidTokenError: If token is invalid or expired
            UserNotFoundError: If user not found
            InactiveUserError: If user is inactive
        """
        try:
            # Decode and verify token type
            payload = verify_token_type(token, "access")

            # Extract user ID from token
            user_id_str: str = payload.get("sub")
            if user_id_str is None:
                raise InvalidTokenError()

            user_id = UUID(user_id_str)

        except (JWTError, ValueError):
            raise InvalidTokenError()

        # Get user from database
        user = await UserRepository.get_by_id(db, user_id)
        if user is None:
            raise UserNotFoundError()

        # Check if user is active
        if not user.is_active:
            raise InactiveUserError()

        return user

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> str:
        """
        Create new access token using refresh token.

        Args:
            db: Database session
            refresh_token: JWT refresh token

        Returns:
            New access token string

        Raises:
            InvalidRefreshTokenError: If refresh token is invalid
            UserNotFoundError: If user not found
            InactiveUserError: If user is inactive
        """
        try:
            # Decode and verify token type
            payload = verify_token_type(refresh_token, "refresh")

            # Extract user ID from token
            user_id_str: str = payload.get("sub")
            if user_id_str is None:
                raise InvalidRefreshTokenError()

            user_id = UUID(user_id_str)

        except (JWTError, ValueError):
            raise InvalidRefreshTokenError()

        # Get user from database
        user = await UserRepository.get_by_id(db, user_id)
        if user is None:
            raise UserNotFoundError()

        # Check if user is active
        if not user.is_active:
            raise InactiveUserError()

        # Create new access token
        access_token = create_access_token(data={"sub": str(user.id)})

        return access_token

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user_id: UUID,
        current_password: str,
        new_password: str
    ) -> User:
        """
        Change user password.

        Args:
            db: Database session
            user_id: User UUID
            current_password: Current plain text password
            new_password: New plain text password

        Returns:
            Updated User object

        Raises:
            UserNotFoundError: If user not found
            InvalidCredentialsError: If current password is incorrect
        """
        # Get user
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundError()

        # Verify current password
        if not verify_password(current_password, user.password_hash):
            raise InvalidCredentialsError(detail="Current password is incorrect")

        # Change password
        updated_user = await UserRepository.change_password(db, user_id, new_password)

        return updated_user

    @staticmethod
    async def verify_email(db: AsyncSession, token: str) -> User:
        """
        Verify user's email using verification token.

        Args:
            db: Database session
            token: Verification token

        Returns:
            Verified User object

        Raises:
            InvalidTokenError: If token is invalid or expired
            UserNotFoundError: If user not found
        """
        # Get user by token
        user = await UserRepository.get_by_verification_token(db, token)
        if not user:
            raise InvalidTokenError(detail="Invalid verification token")

        # Check if already verified
        if user.is_verified:
            raise InvalidTokenError(detail="Email already verified")

        # Check if token expired
        if user.verification_token_expires_at and user.verification_token_expires_at < datetime.utcnow():
            raise InvalidTokenError(detail="Verification token has expired")

        # Mark email as verified
        verified_user = await UserRepository.verify_email(db, user.id)

        return verified_user

    @staticmethod
    async def resend_verification_email(db: AsyncSession, email: str) -> bool:
        """
        Resend verification email to user.

        Args:
            db: Database session
            email: User's email address

        Returns:
            bool: True if email sent successfully

        Raises:
            UserNotFoundError: If user not found
            InvalidTokenError: If user already verified
        """
        # Get user by email
        user = await UserRepository.get_by_email(db, email)
        if not user:
            raise UserNotFoundError()

        # Check if already verified
        if user.is_verified:
            raise InvalidTokenError(detail="Email already verified")

        # Generate new verification token
        token = EmailService.generate_verification_token()
        expires_at = EmailService.get_verification_token_expiry()

        # Update verification token
        await UserRepository.set_verification_token(db, user.id, token, expires_at)

        # Send verification email
        success = EmailService.send_verification_email(
            to_email=user.email,
            first_name=user.first_name or "there",
            verification_token=token,
            frontend_url=settings.FRONTEND_URL
        )

        return success
