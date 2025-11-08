from sqlalchemy import Column, String, Text, Date, DECIMAL, ForeignKey, CheckConstraint, Index, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import date
import uuid

from app.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)

    # Invoice Identification
    invoice_number = Column(String(50), unique=True, nullable=False)

    # Dates
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False)

    # Financial Details
    currency = Column(String(3), nullable=False)
    subtotal = Column(DECIMAL(15, 2), nullable=False, default=0)
    tax_rate = Column(DECIMAL(5, 2), default=0)
    tax_amount = Column(DECIMAL(15, 2), default=0)
    discount_amount = Column(DECIMAL(15, 2), default=0)
    total = Column(DECIMAL(15, 2), nullable=False, default=0)

    # Status
    status = Column(String(50), default="draft")

    # Payment Information
    payment_date = Column(Date)
    payment_method = Column(String(100))

    # Additional Information
    notes = Column(Text)
    terms = Column(Text)

    # Files
    pdf_url = Column(Text)

    # Email Tracking
    sent_at = Column(DateTime)
    reminder_sent_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')", name="invoices_status_check"),
        Index("idx_invoices_user_id", "user_id"),
        Index("idx_invoices_client_id", "client_id"),
        Index("idx_invoices_status", "status"),
        Index("idx_invoices_due_date", "due_date"),
        Index("idx_invoices_invoice_number", "invoice_number"),
    )
