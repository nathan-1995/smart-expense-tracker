"""
Pydantic schemas for document-related API requests and responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Response schema for document upload."""

    id: UUID
    document_type: str
    original_filename: str
    file_size_bytes: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusResponse(BaseModel):
    """Response schema for document processing status."""

    id: UUID
    document_type: str
    original_filename: str
    status: str
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    transactions_count: int = 0

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Schema for paginated document list."""

    documents: list[DocumentStatusResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
