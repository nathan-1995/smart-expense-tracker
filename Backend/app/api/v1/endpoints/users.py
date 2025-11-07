from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService


router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
) -> UserResponse:
    """
    Get current user profile.

    Returns the profile of the currently authenticated user.

    Args:
        current_user: Current authenticated user (injected)

    Returns:
        User profile data

    Requires:
        Valid JWT access token in Authorization header

    Example:
        GET /api/v1/users/me
        Authorization: Bearer <access_token>

        Response:
        {
            "id": "uuid",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "business_name": null,
            "is_active": true,
            ...
        }
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Update current user profile.

    Updates the profile information of the currently authenticated user.

    Args:
        user_update: User update data
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        Updated user profile data

    Requires:
        Valid JWT access token in Authorization header

    Example:
        PUT /api/v1/users/me
        Authorization: Bearer <access_token>
        {
            "first_name": "John",
            "last_name": "Doe",
            "business_name": "John's Consulting",
            "phone": "+1234567890",
            "city": "New York",
            "country": "US"
        }
    """
    updated_user = await UserRepository.update(db, current_user.id, user_update)
    return UserResponse.model_validate(updated_user)


@router.post("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Change current user password.

    Changes the password for the currently authenticated user.

    Args:
        password_data: Current and new password
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        Success message

    Raises:
        401: Current password is incorrect
        422: New password validation failed

    Requires:
        Valid JWT access token in Authorization header

    Example:
        POST /api/v1/users/me/change-password
        Authorization: Bearer <access_token>
        {
            "current_password": "OldPass123",
            "new_password": "NewSecurePass456"
        }

        Response:
        {
            "message": "Password changed successfully"
        }
    """
    await AuthService.change_password(
        db,
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )

    return {"message": "Password changed successfully"}


@router.delete("/me", status_code=status.HTTP_200_OK)
async def deactivate_account(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Deactivate current user account.

    Soft deletes the user account (sets is_active to False).
    The account can be reactivated later by an administrator.

    Args:
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        Success message

    Requires:
        Valid JWT access token in Authorization header

    Example:
        DELETE /api/v1/users/me
        Authorization: Bearer <access_token>

        Response:
        {
            "message": "Account deactivated successfully"
        }
    """
    await UserRepository.deactivate(db, current_user.id)

    return {"message": "Account deactivated successfully"}
