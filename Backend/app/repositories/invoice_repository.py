from typing import Optional, Literal
from uuid import UUID
from datetime import date
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceItemCreate


class InvoiceRepository:
    """Repository for Invoice database operations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, invoice_id: UUID, user_id: UUID) -> Optional[Invoice]:
        """
        Get invoice by ID with items.

        Args:
            db: Database session
            invoice_id: Invoice UUID
            user_id: User UUID (for authorization)

        Returns:
            Invoice object with items or None if not found
        """
        result = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.items))
            .filter(Invoice.id == invoice_id, Invoice.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        client_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> tuple[list[Invoice], int]:
        """
        Get all invoices for a user with pagination and filters.

        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Filter by status (optional)
            client_id: Filter by client (optional)
            start_date: Filter by issue date >= (optional)
            end_date: Filter by issue date <= (optional)

        Returns:
            Tuple of (invoices list, total count)
        """
        query = select(Invoice).options(selectinload(Invoice.items)).filter(Invoice.user_id == user_id)

        # Apply filters
        if status:
            query = query.filter(Invoice.status == status)
        if client_id:
            query = query.filter(Invoice.client_id == client_id)
        if start_date:
            query = query.filter(Invoice.issue_date >= start_date)
        if end_date:
            query = query.filter(Invoice.issue_date <= end_date)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Invoice.issue_date.desc())
        result = await db.execute(query)
        invoices = result.scalars().all()

        return list(invoices), total

    @staticmethod
    async def create(db: AsyncSession, user_id: UUID, invoice_data: InvoiceCreate) -> Invoice:
        """
        Create a new invoice with items.

        Args:
            db: Database session
            user_id: User UUID
            invoice_data: Invoice creation data

        Returns:
            Created Invoice object
        """
        # Calculate totals
        subtotal = sum(
            item.quantity * item.rate for item in invoice_data.items
        )

        tax_rate = invoice_data.tax_rate or Decimal(0)
        tax_amount = (subtotal * tax_rate / 100).quantize(Decimal("0.01"))

        discount_amount = invoice_data.discount_amount or Decimal(0)

        total = subtotal + tax_amount - discount_amount

        # Create invoice
        invoice = Invoice(
            user_id=user_id,
            client_id=invoice_data.client_id,
            invoice_number=invoice_data.invoice_number,
            issue_date=invoice_data.issue_date,
            due_date=invoice_data.due_date,
            currency=invoice_data.currency,
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total=total,
            status=invoice_data.status,
            notes=invoice_data.notes,
            terms=invoice_data.terms,
        )

        db.add(invoice)
        await db.flush()  # Get invoice.id

        # Create invoice items
        for idx, item_data in enumerate(invoice_data.items):
            amount = (item_data.quantity * item_data.rate).quantize(Decimal("0.01"))
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=amount,
                order_index=item_data.order_index if item_data.order_index else idx,
            )
            db.add(item)

        await db.commit()
        await db.refresh(invoice)

        # Load items relationship
        result = await db.execute(
            select(Invoice).options(selectinload(Invoice.items)).filter(Invoice.id == invoice.id)
        )
        return result.scalar_one()

    @staticmethod
    async def update(
        db: AsyncSession, invoice_id: UUID, user_id: UUID, invoice_data: InvoiceUpdate
    ) -> Optional[Invoice]:
        """
        Update an invoice.

        Args:
            db: Database session
            invoice_id: Invoice UUID
            user_id: User UUID (for authorization)
            invoice_data: Invoice update data

        Returns:
            Updated Invoice object or None if not found
        """
        invoice = await InvoiceRepository.get_by_id(db, invoice_id, user_id)
        if not invoice:
            return None

        update_data = invoice_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(invoice, field, value)

        # Recalculate totals if relevant fields changed
        if any(field in update_data for field in ["tax_rate", "discount_amount"]):
            tax_rate = invoice.tax_rate or Decimal(0)
            invoice.tax_amount = (invoice.subtotal * tax_rate / 100).quantize(Decimal("0.01"))
            discount_amount = invoice.discount_amount or Decimal(0)
            invoice.total = invoice.subtotal + invoice.tax_amount - discount_amount

        await db.commit()
        await db.refresh(invoice)

        # Reload items
        result = await db.execute(
            select(Invoice).options(selectinload(Invoice.items)).filter(Invoice.id == invoice.id)
        )
        return result.scalar_one()

    @staticmethod
    async def delete(db: AsyncSession, invoice_id: UUID, user_id: UUID) -> bool:
        """
        Delete an invoice (hard delete).

        Args:
            db: Database session
            invoice_id: Invoice UUID
            user_id: User UUID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        invoice = await InvoiceRepository.get_by_id(db, invoice_id, user_id)
        if not invoice:
            return False

        await db.delete(invoice)
        await db.commit()

        return True

    @staticmethod
    async def get_stats(db: AsyncSession, user_id: UUID) -> dict:
        """
        Get invoice statistics for a user.

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            Dictionary with statistics
        """
        # Get all invoices
        result = await db.execute(select(Invoice).filter(Invoice.user_id == user_id))
        invoices = result.scalars().all()

        total_invoices = len(invoices)
        draft_count = sum(1 for inv in invoices if inv.status == "draft")
        sent_count = sum(1 for inv in invoices if inv.status == "sent")
        paid_count = sum(1 for inv in invoices if inv.status == "paid")
        overdue_count = sum(1 for inv in invoices if inv.status == "overdue")
        cancelled_count = sum(1 for inv in invoices if inv.status == "cancelled")

        total_amount = sum(inv.total for inv in invoices)
        paid_amount = sum(inv.total for inv in invoices if inv.status == "paid")
        outstanding_amount = sum(
            inv.total for inv in invoices if inv.status in ["sent", "overdue"]
        )

        return {
            "total_invoices": total_invoices,
            "draft_count": draft_count,
            "sent_count": sent_count,
            "paid_count": paid_count,
            "overdue_count": overdue_count,
            "cancelled_count": cancelled_count,
            "total_amount": float(total_amount),
            "paid_amount": float(paid_amount),
            "outstanding_amount": float(outstanding_amount),
        }

    @staticmethod
    async def update_status(
        db: AsyncSession,
        invoice_id: UUID,
        user_id: UUID,
        status: Literal["draft", "sent", "paid", "overdue", "cancelled"],
    ) -> Optional[Invoice]:
        """
        Update invoice status.

        Args:
            db: Database session
            invoice_id: Invoice UUID
            user_id: User UUID (for authorization)
            status: New status

        Returns:
            Updated Invoice object or None if not found
        """
        invoice = await InvoiceRepository.get_by_id(db, invoice_id, user_id)
        if not invoice:
            return None

        invoice.status = status
        await db.commit()
        await db.refresh(invoice)

        return invoice
