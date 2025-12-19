"""
Repository for API usage tracking queries.

This module provides database queries for monitoring API usage,
calculating daily quotas, and generating usage statistics.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, and_, desc
from sqlalchemy.sql import case as sql_case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_usage import APIUsage, APIServiceType, APIOperationType


class APIUsageRepository:
    """Repository for API usage data access."""

    @staticmethod
    async def get_user_total_tokens(
        db: AsyncSession,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """
        Get total tokens used by a user within a date range.

        Args:
            db: Database session
            user_id: User ID
            start_date: Start of date range (optional)
            end_date: End of date range (optional)

        Returns:
            Total tokens used
        """
        query = select(func.sum(APIUsage.total_tokens)).where(
            APIUsage.user_id == user_id,
            APIUsage.success == 1
        )

        if start_date:
            query = query.where(APIUsage.created_at >= start_date)
        if end_date:
            query = query.where(APIUsage.created_at <= end_date)

        result = await db.execute(query)
        total = result.scalar()
        return total or 0

    @staticmethod
    async def get_user_today_usage(
        db: AsyncSession,
        user_id: UUID
    ) -> Dict[str, int]:
        """
        Get today's token usage for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with input_tokens, output_tokens, total_tokens, request_count
        """
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        query = select(
            func.sum(APIUsage.input_tokens).label('input_tokens'),
            func.sum(APIUsage.output_tokens).label('output_tokens'),
            func.sum(APIUsage.total_tokens).label('total_tokens'),
            func.count(APIUsage.id).label('request_count')
        ).where(
            APIUsage.user_id == user_id,
            APIUsage.created_at >= today_start,
            APIUsage.success == 1
        )

        result = await db.execute(query)
        row = result.first()

        if not row:
            return {
                'input_tokens': 0,
                'output_tokens': 0,
                'total_tokens': 0,
                'request_count': 0
            }

        return {
            'input_tokens': row.input_tokens or 0,
            'output_tokens': row.output_tokens or 0,
            'total_tokens': row.total_tokens or 0,
            'request_count': row.request_count or 0
        }

    @staticmethod
    async def get_all_users_usage(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get usage statistics for all users.

        Args:
            db: Database session
            start_date: Start of date range (optional)
            end_date: End of date range (optional)
            limit: Maximum number of users to return

        Returns:
            List of user usage statistics
        """
        query = select(
            APIUsage.user_id,
            func.sum(APIUsage.input_tokens).label('input_tokens'),
            func.sum(APIUsage.output_tokens).label('output_tokens'),
            func.sum(APIUsage.total_tokens).label('total_tokens'),
            func.count(APIUsage.id).label('request_count'),
            func.avg(APIUsage.duration_ms).label('avg_duration_ms')
        ).where(
            APIUsage.user_id.isnot(None),
            APIUsage.success == 1
        ).group_by(
            APIUsage.user_id
        ).order_by(
            desc('total_tokens')
        ).limit(limit)

        if start_date:
            query = query.where(APIUsage.created_at >= start_date)
        if end_date:
            query = query.where(APIUsage.created_at <= end_date)

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                'user_id': str(row.user_id),
                'input_tokens': row.input_tokens or 0,
                'output_tokens': row.output_tokens or 0,
                'total_tokens': row.total_tokens or 0,
                'request_count': row.request_count or 0,
                'avg_duration_ms': int(row.avg_duration_ms) if row.avg_duration_ms else 0
            }
            for row in rows
        ]

    @staticmethod
    async def get_daily_usage_summary(
        db: AsyncSession,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get daily usage summary for the past N days.

        Args:
            db: Database session
            days: Number of days to include

        Returns:
            List of daily usage statistics
        """
        from sqlalchemy import cast, Date

        start_date = datetime.utcnow() - timedelta(days=days)

        # Use DATE_TRUNC for PostgreSQL compatibility - truncate to day
        date_col = cast(func.date_trunc('day', APIUsage.created_at), Date)

        query = select(
            date_col.label('date'),
            func.sum(APIUsage.input_tokens).label('input_tokens'),
            func.sum(APIUsage.output_tokens).label('output_tokens'),
            func.sum(APIUsage.total_tokens).label('total_tokens'),
            func.count(APIUsage.id).label('request_count'),
            func.sum(
                sql_case(
                    (APIUsage.success == 0, 1),
                    else_=0
                )
            ).label('failed_requests')
        ).where(
            APIUsage.created_at >= start_date
        ).group_by(
            date_col
        ).order_by(
            desc(date_col)
        )

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                'date': row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                'input_tokens': int(row.input_tokens or 0),
                'output_tokens': int(row.output_tokens or 0),
                'total_tokens': int(row.total_tokens or 0),
                'request_count': int(row.request_count or 0),
                'failed_requests': int(row.failed_requests or 0)
            }
            for row in rows
        ]

    @staticmethod
    async def get_service_breakdown(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get usage breakdown by service and operation type.

        Args:
            db: Database session
            start_date: Start of date range (optional)
            end_date: End of date range (optional)

        Returns:
            List of service/operation usage statistics
        """
        query = select(
            APIUsage.service,
            APIUsage.operation,
            APIUsage.model_name,
            func.sum(APIUsage.total_tokens).label('total_tokens'),
            func.count(APIUsage.id).label('request_count'),
            func.avg(APIUsage.duration_ms).label('avg_duration_ms')
        ).where(
            APIUsage.success == 1
        ).group_by(
            APIUsage.service,
            APIUsage.operation,
            APIUsage.model_name
        ).order_by(
            desc('total_tokens')
        )

        if start_date:
            query = query.where(APIUsage.created_at >= start_date)
        if end_date:
            query = query.where(APIUsage.created_at <= end_date)

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                'service': row.service.value if hasattr(row.service, 'value') else row.service,
                'operation': row.operation.value if hasattr(row.operation, 'value') else row.operation,
                'model_name': row.model_name,
                'total_tokens': row.total_tokens or 0,
                'request_count': row.request_count or 0,
                'avg_duration_ms': int(row.avg_duration_ms) if row.avg_duration_ms else 0
            }
            for row in rows
        ]

    @staticmethod
    async def get_recent_requests(
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        limit: int = 50
    ) -> List[APIUsage]:
        """
        Get recent API requests with details.

        Args:
            db: Database session
            user_id: Filter by user (optional)
            limit: Maximum number of requests to return

        Returns:
            List of APIUsage records
        """
        query = select(APIUsage).order_by(desc(APIUsage.created_at)).limit(limit)

        if user_id:
            query = query.where(APIUsage.user_id == user_id)

        result = await db.execute(query)
        return result.scalars().all()


