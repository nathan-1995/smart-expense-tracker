"""
API endpoints for document upload and processing.

This module handles document upload, processing with Gemini AI,
and retrieval of extraction results for the review screen.
"""
from typing import Optional
from uuid import UUID
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import DocumentType, ProcessingStatus
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentListResponse
)
from app.repositories.document_repository import DocumentRepository
from app.services.gemini_service import GeminiService
from app.core.exceptions import DocumentProcessingError
from app.core.email import EmailService
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.core.websocket_manager import manager


router = APIRouter()


# File upload constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = ["application/pdf"]


async def process_document_background(
    document_id: UUID,
    user_id: UUID,
    file_content: bytes,
    filename: str,
    user_email: str,
    user_first_name: str,
    email_notification_requested: bool
):
    """
    Background task to process document asynchronously.

    Args:
        document_id: Document UUID
        user_id: User UUID
        file_content: PDF file bytes
        filename: Original filename
        user_email: User email for notifications
        user_first_name: User first name
        email_notification_requested: Whether to send email on completion
    """
    # Create new DB session for background task
    async with AsyncSessionLocal() as db:
        try:
            # Update status to processing
            await DocumentRepository.update_status(
                db=db,
                document_id=document_id,
                status=ProcessingStatus.PROCESSING
            )

            # Extract data using Gemini
            extracted_data = await GeminiService.extract_bank_statement_data(
                file_content=file_content,
                filename=filename,
                db=db,
                user_id=user_id,
                document_id=document_id
            )

            # Store extraction result
            await DocumentRepository.set_extraction_result(
                db=db,
                document_id=document_id,
                extraction_data=extracted_data
            )

            # Mark as completed
            await DocumentRepository.update_status(
                db=db,
                document_id=document_id,
                status=ProcessingStatus.COMPLETED
            )

            # Send WebSocket notification to user
            await manager.notify_document_completed(
                user_id=user_id,
                document_id=document_id,
                filename=filename
            )

            # Send email notification if requested
            if email_notification_requested:
                EmailService.send_document_processed_email(
                    to_email=user_email,
                    first_name=user_first_name,
                    document_filename=filename,
                    document_id=str(document_id),
                    frontend_url=settings.FRONTEND_URL
                )

        except DocumentProcessingError as e:
            # Mark as failed
            await DocumentRepository.update_status(
                db=db,
                document_id=document_id,
                status=ProcessingStatus.FAILED,
                error_message=str(e.detail)
            )

        except Exception as e:
            # Mark as failed
            await DocumentRepository.update_status(
                db=db,
                document_id=document_id,
                status=ProcessingStatus.FAILED,
                error_message=f"Unexpected error: {str(e)}"
            )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: str = Query("bank_statement", description="Document type"),
    bank_account_id: Optional[UUID] = Query(None, description="Bank account ID for bank statements"),
    email_notification: bool = Query(False, description="Send email notification when processing completes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentUploadResponse:
    """
    Upload a document (bank statement PDF) for async processing.

    File is held in memory for processing, then discarded.
    Only metadata and extracted data are stored.
    Processing happens in the background - user can continue using the app.

    Args:
        background_tasks: FastAPI background tasks (injected)
        file: Uploaded PDF file
        document_type: Type of document (default: bank_statement)
        bank_account_id: Bank account ID (for bank statements)
        email_notification: Send email when processing completes
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Document metadata with PENDING status

    Raises:
        400: Invalid file type or size
        401: Not authenticated
    """
    # Validate file
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )

    # Create document record with PENDING status
    document = await DocumentRepository.create(
        db=db,
        user_id=current_user.id,
        document_type=DocumentType.BANK_STATEMENT,
        filename=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        bank_account_id=bank_account_id,
        email_notification_requested=email_notification
    )

    # Schedule background processing
    background_tasks.add_task(
        process_document_background,
        document_id=document.id,
        user_id=current_user.id,
        file_content=file_content,
        filename=file.filename,
        user_email=current_user.email,
        user_first_name=current_user.first_name,
        email_notification_requested=email_notification
    )

    return DocumentUploadResponse.model_validate(document)


@router.get("/{document_id}", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentStatusResponse:
    """
    Get document processing status and results.

    Args:
        document_id: Document UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Document status with extraction results if completed

    Raises:
        401: Not authenticated
        404: Document not found
    """
    document = await DocumentRepository.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Count transactions
    transactions_count = len(document.transactions) if document.transactions else 0

    response_data = DocumentStatusResponse.model_validate(document)
    response_data.transactions_count = transactions_count

    return response_data


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status_filter: Optional[str] = Query(None, description="Filter by processing status (comma-separated)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """
    List all documents for the current user.

    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page
        document_type: Filter by document type (optional)
        status_filter: Filter by processing status (optional, comma-separated for multiple)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Paginated list of documents

    Raises:
        401: Not authenticated
    """
    skip = (page - 1) * page_size

    # Parse enums if provided
    doc_type_enum = None
    if document_type:
        try:
            doc_type_enum = DocumentType(document_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document type: {document_type}"
            )

    status_enums = None
    if status_filter:
        try:
            # Parse comma-separated status values
            status_values = [s.strip() for s in status_filter.split(",")]
            status_enums = [ProcessingStatus(s) for s in status_values]
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )

    documents_with_counts, total = await DocumentRepository.get_all(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        document_type=doc_type_enum,
        status=status_enums
    )

    total_pages = ceil(total / page_size) if total > 0 else 1

    # Build response with transaction counts
    document_responses = []
    for doc, transaction_count in documents_with_counts:
        doc_response = DocumentStatusResponse.model_validate(doc)
        doc_response.transactions_count = transaction_count
        document_responses.append(doc_response)

    return DocumentListResponse(
        documents=document_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a document and all associated transactions.

    Args:
        document_id: Document UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Raises:
        401: Not authenticated
        404: Document not found
    """
    success = await DocumentRepository.delete(db, document_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )


@router.get("/{document_id}/extraction", response_model=dict)
async def get_extraction_results(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get raw extraction results for review before importing.

    Returns the extracted transaction data that can be reviewed
    and edited before importing into the transactions table.

    Args:
        document_id: Document UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Raw extraction data with transactions and metadata

    Raises:
        401: Not authenticated
        404: Document not found or not yet processed
    """
    import json

    document = await DocumentRepository.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document processing not completed. Current status: {document.status.value}"
        )

    if not document.extraction_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No extraction results available"
        )

    try:
        extraction_data = json.loads(document.extraction_result)
        return extraction_data
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse extraction results"
        )
