"""add_maintenance_to_banner_type_enum

Revision ID: 1436567db3f7
Revises: da80d99e5273
Create Date: 2025-12-19 21:45:42.267570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1436567db3f7'
down_revision: Union[str, Sequence[str], None] = 'da80d99e5273'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 'maintenance' value to bannertype enum."""
    # Add 'maintenance' value to the existing bannertype enum
    op.execute("ALTER TYPE bannertype ADD VALUE IF NOT EXISTS 'maintenance'")


def downgrade() -> None:
    """Remove 'maintenance' value from bannertype enum."""
    # Note: PostgreSQL does not support removing enum values directly
    # You would need to recreate the enum type if you want to remove a value
    pass
