from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class ClientBase(BaseModel):
    """Base client schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    tax_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    """Schema for creating a client."""

    is_active: bool = True


class ClientUpdate(BaseModel):
    """Schema for updating a client."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    tax_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    """Schema for client response (API output)."""

    id: UUID
    user_id: UUID
    is_active: bool

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Schema for paginated client list."""

    clients: list[ClientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
