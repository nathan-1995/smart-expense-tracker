from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.system_banner import BannerType


class SystemBannerBase(BaseModel):
    """Base schema for system banners."""

    message: str = Field(..., min_length=1, max_length=1000, description="Banner message content")
    banner_type: BannerType = Field(default=BannerType.INFO, description="Banner urgency level")
    show_to_unverified_only: bool = Field(default=False, description="Show only to unverified users")
    action_url: Optional[str] = Field(None, max_length=500, description="Optional action button URL")
    action_text: Optional[str] = Field(None, max_length=100, description="Optional action button text")
    is_dismissible: bool = Field(default=True, description="Whether users can dismiss the banner")


class SystemBannerCreate(SystemBannerBase):
    """Schema for creating a new system banner."""
    pass


class SystemBannerUpdate(BaseModel):
    """Schema for updating a system banner (all fields optional)."""

    message: Optional[str] = Field(None, min_length=1, max_length=1000)
    banner_type: Optional[BannerType] = None
    is_active: Optional[bool] = None
    show_to_unverified_only: Optional[bool] = None
    action_url: Optional[str] = Field(None, max_length=500)
    action_text: Optional[str] = Field(None, max_length=100)
    is_dismissible: Optional[bool] = None


class SystemBannerResponse(SystemBannerBase):
    """Schema for system banner response."""

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class SystemBannerListResponse(BaseModel):
    """Schema for paginated list of banners."""

    banners: list[SystemBannerResponse]
    total: int
    skip: int
    limit: int
