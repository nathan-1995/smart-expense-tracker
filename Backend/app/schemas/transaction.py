"""
Pydantic schemas for transaction-related API requests and responses.
"""
from datetime import date, datetime
from typing import Optional, Literal
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class TransactionBase(BaseModel):
    """Base transaction schema."""

    transaction_date: date
    description: str = Field(..., min_length=1)
    amount: Decimal = Field(..., decimal_places=2)
    transaction_type: Literal["debit", "credit"]
    balance_after: Optional[Decimal] = Field(None, decimal_places=2)
    category: Literal[
        "uncategorized", "salary", "rent", "utilities", "food",
        "transportation", "entertainment", "shopping", "healthcare",
        "business_expense", "investment", "transfer", "other"
    ] = "uncategorized"
    merchant: Optional[str] = Field(None, max_length=255)
    account_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction manually."""

    pass


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    transaction_date: Optional[date] = None
    description: Optional[str] = Field(None, min_length=1)
    amount: Optional[Decimal] = Field(None, decimal_places=2)
    transaction_type: Optional[Literal["debit", "credit"]] = None
    balance_after: Optional[Decimal] = Field(None, decimal_places=2)
    category: Optional[Literal[
        "uncategorized", "salary", "rent", "utilities", "food",
        "transportation", "entertainment", "shopping", "healthcare",
        "business_expense", "investment", "transfer", "other"
    ]] = None
    merchant: Optional[str] = Field(None, max_length=255)
    account_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    notes: Optional[str] = None
    linked_invoice_id: Optional[UUID] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: UUID
    user_id: UUID
    document_id: Optional[UUID] = None
    linked_invoice_id: Optional[UUID] = None
    source_document_name: Optional[str] = None
    is_manually_added: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""

    transactions: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TransactionBulkImportRequest(BaseModel):
    """Schema for bulk importing transactions from processing results."""

    transactions: list[TransactionCreate] = Field(..., min_length=1)


class TransactionStats(BaseModel):
    """Schema for transaction statistics."""

    total_transactions: int
    total_debits: int
    total_credits: int
    total_debit_amount: float
    total_credit_amount: float
    net_balance: float
    transactions_by_category: dict[str, int]
