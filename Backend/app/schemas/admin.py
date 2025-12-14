from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AdminUserResponse(BaseModel):
    """Extended user response schema for admin panel with all user details."""

    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    business_name: Optional[str]
    phone: Optional[str]

    # Account status
    is_active: bool
    is_verified: bool
    is_superuser: bool

    # Dates and activity
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    verified_at: Optional[datetime]

    # Security
    failed_login_attempts: int
    locked_until: Optional[datetime]

    # Subscription info
    subscription_tier: Optional[str]
    subscription_status: Optional[str]
    trial_ends_at: Optional[datetime]

    # Computed fields
    account_age_days: int = Field(description="Days since account creation")
    is_locked: bool = Field(description="Whether account is currently locked")

    model_config = {
        "from_attributes": True
    }


class AdminUserUpdate(BaseModel):
    """Schema for admin updating user details (limited fields)."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    business_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class AdminUserListResponse(BaseModel):
    """Schema for paginated list of users in admin panel."""

    users: list[AdminUserResponse]
    total: int
    skip: int
    limit: int


class AdminStatistics(BaseModel):
    """Schema for admin dashboard statistics."""

    total_users: int
    verified_users: int
    unverified_users: int
    active_users: int
    locked_users: int
    superusers: int
    users_created_today: int
    users_created_this_week: int
    users_created_this_month: int
    active_banners: int
