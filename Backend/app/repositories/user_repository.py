from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password
from app.core.config import settings


class UserRepository:
    """Repository for User database operations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        Get user by ID.

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            User object or None if not found
        """
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """
        Get user by email.

        Args:
            db: Database session
            email: User email (case-insensitive)

        Returns:
            User object or None if not found
        """
        result = await db.execute(select(User).filter(User.email == email.lower()))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            db: Database session
            user_data: User creation data

        Returns:
            Created User object
        """
        hashed_password = hash_password(user_data.password)

        user = User(
            email=user_data.email.lower(),
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=True,
            is_verified=False,
            is_superuser=False,
            failed_login_attempts=0,
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def update(db: AsyncSession, user_id: UUID, user_data: UserUpdate) -> Optional[User]:
        """
        Update user profile.

        Args:
            db: Database session
            user_id: User UUID
            user_data: User update data

        Returns:
            Updated User object or None if not found
        """
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        update_data = user_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def update_last_login(db: AsyncSession, user_id: UUID) -> None:
        """
        Update user's last login timestamp.

        Args:
            db: Database session
            user_id: User UUID
        """
        user = await UserRepository.get_by_id(db, user_id)
        if user:
            user.last_login_at = datetime.utcnow()
            await db.commit()

    @staticmethod
    async def increment_failed_attempts(db: AsyncSession, user_id: UUID) -> None:
        """
        Increment failed login attempts counter.

        Args:
            db: Database session
            user_id: User UUID
        """
        user = await UserRepository.get_by_id(db, user_id)
        if user:
            user.failed_login_attempts += 1

            # Lock account if max attempts reached
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(
                    minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES
                )

            await db.commit()

    @staticmethod
    async def reset_failed_attempts(db: AsyncSession, user_id: UUID) -> None:
        """
        Reset failed login attempts counter and unlock account.

        Args:
            db: Database session
            user_id: User UUID
        """
        user = await UserRepository.get_by_id(db, user_id)
        if user:
            user.failed_login_attempts = 0
            user.locked_until = None
            await db.commit()

    @staticmethod
    async def lock_account(db: AsyncSession, user_id: UUID, duration_minutes: int) -> None:
        """
        Lock user account for specified duration.

        Args:
            db: Database session
            user_id: User UUID
            duration_minutes: Duration in minutes
        """
        user = await UserRepository.get_by_id(db, user_id)
        if user:
            user.locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
            await db.commit()

    @staticmethod
    async def change_password(db: AsyncSession, user_id: UUID, new_password: str) -> Optional[User]:
        """
        Change user password.

        Args:
            db: Database session
            user_id: User UUID
            new_password: New plain text password

        Returns:
            Updated User object or None if not found
        """
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def deactivate(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        Deactivate user account (soft delete).

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            Updated User object or None if not found
        """
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        user.is_active = False
        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        return user
