from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class UserSettings(BaseModel):
    """
    User settings model for company branding and invoice customization.

    Each user has one settings record (one-to-one relationship).
    Used for PDF invoice generation with company branding.
    """

    __tablename__ = "user_settings"

    # Foreign Key to User
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    # Company Branding Information
    company_name = Column(String(200), nullable=True)
    company_logo = Column(Text, nullable=True)  # Base64 encoded image or URL
    company_address = Column(Text, nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_email = Column(String(255), nullable=True)
    company_website = Column(String(255), nullable=True)
    tax_id = Column(String(100), nullable=True)

    # Invoice Defaults
    default_currency = Column(String(3), nullable=True)  # e.g., USD, EUR, GBP
    default_template = Column(String(50), nullable=True)  # e.g., default, modern

    # Relationship
    user = relationship("User", back_populates="settings")

    def __repr__(self):
        """String representation showing user_id and company name."""
        return f"<UserSettings(user_id={self.user_id}, company_name={self.company_name})>"
