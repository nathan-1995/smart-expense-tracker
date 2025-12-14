"""Add system_banners table

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2025-12-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create system_banners table."""
    op.create_table(
        'system_banners',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False, comment='Banner message content'),
        sa.Column(
            'banner_type',
            sa.Enum('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MAINTENANCE', name='bannertype'),
            nullable=False,
            comment='Banner urgency/type (determines color)'
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Whether banner is currently displayed'),
        sa.Column('show_to_unverified_only', sa.Boolean(), nullable=False, comment='Show only to users with unverified emails'),
        sa.Column('action_url', sa.String(length=500), nullable=True, comment='Optional URL for action button'),
        sa.Column('action_text', sa.String(length=100), nullable=True, comment='Text for action button (e.g., \'Learn More\', \'Update Now\')'),
        sa.Column('is_dismissible', sa.Boolean(), nullable=False, comment='Whether users can dismiss/close the banner'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_system_banners_id'), 'system_banners', ['id'], unique=False)
    op.create_index(op.f('ix_system_banners_is_active'), 'system_banners', ['is_active'], unique=False)


def downgrade() -> None:
    """Drop system_banners table."""
    op.drop_index(op.f('ix_system_banners_is_active'), table_name='system_banners')
    op.drop_index(op.f('ix_system_banners_id'), table_name='system_banners')
    op.drop_table('system_banners')

    # Drop the enum type
    op.execute('DROP TYPE bannertype')
