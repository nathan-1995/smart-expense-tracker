import enum
from sqlalchemy import Column, String, Enum as SQLEnum, DECIMAL, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel


class AccountType(str, enum.Enum):
    """Bank account types"""
    SAVINGS = "savings"
    CURRENT = "current"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    OTHER = "other"


class Currency(str, enum.Enum):
    """Supported currencies"""
    # Major currencies
    USD = "USD"  # US Dollar
    EUR = "EUR"  # Euro
    GBP = "GBP"  # British Pound
    JPY = "JPY"  # Japanese Yen

    # Asian currencies
    LKR = "LKR"  # Sri Lankan Rupee
    INR = "INR"  # Indian Rupee
    PKR = "PKR"  # Pakistani Rupee
    BDT = "BDT"  # Bangladeshi Taka
    NPR = "NPR"  # Nepalese Rupee
    CNY = "CNY"  # Chinese Yuan
    SGD = "SGD"  # Singapore Dollar
    MYR = "MYR"  # Malaysian Ringgit
    THB = "THB"  # Thai Baht
    PHP = "PHP"  # Philippine Peso
    IDR = "IDR"  # Indonesian Rupiah
    VND = "VND"  # Vietnamese Dong
    KRW = "KRW"  # South Korean Won

    # Middle East currencies
    AED = "AED"  # UAE Dirham
    SAR = "SAR"  # Saudi Riyal
    QAR = "QAR"  # Qatari Riyal

    # Other major currencies
    AUD = "AUD"  # Australian Dollar
    CAD = "CAD"  # Canadian Dollar
    CHF = "CHF"  # Swiss Franc
    NZD = "NZD"  # New Zealand Dollar
    ZAR = "ZAR"  # South African Rand


class BankAccount(BaseModel):
    """Bank account model for tracking user bank accounts"""

    __tablename__ = "bank_accounts"

    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Account identification
    account_name = Column(String(255), nullable=False)  # User-defined name: "My Personal Savings"
    bank_name = Column(String(255), nullable=False)  # Bank name: "Commercial Bank of Ceylon"
    account_number_last4 = Column(String(4), nullable=True)  # Last 4 digits for reference
    account_type = Column(SQLEnum(AccountType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=AccountType.SAVINGS)

    # Financial details
    currency = Column(SQLEnum(Currency, values_callable=lambda x: [e.value for e in x]), nullable=False, default=Currency.USD)
    opening_balance = Column(DECIMAL(15, 2), nullable=True)  # Optional initial balance
    current_balance = Column(DECIMAL(15, 2), nullable=True)  # Calculated from transactions

    # Account status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="bank_accounts")
    transactions = relationship("Transaction", back_populates="bank_account", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="bank_account", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BankAccount {self.account_name} ({self.bank_name}) - {self.currency}>"
