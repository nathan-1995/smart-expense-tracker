from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_admin_user
from app.models.user import User
from app.schemas.admin import (
    AdminUserResponse,
    AdminUserUpdate,
    AdminUserListResponse,
    AdminStatistics,
)
from app.repositories.admin_repository import AdminRepository
from app.repositories.system_banner_repository import SystemBannerRepository


router = APIRouter()


@router.get("/statistics", response_model=AdminStatistics)
async def get_admin_statistics(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> AdminStatistics:
    """
    Get admin dashboard statistics.

    Returns comprehensive statistics about users and system status.

    Args:
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Admin statistics including user counts, verification status, etc.

    Requires:
        Admin (superuser) access

    Example:
        GET /api/v1/admin/statistics
        Authorization: Bearer <admin_access_token>

        Response:
        {
            "total_users": 150,
            "verified_users": 120,
            "unverified_users": 30,
            "active_users": 145,
            "locked_users": 2,
            "superusers": 3,
            "users_created_today": 5,
            "users_created_this_week": 25,
            "users_created_this_month": 48,
            "active_banners": 1
        }
    """
    stats = await AdminRepository.get_statistics(db)

    # Add active banners count
    active_banners = await SystemBannerRepository.get_active_count(db)
    stats["active_banners"] = active_banners

    return AdminStatistics(**stats)


@router.get("/users", response_model=AdminUserListResponse)
async def list_all_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    search: Optional[str] = Query(None, description="Search by email, name, or business name"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_superuser: Optional[bool] = Query(None, description="Filter by superuser status"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> AdminUserListResponse:
    """
    List all users with filtering and pagination.

    Returns a paginated list of all users with comprehensive details.

    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        search: Search term for email, name, or business name
        is_verified: Filter by email verification status
        is_active: Filter by active status
        is_superuser: Filter by superuser status
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        List of users with total count and pagination info

    Requires:
        Admin (superuser) access

    Example:
        GET /api/v1/admin/users?skip=0&limit=50&is_verified=false
        Authorization: Bearer <admin_access_token>
    """
    users, total = await AdminRepository.list_users(
        db,
        skip=skip,
        limit=limit,
        search=search,
        is_verified=is_verified,
        is_active=is_active,
        is_superuser=is_superuser,
    )

    # Convert users to response models with computed fields
    user_responses = []
    for user in users:
        # Calculate account age
        account_age_days = (datetime.utcnow() - user.created_at).days

        # Check if account is locked
        is_locked = user.locked_until is not None and user.locked_until > datetime.utcnow()

        # Create response with computed fields
        user_dict = {
            **{k: v for k, v in user.__dict__.items() if not k.startswith('_')},
            "account_age_days": account_age_days,
            "is_locked": is_locked,
        }
        user_responses.append(AdminUserResponse(**user_dict))

    return AdminUserListResponse(
        users=user_responses,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_by_id(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> AdminUserResponse:
    """
    Get detailed information about a specific user.

    Args:
        user_id: UUID of the user to retrieve
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Detailed user information

    Raises:
        HTTPException: 404 if user not found

    Requires:
        Admin (superuser) access

    Example:
        GET /api/v1/admin/users/{user_id}
        Authorization: Bearer <admin_access_token>
    """
    user = await AdminRepository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Calculate computed fields
    account_age_days = (datetime.utcnow() - user.created_at).days
    is_locked = user.locked_until is not None and user.locked_until > datetime.utcnow()

    user_dict = {
        **{k: v for k, v in user.__dict__.items() if not k.startswith('_')},
        "account_age_days": account_age_days,
        "is_locked": is_locked,
    }

    return AdminUserResponse(**user_dict)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    user_update: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> AdminUserResponse:
    """
    Update user details (admin-level update).

    Allows admin to update user profile fields including:
    - Names (first_name, last_name)
    - Business information (business_name, phone)
    - Account status (is_active, is_superuser)

    Note: Email and password cannot be changed through this endpoint.

    Args:
        user_id: UUID of the user to update
        user_update: User update data
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Updated user information

    Raises:
        HTTPException: 404 if user not found

    Requires:
        Admin (superuser) access

    Example:
        PUT /api/v1/admin/users/{user_id}
        Authorization: Bearer <admin_access_token>

        {
            "first_name": "Updated",
            "is_active": false
        }
    """
    user = await AdminRepository.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Calculate computed fields
    account_age_days = (datetime.utcnow() - user.created_at).days
    is_locked = user.locked_until is not None and user.locked_until > datetime.utcnow()

    user_dict = {
        **{k: v for k, v in user.__dict__.items() if not k.startswith('_')},
        "account_age_days": account_age_days,
        "is_locked": is_locked,
    }

    return AdminUserResponse(**user_dict)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user (hard delete).

    Permanently deletes a user and all their associated data.
    This action cannot be undone.

    Args:
        user_id: UUID of the user to delete
        admin: Current admin user (injected)
        db: Database session (injected)

    Raises:
        HTTPException: 404 if user not found
        HTTPException: 400 if trying to delete self

    Requires:
        Admin (superuser) access

    Example:
        DELETE /api/v1/admin/users/{user_id}
        Authorization: Bearer <admin_access_token>
    """
    # Prevent admin from deleting themselves
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    deleted = await AdminRepository.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


@router.post("/users/{user_id}/unlock", response_model=AdminUserResponse)
async def unlock_user_account(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> AdminUserResponse:
    """
    Unlock a locked user account.

    Resets failed login attempts and removes account lock,
    allowing the user to log in again immediately.

    Args:
        user_id: UUID of the user to unlock
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Updated user information

    Raises:
        HTTPException: 404 if user not found

    Requires:
        Admin (superuser) access

    Example:
        POST /api/v1/admin/users/{user_id}/unlock
        Authorization: Bearer <admin_access_token>
    """
    user = await AdminRepository.unlock_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Calculate computed fields
    account_age_days = (datetime.utcnow() - user.created_at).days
    is_locked = False  # We just unlocked the account

    user_dict = {
        **{k: v for k, v in user.__dict__.items() if not k.startswith('_')},
        "account_age_days": account_age_days,
        "is_locked": is_locked,
    }

    return AdminUserResponse(**user_dict)
