from typing import Optional, Literal
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from math import ceil

from app.api.deps import get_db, get_current_user, get_verified_user
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceStats,
    InvoiceSendRequest,
)
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.settings_repository import SettingsRepository
from app.services.pdf_service import PDFService
from app.core.email import EmailService


router = APIRouter()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
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
        403: Email not verified
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
    current_user: User = Depends(get_verified_user),
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
        403: Email not verified
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
    current_user: User = Depends(get_verified_user),
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
        403: Email not verified
        404: Invoice not found
    """
    invoice = await InvoiceRepository.update_status(db, invoice_id, current_user.id, status)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: UUID,
    template: str = Query("default", description="Template name (default, modern)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Generate and download invoice as PDF.

    Args:
        invoice_id: Invoice UUID
        template: Template name to use (default, modern)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        PDF file as downloadable response

    Raises:
        401: Not authenticated
        404: Invoice not found
    """
    # Get invoice
    invoice = await InvoiceRepository.get_by_id(db, invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Load company settings
    user_settings = await SettingsRepository.get_by_user_id(db, current_user.id)
    company_settings = None
    if user_settings:
        company_settings = {
            'company_name': user_settings.company_name,
            'company_logo': user_settings.company_logo,
            'company_address': user_settings.company_address,
            'company_phone': user_settings.company_phone,
            'company_email': user_settings.company_email,
            'company_website': user_settings.company_website,
            'tax_id': user_settings.tax_id,
        }

    # Generate PDF
    try:
        pdf_bytes = await PDFService.generate_invoice_pdf(
            db=db,
            invoice=invoice,
            template_name=template,
            company_settings=company_settings
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

    # Return PDF as downloadable file
    filename = f"invoice_{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{invoice_id}/preview")
async def preview_invoice_html(
    invoice_id: UUID,
    template: str = Query("default", description="Template name (default, modern)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Preview invoice as HTML (before PDF generation).

    Args:
        invoice_id: Invoice UUID
        template: Template name to use
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        HTML response

    Raises:
        401: Not authenticated
        404: Invoice not found
    """
    # Get invoice
    invoice = await InvoiceRepository.get_by_id(db, invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Load company settings
    user_settings = await SettingsRepository.get_by_user_id(db, current_user.id)
    company_settings = None
    if user_settings:
        company_settings = {
            'company_name': user_settings.company_name,
            'company_logo': user_settings.company_logo,
            'company_address': user_settings.company_address,
            'company_phone': user_settings.company_phone,
            'company_email': user_settings.company_email,
            'company_website': user_settings.company_website,
            'tax_id': user_settings.tax_id,
        }

    # Generate HTML
    try:
        html_content = await PDFService.generate_invoice_html(
            db=db,
            invoice=invoice,
            template_name=template,
            company_settings=company_settings
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate HTML: {str(e)}"
        )

    return Response(
        content=html_content,
        media_type="text/html"
    )


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice_email(
    invoice_id: UUID,
    send_request: InvoiceSendRequest,
    template: str = Query("default", description="Template name (default, modern)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
) -> InvoiceResponse:
    """
    Send invoice to client via email with PDF attachment.

    This endpoint:
    1. Generates a PDF of the invoice
    2. Sends it to the client's email address
    3. Updates the invoice status to 'sent'
    4. Updates the sent_at timestamp

    Args:
        invoice_id: Invoice UUID
        send_request: Request body with optional message
        template: Template name to use for PDF
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated invoice data

    Raises:
        401: Not authenticated
        403: Email not verified
        404: Invoice or client not found
        500: Email sending failed
    """
    from datetime import datetime

    # Get invoice
    invoice = await InvoiceRepository.get_by_id(db, invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Get client
    client = await ClientRepository.get_by_id(db, invoice.client_id, current_user.id)
    if not client or not client.email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or client has no email address",
        )

    # Load company settings
    user_settings = await SettingsRepository.get_by_user_id(db, current_user.id)
    company_settings = None
    if user_settings:
        company_settings = {
            'company_name': user_settings.company_name,
            'company_logo': user_settings.company_logo,
            'company_address': user_settings.company_address,
            'company_phone': user_settings.company_phone,
            'company_email': user_settings.company_email,
            'company_website': user_settings.company_website,
            'tax_id': user_settings.tax_id,
        }

    company_name = company_settings.get('company_name', 'FinTrack') if company_settings else 'FinTrack'

    # Generate PDF
    try:
        pdf_bytes = await PDFService.generate_invoice_pdf(
            db=db,
            invoice=invoice,
            template_name=template,
            company_settings=company_settings
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

    # Format amount and date for email
    invoice_amount = f"{invoice.currency} {invoice.total:.2f}"
    invoice_due_date = invoice.due_date.strftime("%B %d, %Y")

    # Send email
    try:
        email_sent = EmailService.send_invoice_email(
            to_email=client.email,
            to_name=client.name,
            invoice_number=invoice.invoice_number,
            invoice_amount=invoice_amount,
            invoice_due_date=invoice_due_date,
            from_company=company_name,
            pdf_attachment=pdf_bytes,
            message=send_request.message
        )

        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please check email configuration."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

    # Update invoice status to 'sent' and update sent_at timestamp
    invoice.status = "sent"
    invoice.sent_at = datetime.utcnow()  # Use naive UTC datetime for PostgreSQL
    await db.commit()
    await db.refresh(invoice)

    return InvoiceResponse.model_validate(invoice)
