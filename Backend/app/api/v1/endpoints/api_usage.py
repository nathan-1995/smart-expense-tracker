"""
API endpoints for API usage tracking and statistics.

This module provides admin endpoints for monitoring API usage,
viewing token consumption, and tracking daily quotas.
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.repositories.api_usage_repository import APIUsageRepository
from app.schemas.api_usage import (
    UsageSummaryResponse,
    UserUsageStats,
    DailyUsageResponse,
    DailyUsageStats,
    ServiceBreakdownResponse,
    RecentRequestsResponse,
    UserTodayUsage,
    APIUsageDetail
)


router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin/superuser access.

    Args:
        current_user: Current authenticated user

    Returns:
        User if they are an admin

    Raises:
        403: If user is not an admin
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/summary", response_model=UsageSummaryResponse)
async def get_usage_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Max users to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> UsageSummaryResponse:
    """
    Get overall usage summary with per-user statistics.

    Requires admin access.

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
        limit: Maximum number of users to return
        db: Database session (injected)
        current_user: Current admin user (injected)

    Returns:
        Usage summary with total tokens and per-user breakdown

    Raises:
        401: Not authenticated
        403: Not an admin
    """
    # Parse dates if provided
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )

    # Get all users' usage
    users_usage = await APIUsageRepository.get_all_users_usage(
        db=db,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit
    )

    # Calculate totals
    total_tokens = sum(u['total_tokens'] for u in users_usage)
    total_requests = sum(u['request_count'] for u in users_usage)

    users = [UserUsageStats(**u) for u in users_usage]

    return UsageSummaryResponse(
        total_tokens=total_tokens,
        total_requests=total_requests,
        users=users
    )


@router.get("/daily", response_model=DailyUsageResponse)
async def get_daily_usage(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> DailyUsageResponse:
    """
    Get daily usage trends for the past N days.

    Requires admin access.

    Args:
        days: Number of days to include (default: 30)
        db: Database session (injected)
        current_user: Current admin user (injected)

    Returns:
        Daily usage statistics

    Raises:
        401: Not authenticated
        403: Not an admin
    """
    daily_stats = await APIUsageRepository.get_daily_usage_summary(
        db=db,
        days=days
    )

    # Explicitly convert dictionaries to DailyUsageStats objects
    days_list = [DailyUsageStats(**stat) for stat in daily_stats]

    return DailyUsageResponse(days=days_list)


@router.get("/services", response_model=ServiceBreakdownResponse)
async def get_service_breakdown(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ServiceBreakdownResponse:
    """
    Get usage breakdown by service and operation type.

    Requires admin access.

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
        db: Database session (injected)
        current_user: Current admin user (injected)

    Returns:
        Usage breakdown by service/operation

    Raises:
        401: Not authenticated
        403: Not an admin
    """
    # Parse dates if provided
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )

    services = await APIUsageRepository.get_service_breakdown(
        db=db,
        start_date=start_dt,
        end_date=end_dt
    )

    return ServiceBreakdownResponse(services=services)


@router.get("/recent", response_model=RecentRequestsResponse)
async def get_recent_requests(
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=200, description="Number of requests to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> RecentRequestsResponse:
    """
    Get recent API requests with details.

    Requires admin access.

    Args:
        user_id: Optional user ID filter
        limit: Number of requests to return (default: 50)
        db: Database session (injected)
        current_user: Current admin user (injected)

    Returns:
        Recent API requests

    Raises:
        401: Not authenticated
        403: Not an admin
    """
    requests = await APIUsageRepository.get_recent_requests(
        db=db,
        user_id=user_id,
        limit=limit
    )

    # Convert to response models
    request_details = [
        APIUsageDetail(
            id=req.id,
            service=req.service.value,
            operation=req.operation.value,
            model_name=req.model_name,
            user_id=req.user_id,
            document_id=req.document_id,
            input_tokens=req.input_tokens,
            output_tokens=req.output_tokens,
            total_tokens=req.total_tokens,
            status_code=req.status_code,
            success=bool(req.success),
            error_message=req.error_message,
            duration_ms=req.duration_ms,
            created_at=req.created_at
        )
        for req in requests
    ]

    return RecentRequestsResponse(
        requests=request_details,
        count=len(request_details)
    )


@router.get("/users/{user_id}/today", response_model=UserTodayUsage)
async def get_user_today_usage(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> UserTodayUsage:
    """
    Get today's usage for a specific user.

    Requires admin access.

    Args:
        user_id: User ID
        db: Database session (injected)
        current_user: Current admin user (injected)

    Returns:
        Today's usage statistics for the user

    Raises:
        401: Not authenticated
        403: Not an admin
    """
    usage = await APIUsageRepository.get_user_today_usage(
        db=db,
        user_id=user_id
    )

    return UserTodayUsage(**usage)


@router.get("/me/today", response_model=UserTodayUsage)
async def get_my_today_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserTodayUsage:
    """
    Get today's usage for the current user.

    Any authenticated user can access their own usage.

    Args:
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Today's usage statistics

    Raises:
        401: Not authenticated
    """
    usage = await APIUsageRepository.get_user_today_usage(
        db=db,
        user_id=current_user.id
    )

    return UserTodayUsage(**usage)
