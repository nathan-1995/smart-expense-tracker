from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_banner import SystemBanner
from app.schemas.system_banner import SystemBannerCreate, SystemBannerUpdate


class SystemBannerRepository:
    """Repository for SystemBanner database operations."""

    @staticmethod
    async def create(db: AsyncSession, banner_data: SystemBannerCreate) -> SystemBanner:
        """
        Create a new system banner.

        Args:
            db: Database session
            banner_data: Banner creation data

        Returns:
            Created SystemBanner object
        """
        banner = SystemBanner(**banner_data.model_dump())

        db.add(banner)
        await db.commit()
        await db.refresh(banner)

        return banner

    @staticmethod
    async def get_by_id(db: AsyncSession, banner_id: UUID) -> Optional[SystemBanner]:
        """
        Get banner by ID.

        Args:
            db: Database session
            banner_id: Banner UUID

        Returns:
            SystemBanner object or None if not found
        """
        result = await db.execute(select(SystemBanner).filter(SystemBanner.id == banner_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
    ) -> Tuple[List[SystemBanner], int]:
        """
        List all banners with pagination.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            active_only: Only return active banners

        Returns:
            Tuple of (list of banners, total count)
        """
        query = select(SystemBanner)

        if active_only:
            query = query.filter(SystemBanner.is_active == True)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering (newest first)
        query = query.order_by(SystemBanner.created_at.desc()).offset(skip).limit(limit)

        # Execute query
        result = await db.execute(query)
        banners = result.scalars().all()

        return list(banners), total

    @staticmethod
    async def get_active_banners(
        db: AsyncSession, is_user_verified: bool
    ) -> List[SystemBanner]:
        """
        Get active banners for display to user.

        Args:
            db: Database session
            is_user_verified: Whether the current user has verified their email

        Returns:
            List of active banners applicable to the user
        """
        query = select(SystemBanner).filter(SystemBanner.is_active == True)

        # If user is verified, exclude banners that are only for unverified users
        if is_user_verified:
            query = query.filter(SystemBanner.show_to_unverified_only == False)

        # Order by creation date (newest first)
        query = query.order_by(SystemBanner.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession, banner_id: UUID, banner_data: SystemBannerUpdate
    ) -> Optional[SystemBanner]:
        """
        Update a banner.

        Args:
            db: Database session
            banner_id: Banner UUID
            banner_data: Banner update data

        Returns:
            Updated SystemBanner object or None if not found
        """
        banner = await SystemBannerRepository.get_by_id(db, banner_id)
        if not banner:
            return None

        # Update fields
        update_data = banner_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(banner, field, value)

        banner.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(banner)

        return banner

    @staticmethod
    async def delete(db: AsyncSession, banner_id: UUID) -> bool:
        """
        Delete a banner.

        Args:
            db: Database session
            banner_id: Banner UUID

        Returns:
            True if deleted, False if not found
        """
        banner = await SystemBannerRepository.get_by_id(db, banner_id)
        if not banner:
            return False

        await db.delete(banner)
        await db.commit()

        return True

    @staticmethod
    async def deactivate(db: AsyncSession, banner_id: UUID) -> Optional[SystemBanner]:
        """
        Deactivate a banner (soft delete).

        Args:
            db: Database session
            banner_id: Banner UUID

        Returns:
            Updated SystemBanner object or None if not found
        """
        banner = await SystemBannerRepository.get_by_id(db, banner_id)
        if not banner:
            return None

        banner.is_active = False
        banner.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(banner)

        return banner

    @staticmethod
    async def get_active_count(db: AsyncSession) -> int:
        """
        Get count of active banners.

        Args:
            db: Database session

        Returns:
            Count of active banners
        """
        query = select(func.count()).select_from(SystemBanner).filter(
            SystemBanner.is_active == True
        )
        result = await db.execute(query)
        return result.scalar_one()
