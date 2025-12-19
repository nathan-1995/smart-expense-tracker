"""
API Usage Tracking Model

Tracks Gemini API usage for monitoring quotas and costs.
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.models.base import BaseModel


class APIServiceType(str, enum.Enum):
    """Types of API services used."""
    GEMINI = "gemini"
    # Future: OPENAI = "openai", etc.


class APIOperationType(str, enum.Enum):
    """Types of API operations."""
    DOCUMENT_PROCESSING = "document_processing"
    TEXT_GENERATION = "text_generation"
    TOKEN_COUNTING = "token_counting"


class APIUsage(BaseModel):
    """
    Track API usage for monitoring and quota management.

    Records each API call with token counts, user info, and response details.
    Enables admin monitoring of daily quotas and per-user usage.
    """
    __tablename__ = "api_usage"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Service information
    service = Column(
        SQLEnum(APIServiceType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
        comment="API service used (e.g., Gemini)"
    )

    operation = Column(
        SQLEnum(APIOperationType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
        comment="Type of operation performed"
    )

    model_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Model used (e.g., gemini-2.5-flash)"
    )

    # User tracking
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who made the request (NULL for system requests)"
    )

    # Token usage
    input_tokens = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of tokens in the input (prompt + data)"
    )

    output_tokens = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of tokens in the output"
    )

    total_tokens = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Total tokens used (input + output)"
    )

    # Request details
    request_id = Column(
        String(100),
        nullable=True,
        comment="API request ID from provider (if available)"
    )

    status_code = Column(
        Integer,
        nullable=False,
        comment="HTTP status code from API response"
    )

    success = Column(
        Integer,  # SQLite doesn't have boolean, use 0/1
        nullable=False,
        default=1,
        comment="Whether the request succeeded (1) or failed (0)"
    )

    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if request failed"
    )

    # Processing time
    duration_ms = Column(
        Integer,
        nullable=True,
        comment="Request duration in milliseconds"
    )

    # Related entities
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Related document if this was document processing"
    )

    # Additional data
    additional_data = Column(
        Text,
        nullable=True,
        comment="Additional metadata as JSON string"
    )

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
        comment="When the API request was made"
    )

    # Relationships
    user = relationship("User", back_populates="api_usage", lazy="joined")
    document = relationship("Document", back_populates="api_usage", lazy="joined")

    def __repr__(self):
        return f"<APIUsage(id={self.id}, service={self.service}, model={self.model_name}, tokens={self.total_tokens})>"
