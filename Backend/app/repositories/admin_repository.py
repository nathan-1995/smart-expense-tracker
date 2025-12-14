from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.admin import AdminUserUpdate


class AdminRepository:
    """Repository for admin operations on users."""

    @staticmethod
    async def list_users(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_verified: Optional[bool] = None,
        is_active: Optional[bool] = None,
        is_superuser: Optional[bool] = None,
    ) -> Tuple[List[User], int]:
        """
        List all users with filtering and pagination.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for email, first_name, last_name, business_name
            is_verified: Filter by verification status
            is_active: Filter by active status
            is_superuser: Filter by superuser status

        Returns:
            Tuple of (list of users, total count)
        """
        # Build query with filters
        query = select(User)

        # Search filter
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.business_name.ilike(search_term),
                )
            )

        # Status filters
        if is_verified is not None:
            query = query.filter(User.is_verified == is_verified)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if is_superuser is not None:
            query = query.filter(User.is_superuser == is_superuser)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)

        # Execute query
        result = await db.execute(query)
        users = result.scalars().all()

        return list(users), total

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        Get user by ID (admin version with all details).

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            User object or None if not found
        """
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_user(
        db: AsyncSession, user_id: UUID, user_data: AdminUserUpdate
    ) -> Optional[User]:
        """
        Update user details (admin-level update).

        Args:
            db: Database session
            user_id: User UUID
            user_data: Admin user update data

        Returns:
            Updated User object or None if not found
        """
        user = await AdminRepository.get_user_by_id(db, user_id)
        if not user:
            return None

        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: UUID) -> bool:
        """
        Hard delete a user (admin only).

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            True if deleted, False if not found
        """
        user = await AdminRepository.get_user_by_id(db, user_id)
        if not user:
            return False

        await db.delete(user)
        await db.commit()

        return True

    @staticmethod
    async def unlock_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        Unlock a locked user account.

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            Updated User object or None if not found
        """
        user = await AdminRepository.get_user_by_id(db, user_id)
        if not user:
            return None

        user.failed_login_attempts = 0
        user.locked_until = None
        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def get_statistics(db: AsyncSession) -> dict:
        """
        Get admin dashboard statistics.

        Args:
            db: Database session

        Returns:
            Dictionary with various user statistics
        """
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)

        # Total users
        total_users_query = select(func.count()).select_from(User)
        total_users = (await db.execute(total_users_query)).scalar_one()

        # Verified users
        verified_query = select(func.count()).select_from(User).filter(User.is_verified == True)
        verified_users = (await db.execute(verified_query)).scalar_one()

        # Unverified users
        unverified_users = total_users - verified_users

        # Active users
        active_query = select(func.count()).select_from(User).filter(User.is_active == True)
        active_users = (await db.execute(active_query)).scalar_one()

        # Locked users
        locked_query = select(func.count()).select_from(User).filter(
            and_(User.locked_until.isnot(None), User.locked_until > now)
        )
        locked_users = (await db.execute(locked_query)).scalar_one()

        # Superusers
        superuser_query = select(func.count()).select_from(User).filter(User.is_superuser == True)
        superusers = (await db.execute(superuser_query)).scalar_one()

        # Users created today
        today_query = select(func.count()).select_from(User).filter(User.created_at >= today_start)
        users_today = (await db.execute(today_query)).scalar_one()

        # Users created this week
        week_query = select(func.count()).select_from(User).filter(User.created_at >= week_start)
        users_week = (await db.execute(week_query)).scalar_one()

        # Users created this month
        month_query = select(func.count()).select_from(User).filter(User.created_at >= month_start)
        users_month = (await db.execute(month_query)).scalar_one()

        return {
            "total_users": total_users,
            "verified_users": verified_users,
            "unverified_users": unverified_users,
            "active_users": active_users,
            "locked_users": locked_users,
            "superusers": superusers,
            "users_created_today": users_today,
            "users_created_this_week": users_week,
            "users_created_this_month": users_month,
        }
