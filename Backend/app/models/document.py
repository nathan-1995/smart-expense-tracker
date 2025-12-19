"""
Document model for storing uploaded documents.

This module defines the Document model for tracking uploaded financial documents
(bank statements, receipts, invoices, etc.) and their processing status.
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, Enum as SQLEnum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class DocumentType(str, enum.Enum):
    """Document type enumeration."""

    BANK_STATEMENT = "bank_statement"
    RECEIPT = "receipt"
    INVOICE_ATTACHMENT = "invoice_attachment"
    OTHER = "other"


class ProcessingStatus(str, enum.Enum):
    """Document processing status enumeration."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(BaseModel):
    """
    Document model for storing uploaded documents.

    Generic model that can handle different document types.
    Documents are processed and deleted - no file persistence.
    Only metadata and extraction results are stored.
    """

    __tablename__ = "documents"

    # Ownership
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Document metadata
    document_type = Column(
        SQLEnum(DocumentType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    bank_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bank_accounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Bank account this document belongs to (for bank statements)"
    )
    original_filename = Column(
        String(255),
        nullable=False
    )
    file_size_bytes = Column(
        Integer,
        nullable=False
    )
    mime_type = Column(
        String(100),
        nullable=False
    )

    # Processing status
    status = Column(
        SQLEnum(ProcessingStatus, values_callable=lambda x: [e.value for e in x]),
        default=ProcessingStatus.PENDING,
        nullable=False,
        index=True
    )
    processing_started_at = Column(
        DateTime,
        nullable=True
    )
    processing_completed_at = Column(
        DateTime,
        nullable=True
    )

    # Processing results/errors
    extraction_result = Column(
        Text,
        nullable=True,
        comment="JSON string of extracted data"
    )
    error_message = Column(
        Text,
        nullable=True
    )

    # Email notification preference
    email_notification_requested = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether user requested email notification on completion"
    )

    # Relationships
    user = relationship("User", back_populates="documents")
    bank_account = relationship("BankAccount", back_populates="documents")
    transactions = relationship(
        "Transaction",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    api_usage = relationship("APIUsage", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_documents_user_id", "user_id"),
        Index("idx_documents_status", "status"),
        Index("idx_documents_type", "document_type"),
    )
