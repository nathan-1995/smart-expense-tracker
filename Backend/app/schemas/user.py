from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password strength.

        Requirements:
        - At least 8 characters
        - Contains at least one letter
        - Contains at least one number
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least one letter")

        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one number")

        return v

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        """Ensure email is lowercase."""
        return v.lower()


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        """Ensure email is lowercase."""
        return v.lower()


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    business_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    tax_id: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response (API output)."""

    id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    tax_id: Optional[str] = None
    logo_url: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """Schema for user stored in database (includes sensitive fields)."""

    password_hash: str
    is_superuser: bool
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    """Schema for password change request."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least one letter")

        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one number")

        return v
