from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.bank_account import AccountType, Currency


# Base schema with common fields
class BankAccountBase(BaseModel):
    """Base schema for bank account"""
    account_name: str = Field(..., min_length=1, max_length=255, description="User-defined account name")
    bank_name: str = Field(..., min_length=1, max_length=255, description="Bank name")
    account_number_last4: Optional[str] = Field(None, min_length=4, max_length=4, description="Last 4 digits of account")
    account_type: AccountType = Field(default=AccountType.SAVINGS, description="Type of account")
    currency: Currency = Field(default=Currency.USD, description="Account currency")
    opening_balance: Optional[Decimal] = Field(None, ge=0, description="Initial balance when account was opened")

    @field_validator('account_number_last4')
    @classmethod
    def validate_last4(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.isdigit():
            raise ValueError('account_number_last4 must contain only digits')
        return v


# Schema for creating a new bank account
class BankAccountCreate(BankAccountBase):
    """Schema for creating a bank account"""
    pass


# Schema for updating a bank account
class BankAccountUpdate(BaseModel):
    """Schema for updating a bank account"""
    account_name: Optional[str] = Field(None, min_length=1, max_length=255)
    bank_name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_number_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    account_type: Optional[AccountType] = None
    currency: Optional[Currency] = None
    opening_balance: Optional[Decimal] = Field(None, ge=0)
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None

    @field_validator('account_number_last4')
    @classmethod
    def validate_last4(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.isdigit():
            raise ValueError('account_number_last4 must contain only digits')
        return v


# Schema for bank account response
class BankAccountResponse(BankAccountBase):
    """Schema for bank account response"""
    id: UUID
    user_id: UUID
    current_balance: Optional[Decimal] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Additional computed fields
    transaction_count: Optional[int] = Field(None, description="Number of transactions in this account")
    document_count: Optional[int] = Field(None, description="Number of documents linked to this account")

    model_config = {
        "from_attributes": True
    }


# Schema for bank account list response (with pagination)
class BankAccountListResponse(BaseModel):
    """Schema for paginated list of bank accounts"""
    bank_accounts: list[BankAccountResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Schema for bank account statistics
class BankAccountStats(BaseModel):
    """Schema for bank account statistics"""
    account_id: UUID
    account_name: str
    currency: Currency
    current_balance: Optional[Decimal]
    total_transactions: int
    total_credits: Decimal
    total_debits: Decimal
    net_change: Decimal  # total_credits - total_debits
    last_transaction_date: Optional[datetime]
