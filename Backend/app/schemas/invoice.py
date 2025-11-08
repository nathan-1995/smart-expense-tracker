from datetime import date, datetime
from typing import Optional, Literal
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, field_serializer


class InvoiceItemBase(BaseModel):
    """Base invoice item schema."""

    description: str = Field(..., min_length=1)
    quantity: Decimal = Field(..., gt=0, decimal_places=2)
    rate: Decimal = Field(..., ge=0, decimal_places=2)
    order_index: int = Field(default=0, ge=0)


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating an invoice item."""

    pass


class InvoiceItemUpdate(BaseModel):
    """Schema for updating an invoice item."""

    description: Optional[str] = Field(None, min_length=1)
    quantity: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    rate: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    order_index: Optional[int] = Field(None, ge=0)


class InvoiceItemResponse(InvoiceItemBase):
    """Schema for invoice item response."""

    id: UUID
    invoice_id: UUID
    amount: Decimal

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    """Base invoice schema."""

    client_id: UUID
    invoice_number: str = Field(..., min_length=1, max_length=50)
    issue_date: date
    due_date: date
    currency: str = Field(..., min_length=3, max_length=3)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    discount_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    notes: Optional[str] = None
    terms: Optional[str] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date, info) -> date:
        """Ensure due date is not before issue date."""
        if "issue_date" in info.data and v < info.data["issue_date"]:
            raise ValueError("Due date cannot be before issue date")
        return v


class InvoiceCreate(InvoiceBase):
    """Schema for creating an invoice."""

    items: list[InvoiceItemCreate] = Field(..., min_length=1)
    status: Literal["draft", "sent"] = "draft"


class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice."""

    client_id: Optional[UUID] = None
    invoice_number: Optional[str] = Field(None, min_length=1, max_length=50)
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    discount_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    status: Optional[Literal["draft", "sent", "paid", "overdue", "cancelled"]] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    """Schema for invoice response (API output)."""

    id: UUID
    user_id: UUID
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    status: str
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    pdf_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    items: list[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list."""

    invoices: list[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvoiceStats(BaseModel):
    """Schema for invoice statistics."""

    total_invoices: int
    draft_count: int
    sent_count: int
    paid_count: int
    overdue_count: int
    cancelled_count: int
    total_amount: float
    paid_amount: float
    outstanding_amount: float

    @field_serializer('total_amount', 'paid_amount', 'outstanding_amount')
    def serialize_amounts(self, value: float) -> float:
        """Ensure amounts are serialized as floats not strings."""
        return float(value) if value is not None else 0.0
