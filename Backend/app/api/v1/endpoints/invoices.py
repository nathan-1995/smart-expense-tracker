from typing import Optional, Literal
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from math import ceil

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceStats,
)
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.client_repository import ClientRepository


router = APIRouter()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Create a new invoice with items.

    Args:
        invoice_data: Invoice creation data (including items)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Created invoice data with items

    Raises:
        401: Not authenticated
        404: Client not found
        422: Validation error
    """
    # Verify client exists and belongs to user
    client = await ClientRepository.get_by_id(db, invoice_data.client_id, current_user.id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    invoice = await InvoiceRepository.create(db, current_user.id, invoice_data)
    return InvoiceResponse.model_validate(invoice)


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    start_date: Optional[date] = Query(None, description="Filter by issue date >="),
    end_date: Optional[date] = Query(None, description="Filter by issue date <="),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceListResponse:
    """
    List all invoices for the current user.

    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page
        status: Filter by status (optional)
        client_id: Filter by client (optional)
        start_date: Filter by issue date >= (optional)
        end_date: Filter by issue date <= (optional)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Paginated list of invoices

    Raises:
        401: Not authenticated
    """
    skip = (page - 1) * page_size
    invoices, total = await InvoiceRepository.get_all(
        db,
        current_user.id,
        skip=skip,
        limit=page_size,
        status=status,
        client_id=client_id,
        start_date=start_date,
        end_date=end_date,
    )

    total_pages = ceil(total / page_size) if total > 0 else 1

    return InvoiceListResponse(
        invoices=[InvoiceResponse.model_validate(invoice) for invoice in invoices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=InvoiceStats)
async def get_invoice_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceStats:
    """
    Get invoice statistics for the current user.

    Args:
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Invoice statistics

    Raises:
        401: Not authenticated
    """
    stats = await InvoiceRepository.get_stats(db, current_user.id)
    return InvoiceStats(**stats)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Get a specific invoice by ID.

    Args:
        invoice_id: Invoice UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Invoice data with items

    Raises:
        401: Not authenticated
        404: Invoice not found
    """
    invoice = await InvoiceRepository.get_by_id(db, invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Update an invoice.

    Args:
        invoice_id: Invoice UUID
        invoice_data: Invoice update data
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated invoice data

    Raises:
        401: Not authenticated
        404: Invoice not found
        422: Validation error
    """
    # If updating client_id, verify new client exists
    if invoice_data.client_id:
        client = await ClientRepository.get_by_id(db, invoice_data.client_id, current_user.id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

    invoice = await InvoiceRepository.update(db, invoice_id, current_user.id, invoice_data)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete an invoice.

    Args:
        invoice_id: Invoice UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Raises:
        401: Not authenticated
        404: Invoice not found
    """
    success = await InvoiceRepository.delete(db, invoice_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )


@router.post("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: UUID,
    status: Literal["draft", "sent", "paid", "overdue", "cancelled"] = Query(..., description="New status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Update invoice status.

    Args:
        invoice_id: Invoice UUID
        status: New status
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated invoice data

    Raises:
        401: Not authenticated
        404: Invoice not found
    """
    invoice = await InvoiceRepository.update_status(db, invoice_id, current_user.id, status)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)
