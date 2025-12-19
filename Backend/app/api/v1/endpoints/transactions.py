"""
API endpoints for transaction management.

This module handles transaction CRUD operations, bulk import from documents,
filtering, and statistics.
"""
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_verified_user
from app.models.user import User
from app.models.transaction import TransactionType, TransactionCategory
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListResponse,
    TransactionBulkImportRequest,
    TransactionStats
)
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.document_repository import DocumentRepository


router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
) -> TransactionResponse:
    """
    Create a new transaction manually.

    Args:
        transaction_data: Transaction creation data
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Created transaction data

    Raises:
        401: Not authenticated
        403: Email not verified
        422: Validation error
    """
    transaction = await TransactionRepository.create(
        db=db,
        user_id=current_user.id,
        transaction_data=transaction_data,
        is_manually_added=True
    )

    return TransactionResponse.model_validate(transaction)


@router.post("/bulk-import", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_import_transactions(
    import_data: TransactionBulkImportRequest,
    document_id: UUID = Query(..., description="Document ID these transactions belong to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
) -> dict:
    """
    Bulk import transactions from document extraction results.

    This endpoint is called after the user reviews and confirms
    the extracted transactions from the review screen.

    If transactions already exist for this document (reimport scenario),
    they will be automatically deleted before importing the new ones.

    Args:
        import_data: List of transactions to import
        document_id: UUID of the document these transactions came from
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Summary of imported transactions

    Raises:
        401: Not authenticated
        403: Email not verified
        404: Document not found
        422: Validation error
    """
    # Verify document exists and belongs to user
    document = await DocumentRepository.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Delete any existing transactions for this document (reimport scenario)
    deleted_count = await TransactionRepository.delete_by_document_id(
        db=db,
        document_id=document_id,
        user_id=current_user.id
    )

    # Bulk create transactions (inherit bank_account_id from document)
    transactions = await TransactionRepository.bulk_create(
        db=db,
        user_id=current_user.id,
        transactions_data=import_data.transactions,
        document_id=document_id,
        bank_account_id=document.bank_account_id,
        source_document_name=document.original_filename
    )

    return {
        "message": "Transactions imported successfully",
        "count": len(transactions),
        "replaced_count": deleted_count,
        "document_id": str(document_id)
    }


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Items per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by type (debit/credit)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Filter by date >="),
    end_date: Optional[date] = Query(None, description="Filter by date <="),
    document_id: Optional[UUID] = Query(None, description="Filter by document"),
    bank_account_id: Optional[UUID] = Query(None, description="Filter by bank account"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionListResponse:
    """
    List all transactions for the current user.

    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page
        transaction_type: Filter by type (optional)
        category: Filter by category (optional)
        start_date: Filter by date >= (optional)
        end_date: Filter by date <= (optional)
        document_id: Filter by document (optional)
        bank_account_id: Filter by bank account (optional)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Paginated list of transactions

    Raises:
        401: Not authenticated
    """
    skip = (page - 1) * page_size

    # Parse enums if provided
    type_enum = None
    if transaction_type:
        try:
            type_enum = TransactionType(transaction_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transaction type: {transaction_type}"
            )

    category_enum = None
    if category:
        try:
            category_enum = TransactionCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {category}"
            )

    transactions, total = await TransactionRepository.get_all(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        transaction_type=type_enum,
        category=category_enum,
        start_date=start_date,
        end_date=end_date,
        document_id=document_id,
        bank_account_id=bank_account_id
    )

    total_pages = ceil(total / page_size) if total > 0 else 1

    return TransactionListResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=TransactionStats)
async def get_transaction_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionStats:
    """
    Get transaction statistics for the current user.

    Args:
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Transaction statistics

    Raises:
        401: Not authenticated
    """
    stats = await TransactionRepository.get_stats(db, current_user.id)
    return TransactionStats(**stats)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionResponse:
    """
    Get a specific transaction by ID.

    Args:
        transaction_id: Transaction UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Transaction data

    Raises:
        401: Not authenticated
        404: Transaction not found
    """
    transaction = await TransactionRepository.get_by_id(db, transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return TransactionResponse.model_validate(transaction)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
) -> TransactionResponse:
    """
    Update a transaction.

    Args:
        transaction_id: Transaction UUID
        transaction_data: Transaction update data
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated transaction data

    Raises:
        401: Not authenticated
        403: Email not verified
        404: Transaction not found
        422: Validation error
    """
    transaction = await TransactionRepository.update(
        db=db,
        transaction_id=transaction_id,
        user_id=current_user.id,
        transaction_data=transaction_data
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return TransactionResponse.model_validate(transaction)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a transaction.

    Args:
        transaction_id: Transaction UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Raises:
        401: Not authenticated
        404: Transaction not found
    """
    success = await TransactionRepository.delete(db, transaction_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
