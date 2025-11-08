from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.event import listens_for

from app.models.base import BaseModel


class User(BaseModel):
    """
    User model for authentication and profile management.

    Handles both email/password authentication and future OAuth integration.
    Includes security features like account lockout and failed login tracking.
    """

    __tablename__ = "users"

    # Authentication Fields (Required for email/password login)
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash = Column(
        String(255),
        nullable=False  # Required for email/password, can be NULL for OAuth in future
    )

    # Account Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Profile Information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    business_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    # Business Address
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), default="LK", nullable=True)

    # Business Settings
    currency = Column(String(3), default="USD", nullable=True)
    tax_id = Column(String(100), nullable=True)
    logo_url = Column(Text, nullable=True)

    # Subscription (for future use)
    subscription_tier = Column(String(50), default="free", nullable=True)
    subscription_status = Column(String(50), default="active", nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)

    # Security & Login Tracking
    last_login_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)

    # Relationships
    clients = relationship("Client", back_populates="user", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint("email = LOWER(email)", name="users_email_lowercase"),
    )

    def __repr__(self):
        """String representation showing email and active status."""
        return f"<User(email={self.email}, is_active={self.is_active})>"

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.email

    @property
    def is_locked(self) -> bool:
        """Check if account is currently locked."""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until


@listens_for(User, "before_insert")
@listens_for(User, "before_update")
def lowercase_email(mapper, connection, target):
    """
    SQLAlchemy event listener to ensure email is always lowercase.

    This runs before insert and update operations to enforce email consistency.
    """
    if target.email:
        target.email = target.email.lower()
