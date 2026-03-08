from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_settings import UserSettings
from app.schemas.settings import UserSettingsCreate, UserSettingsUpdate


class SettingsRepository:
    """Repository for UserSettings database operations."""

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: UUID) -> Optional[UserSettings]:
        """
        Get settings for a specific user.

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            UserSettings object or None if not found
        """
        result = await db.execute(
            select(UserSettings).filter(UserSettings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        settings_data: UserSettingsCreate
    ) -> UserSettings:
        """
        Create new settings for a user.

        Args:
            db: Database session
            user_id: User UUID
            settings_data: Settings creation data

        Returns:
            Created UserSettings object
        """
        settings = UserSettings(
            user_id=user_id,
            **settings_data.model_dump(exclude_unset=True)
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        return settings

    @staticmethod
    async def update(
        db: AsyncSession,
        settings: UserSettings,
        settings_data: UserSettingsUpdate
    ) -> UserSettings:
        """
        Update existing user settings.

        Args:
            db: Database session
            settings: Existing UserSettings object
            settings_data: Settings update data

        Returns:
            Updated UserSettings object
        """
        update_data = settings_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)

        await db.commit()
        await db.refresh(settings)
        return settings

    @staticmethod
    async def get_or_create(
        db: AsyncSession,
        user_id: UUID,
        defaults: Optional[UserSettingsCreate] = None
    ) -> UserSettings:
        """
        Get settings for user or create with defaults if not exists.

        Args:
            db: Database session
            user_id: User UUID
            defaults: Default values for creation (optional)

        Returns:
            UserSettings object
        """
        settings = await SettingsRepository.get_by_user_id(db, user_id)
        if settings is None:
            if defaults is None:
                defaults = UserSettingsCreate()
            settings = await SettingsRepository.create(db, user_id, defaults)
        return settings
