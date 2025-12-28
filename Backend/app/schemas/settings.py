"""
Pydantic schemas for user settings (company branding and customization).
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class UserSettingsBase(BaseModel):
    """Base schema for user settings with common fields."""
    company_name: Optional[str] = Field(None, max_length=200, description="Company/business name")
    company_logo: Optional[str] = Field(None, description="Company logo as base64 data URI or URL")
    company_address: Optional[str] = Field(None, description="Company physical address")
    company_phone: Optional[str] = Field(None, max_length=50, description="Company phone number")
    company_email: Optional[str] = Field(None, max_length=255, description="Company email address")
    company_website: Optional[str] = Field(None, max_length=255, description="Company website URL")
    tax_id: Optional[str] = Field(None, max_length=100, description="Tax ID or business registration number")
    default_currency: Optional[str] = Field(None, max_length=3, description="Default currency code (e.g., USD, EUR)")
    default_template: Optional[str] = Field(None, max_length=50, description="Default invoice template (e.g., default, modern)")

    @field_validator("default_currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        """Validate currency code format."""
        if v is not None:
            v = v.upper()
            if len(v) != 3:
                raise ValueError("Currency code must be 3 characters (e.g., USD, EUR, GBP)")
        return v

    @field_validator("default_template")
    @classmethod
    def validate_template(cls, v: Optional[str]) -> Optional[str]:
        """Validate template name."""
        if v is not None:
            allowed_templates = ["default", "modern", "modern-green", "geometric-purple"]
            if v not in allowed_templates:
                raise ValueError(f"Template must be one of: {', '.join(allowed_templates)}")
        return v


class UserSettingsCreate(UserSettingsBase):
    """Schema for creating user settings."""
    pass


class UserSettingsUpdate(UserSettingsBase):
    """Schema for updating user settings (all fields optional)."""
    pass


class UserSettingsResponse(UserSettingsBase):
    """Schema for user settings response."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
