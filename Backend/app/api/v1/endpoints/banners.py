from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_admin_user, get_current_user
from app.models.user import User
from app.schemas.system_banner import (
    SystemBannerCreate,
    SystemBannerUpdate,
    SystemBannerResponse,
    SystemBannerListResponse,
)
from app.repositories.system_banner_repository import SystemBannerRepository
from app.core.websocket_manager import manager


router = APIRouter()


# Public endpoint - get active banners for current user
@router.get("/active", response_model=list[SystemBannerResponse])
async def get_active_banners(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> list[SystemBannerResponse]:
    """
    Get active system banners for the current user.

    Returns banners that should be displayed to the user based on:
    - Banner is active
    - User verification status (shows unverified-only banners if applicable)

    Args:
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        List of active banners to display

    Requires:
        Valid JWT access token

    Example:
        GET /api/v1/banners/active
        Authorization: Bearer <access_token>

        Response:
        [
            {
                "id": "uuid",
                "message": "System maintenance scheduled for tonight at 10 PM EST",
                "banner_type": "warning",
                "show_to_unverified_only": false,
                "action_url": "https://fintracker.cc/status",
                "action_text": "Learn More",
                "is_dismissible": true,
                "is_active": true,
                "created_at": "2025-01-15T10:00:00Z",
                "updated_at": "2025-01-15T10:00:00Z"
            }
        ]
    """
    banners = await SystemBannerRepository.get_active_banners(db, current_user.is_verified)
    return [SystemBannerResponse.model_validate(banner) for banner in banners]


# Admin endpoints
@router.post("", response_model=SystemBannerResponse, status_code=status.HTTP_201_CREATED)
async def create_banner(
    banner_data: SystemBannerCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> SystemBannerResponse:
    """
    Create a new system banner (Admin only).

    Args:
        banner_data: Banner creation data
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Created banner

    Requires:
        Admin (superuser) access

    Example:
        POST /api/v1/banners
        Authorization: Bearer <admin_access_token>

        {
            "message": "System will be down for maintenance tonight",
            "banner_type": "warning",
            "show_to_unverified_only": false,
            "action_url": "https://fintracker.cc/status",
            "action_text": "View Status",
            "is_dismissible": true
        }
    """
    banner = await SystemBannerRepository.create(db, banner_data)

    # Notify all connected users to refresh their banners
    # Clients will refetch using /active endpoint which filters by verification status
    await manager.broadcast_banner_update([])

    return SystemBannerResponse.model_validate(banner)


@router.get("", response_model=SystemBannerListResponse)
async def list_banners(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    active_only: bool = Query(False, description="Show only active banners"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> SystemBannerListResponse:
    """
    List all system banners (Admin only).

    Returns a paginated list of all banners with optional filtering.

    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        active_only: Filter to show only active banners
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        List of banners with total count and pagination info

    Requires:
        Admin (superuser) access

    Example:
        GET /api/v1/banners?skip=0&limit=50&active_only=true
        Authorization: Bearer <admin_access_token>
    """
    banners, total = await SystemBannerRepository.list_all(
        db,
        skip=skip,
        limit=limit,
        active_only=active_only,
    )

    banner_responses = [SystemBannerResponse.model_validate(banner) for banner in banners]

    return SystemBannerListResponse(
        banners=banner_responses,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{banner_id}", response_model=SystemBannerResponse)
async def get_banner(
    banner_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> SystemBannerResponse:
    """
    Get a specific banner by ID (Admin only).

    Args:
        banner_id: UUID of the banner to retrieve
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Banner details

    Raises:
        HTTPException: 404 if banner not found

    Requires:
        Admin (superuser) access

    Example:
        GET /api/v1/banners/{banner_id}
        Authorization: Bearer <admin_access_token>
    """
    banner = await SystemBannerRepository.get_by_id(db, banner_id)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    return SystemBannerResponse.model_validate(banner)


@router.put("/{banner_id}", response_model=SystemBannerResponse)
async def update_banner(
    banner_id: UUID,
    banner_update: SystemBannerUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> SystemBannerResponse:
    """
    Update a system banner (Admin only).

    Args:
        banner_id: UUID of the banner to update
        banner_update: Banner update data
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Updated banner

    Raises:
        HTTPException: 404 if banner not found

    Requires:
        Admin (superuser) access

    Example:
        PUT /api/v1/banners/{banner_id}
        Authorization: Bearer <admin_access_token>

        {
            "message": "Updated message",
            "is_active": false
        }
    """
    banner = await SystemBannerRepository.update(db, banner_id, banner_update)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    # Notify all connected users to refresh their banners
    await manager.broadcast_banner_update([])

    return SystemBannerResponse.model_validate(banner)


@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a banner (Admin only).

    Permanently deletes a banner. This action cannot be undone.

    Args:
        banner_id: UUID of the banner to delete
        admin: Current admin user (injected)
        db: Database session (injected)

    Raises:
        HTTPException: 404 if banner not found

    Requires:
        Admin (superuser) access

    Example:
        DELETE /api/v1/banners/{banner_id}
        Authorization: Bearer <admin_access_token>
    """
    deleted = await SystemBannerRepository.delete(db, banner_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    # Notify all connected users to refresh their banners
    await manager.broadcast_banner_update([])


@router.post("/{banner_id}/deactivate", response_model=SystemBannerResponse)
async def deactivate_banner(
    banner_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
) -> SystemBannerResponse:
    """
    Deactivate a banner (soft delete) (Admin only).

    Sets the banner as inactive, hiding it from users without deleting it.

    Args:
        banner_id: UUID of the banner to deactivate
        admin: Current admin user (injected)
        db: Database session (injected)

    Returns:
        Updated banner

    Raises:
        HTTPException: 404 if banner not found

    Requires:
        Admin (superuser) access

    Example:
        POST /api/v1/banners/{banner_id}/deactivate
        Authorization: Bearer <admin_access_token>
    """
    banner = await SystemBannerRepository.deactivate(db, banner_id)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    # Notify all connected users to refresh their banners
    await manager.broadcast_banner_update([])

    return SystemBannerResponse.model_validate(banner)
