from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Client Information
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))

    # Address
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))

    # Business Details
    currency = Column(String(3), default="USD")
    tax_id = Column(String(100))

    # Metadata
    notes = Column(Text)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="clients")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_clients_user_id", "user_id"),
        Index("idx_clients_is_active", "is_active"),
    )
