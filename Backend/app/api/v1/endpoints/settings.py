from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.settings import UserSettingsResponse, UserSettingsCreate, UserSettingsUpdate
from app.repositories.settings_repository import SettingsRepository


router = APIRouter()


@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> UserSettingsResponse:
    """
    Get current user's company settings.

    Returns company branding and customization settings for the authenticated user.
    Creates default settings if none exist.

    Args:
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        UserSettingsResponse: Company settings data

    Requires:
        Valid JWT access token in Authorization header

    Example:
        GET /api/v1/settings
        Authorization: Bearer <access_token>

        Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "company_name": "Acme Corp",
            "company_logo": "data:image/png;base64,...",
            "company_address": "123 Business St",
            "company_phone": "+1234567890",
            "company_email": "info@acme.com",
            "company_website": "https://acme.com",
            "tax_id": "12-3456789",
            "default_currency": "USD",
            "default_template": "default",
            "created_at": "2025-12-24T12:00:00",
            "updated_at": "2025-12-24T12:00:00"
        }
    """
    # Get or create settings for user
    settings = await SettingsRepository.get_or_create(db, current_user.id)
    return UserSettingsResponse.model_validate(settings)


@router.put("/", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> UserSettingsResponse:
    """
    Update current user's company settings.

    Updates company branding and customization settings.
    All fields are optional - only provided fields will be updated.

    Args:
        settings_update: Settings update data
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        UserSettingsResponse: Updated settings data

    Requires:
        Valid JWT access token in Authorization header

    Example:
        PUT /api/v1/settings
        Authorization: Bearer <access_token>
        Content-Type: application/json

        {
            "company_name": "New Company Name",
            "company_email": "contact@newcompany.com",
            "default_currency": "EUR"
        }

        Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "company_name": "New Company Name",
            ...
        }
    """
    # Get or create settings
    settings = await SettingsRepository.get_or_create(db, current_user.id)

    # Update settings
    updated_settings = await SettingsRepository.update(db, settings, settings_update)

    return UserSettingsResponse.model_validate(updated_settings)


@router.post("/", response_model=UserSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_user_settings(
    settings_create: UserSettingsCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> UserSettingsResponse:
    """
    Create company settings for current user.

    Creates new company settings. Returns 400 if settings already exist.
    Use PUT /settings to update existing settings.

    Args:
        settings_create: Settings creation data
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        UserSettingsResponse: Created settings data

    Raises:
        HTTPException 400: If settings already exist for user

    Requires:
        Valid JWT access token in Authorization header

    Example:
        POST /api/v1/settings
        Authorization: Bearer <access_token>
        Content-Type: application/json

        {
            "company_name": "Acme Corp",
            "company_email": "info@acme.com",
            "default_currency": "USD"
        }

        Response (201):
        {
            "id": "uuid",
            "user_id": "uuid",
            "company_name": "Acme Corp",
            ...
        }
    """
    # Check if settings already exist
    existing_settings = await SettingsRepository.get_by_user_id(db, current_user.id)
    if existing_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settings already exist for this user. Use PUT /settings to update."
        )

    # Create new settings
    settings = await SettingsRepository.create(db, current_user.id, settings_create)

    return UserSettingsResponse.model_validate(settings)
