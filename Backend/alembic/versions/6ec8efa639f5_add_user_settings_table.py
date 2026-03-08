"""add_user_settings_table

Revision ID: 6ec8efa639f5
Revises: 1436567db3f7
Create Date: 2025-12-25 00:48:31.996191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '6ec8efa639f5'
down_revision: Union[str, Sequence[str], None] = '1436567db3f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if table already exists
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if 'user_settings' not in tables:
        op.create_table(
            'user_settings',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('company_name', sa.String(length=200), nullable=True),
            sa.Column('company_logo', sa.Text(), nullable=True),  # Base64 encoded or URL
            sa.Column('company_address', sa.Text(), nullable=True),
            sa.Column('company_phone', sa.String(length=50), nullable=True),
            sa.Column('company_email', sa.String(length=255), nullable=True),
            sa.Column('company_website', sa.String(length=255), nullable=True),
            sa.Column('tax_id', sa.String(length=100), nullable=True),
            sa.Column('default_currency', sa.String(length=3), nullable=True),
            sa.Column('default_template', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id')
        )
        op.create_index(op.f('ix_user_settings_user_id'), 'user_settings', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_settings_user_id'), table_name='user_settings')
    op.drop_table('user_settings')
