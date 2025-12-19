"""
Repository for Document database operations.

This module handles all database queries related to documents.
Follows the repository pattern used throughout the FinTrack application.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document, DocumentType, ProcessingStatus


class DocumentRepository:
    """Repository for Document database operations."""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        document_type: DocumentType,
        filename: str,
        file_size: int,
        mime_type: str,
        bank_account_id: Optional[UUID] = None,
        email_notification_requested: bool = False
    ) -> Document:
        """
        Create a new document record.

        Args:
            db: Database session
            user_id: User UUID
            document_type: Type of document
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type
            bank_account_id: Bank account UUID (optional, for bank statements)
            email_notification_requested: Whether to send email on completion

        Returns:
            Created Document object
        """
        document = Document(
            user_id=user_id,
            document_type=document_type,
            original_filename=filename,
            file_size_bytes=file_size,
            mime_type=mime_type,
            status=ProcessingStatus.PENDING,
            bank_account_id=bank_account_id,
            email_notification_requested=email_notification_requested
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        return document

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        document_id: UUID,
        user_id: UUID
    ) -> Optional[Document]:
        """
        Get document by ID with transactions.

        Args:
            db: Database session
            document_id: Document UUID
            user_id: User UUID (for authorization)

        Returns:
            Document object or None if not found
        """
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.transactions))
            .filter(Document.id == document_id, Document.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
        document_type: Optional[DocumentType] = None,
        status: Optional[list[ProcessingStatus]] = None
    ) -> tuple[list[tuple[Document, int]], int]:
        """
        Get all documents for a user with pagination and filters.

        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            document_type: Filter by document type (optional)
            status: Filter by processing status (optional, can be a list)

        Returns:
            Tuple of (list of (document, transaction_count) tuples, total count)
        """
        from app.models.transaction import Transaction

        # Build base query
        query = select(Document).filter(Document.user_id == user_id)

        # Apply filters
        if document_type:
            query = query.filter(Document.document_type == document_type)
        if status:
            # Support both single status and list of statuses
            if isinstance(status, list):
                query = query.filter(Document.status.in_(status))
            else:
                query = query.filter(Document.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Build query with transaction count using subquery
        transaction_count_subquery = (
            select(func.count(Transaction.id))
            .where(Transaction.document_id == Document.id)
            .correlate(Document)
            .scalar_subquery()
        )

        query_with_count = (
            select(Document, transaction_count_subquery.label('transaction_count'))
            .filter(Document.user_id == user_id)
        )

        # Apply same filters to the count query
        if document_type:
            query_with_count = query_with_count.filter(Document.document_type == document_type)
        if status:
            if isinstance(status, list):
                query_with_count = query_with_count.filter(Document.status.in_(status))
            else:
                query_with_count = query_with_count.filter(Document.status == status)

        # Get paginated results with transaction counts
        query_with_count = query_with_count.offset(skip).limit(limit).order_by(Document.created_at.desc())
        result = await db.execute(query_with_count)
        documents_with_counts = result.all()

        return documents_with_counts, total

    @staticmethod
    async def update_status(
        db: AsyncSession,
        document_id: UUID,
        status: ProcessingStatus,
        error_message: Optional[str] = None
    ) -> Optional[Document]:
        """
        Update document processing status.

        Args:
            db: Database session
            document_id: Document UUID
            status: New processing status
            error_message: Error message if failed (optional)

        Returns:
            Updated Document object or None if not found
        """
        result = await db.execute(
            select(Document).filter(Document.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            return None

        document.status = status

        if status == ProcessingStatus.PROCESSING:
            document.processing_started_at = datetime.utcnow()
        elif status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
            document.processing_completed_at = datetime.utcnow()

        if error_message:
            document.error_message = error_message

        await db.commit()
        await db.refresh(document)

        return document

    @staticmethod
    async def set_extraction_result(
        db: AsyncSession,
        document_id: UUID,
        extraction_data: dict
    ) -> Optional[Document]:
        """
        Store extraction result JSON.

        Args:
            db: Database session
            document_id: Document UUID
            extraction_data: Extracted data dictionary

        Returns:
            Updated Document object or None if not found
        """
        import json

        result = await db.execute(
            select(Document).filter(Document.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            return None

        document.extraction_result = json.dumps(extraction_data)

        await db.commit()
        await db.refresh(document)

        return document

    @staticmethod
    async def delete(
        db: AsyncSession,
        document_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Delete a document (hard delete).

        Args:
            db: Database session
            document_id: Document UUID
            user_id: User UUID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        document = await DocumentRepository.get_by_id(db, document_id, user_id)
        if not document:
            return False

        await db.delete(document)
        await db.commit()

        return True
