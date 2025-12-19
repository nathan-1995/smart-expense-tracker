"""
Transaction model for bank statement transactions.

This module defines the Transaction model for storing financial transactions
extracted from bank statements or manually added by users.
"""
import enum
from sqlalchemy import Column, String, Text, Date, DECIMAL, ForeignKey, Boolean, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TransactionType(str, enum.Enum):
    """Transaction type enumeration."""

    DEBIT = "debit"
    CREDIT = "credit"


class TransactionCategory(str, enum.Enum):
    """Transaction category enumeration."""

    UNCATEGORIZED = "uncategorized"
    SALARY = "salary"
    RENT = "rent"
    UTILITIES = "utilities"
    FOOD = "food"
    TRANSPORTATION = "transportation"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    HEALTHCARE = "healthcare"
    BUSINESS_EXPENSE = "business_expense"
    INVESTMENT = "investment"
    TRANSFER = "transfer"
    OTHER = "other"


class Transaction(BaseModel):
    """
    Transaction model for bank statement transactions.

    Stores financial transactions extracted from bank statements
    or manually added by users. Supports categorization and
    optional linking to invoices for payment matching.
    """

    __tablename__ = "transactions"

    # Ownership
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Document this transaction was extracted from (null for manual entries or dismissed documents)"
    )
    bank_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bank_accounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Bank account this transaction belongs to"
    )

    # Transaction details
    transaction_date = Column(
        Date,
        nullable=False,
        index=True
    )
    description = Column(
        Text,
        nullable=False
    )
    amount = Column(
        DECIMAL(15, 2),
        nullable=False
    )
    transaction_type = Column(
        SQLEnum(TransactionType, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )

    # Additional information
    balance_after = Column(
        DECIMAL(15, 2),
        nullable=True,
        comment="Running balance after this transaction"
    )
    category = Column(
        SQLEnum(TransactionCategory, values_callable=lambda x: [e.value for e in x]),
        default=TransactionCategory.UNCATEGORIZED,
        nullable=False,
        index=True
    )
    merchant = Column(
        String(255),
        nullable=True
    )
    account_last4 = Column(
        String(4),
        nullable=True,
        comment="Last 4 digits of account number"
    )

    # Invoice linking (for future payment matching)
    linked_invoice_id = Column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Invoice this transaction is linked to (for payment matching)"
    )

    # Notes and metadata
    notes = Column(
        Text,
        nullable=True
    )
    source_document_name = Column(
        String(255),
        nullable=True,
        comment="Original filename of the document this was imported from (preserved even after document deletion)"
    )
    is_manually_added = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="True if manually added by user, False if extracted from document"
    )

    # Relationships
    user = relationship("User", back_populates="transactions")
    document = relationship("Document", back_populates="transactions")
    bank_account = relationship("BankAccount", back_populates="transactions")
    linked_invoice = relationship("Invoice", back_populates="transactions")

    __table_args__ = (
        Index("idx_transactions_user_id", "user_id"),
        Index("idx_transactions_date", "transaction_date"),
        Index("idx_transactions_type", "transaction_type"),
        Index("idx_transactions_category", "category"),
        Index("idx_transactions_document_id", "document_id"),
    )
