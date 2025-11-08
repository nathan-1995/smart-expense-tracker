from sqlalchemy import Column, Text, Integer, DECIMAL, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)

    # Item Details
    description = Column(Text, nullable=False)
    quantity = Column(DECIMAL(10, 2), nullable=False, default=1)
    rate = Column(DECIMAL(15, 2), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)

    # Ordering
    order_index = Column(Integer, default=0)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")

    __table_args__ = (
        Index("idx_invoice_items_invoice_id", "invoice_id"),
    )
