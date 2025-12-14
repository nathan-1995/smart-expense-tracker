from sqlalchemy import Column, String, Text, Boolean, Enum as SQLEnum
import enum

from app.models.base import BaseModel


class BannerType(str, enum.Enum):
    """Banner urgency levels with corresponding color codes."""
    INFO = "info"           # Blue - General information
    SUCCESS = "success"     # Green - Positive updates
    WARNING = "warning"     # Yellow/Orange - Important notices
    ERROR = "error"         # Red - Critical issues/maintenance
    MAINTENANCE = "maintenance"  # Purple - Scheduled maintenance


class SystemBanner(BaseModel):
    """
    System-wide banner messages shown to users.

    Admins can create banners to communicate with users about:
    - System status updates
    - Scheduled maintenance
    - Important announcements
    - Service disruptions

    Banners can be targeted to all users or only unverified users.
    """

    __tablename__ = "system_banners"

    # Banner content
    message = Column(
        Text,
        nullable=False,
        comment="Banner message content"
    )

    # Banner type determines color and icon
    banner_type = Column(
        SQLEnum(BannerType),
        nullable=False,
        default=BannerType.INFO,
        comment="Banner urgency/type (determines color)"
    )

    # Visibility settings
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Whether banner is currently displayed"
    )

    show_to_unverified_only = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Show only to users with unverified emails"
    )

    # Optional link for "Learn more" or action button
    action_url = Column(
        String(500),
        nullable=True,
        comment="Optional URL for action button"
    )

    action_text = Column(
        String(100),
        nullable=True,
        comment="Text for action button (e.g., 'Learn More', 'Update Now')"
    )

    # Dismissible setting
    is_dismissible = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether users can dismiss/close the banner"
    )

    def __repr__(self):
        return f"<SystemBanner(id={self.id}, type={self.banner_type}, active={self.is_active})>"
