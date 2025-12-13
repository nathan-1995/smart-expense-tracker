"""Add email verification fields to user model

Revision ID: a1b2c3d4e5f6
Revises: 2fc72e4f4005
Create Date: 2025-12-13 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '2fc72e4f4005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email verification fields to users table."""
    # Add verification_token column
    op.add_column('users', sa.Column('verification_token', sa.String(length=255), nullable=True))

    # Add verification_token_expires_at column
    op.add_column('users', sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))

    # Add verified_at column
    op.add_column('users', sa.Column('verified_at', sa.DateTime(), nullable=True))

    # Create unique index on verification_token
    op.create_index(op.f('ix_users_verification_token'), 'users', ['verification_token'], unique=True)


def downgrade() -> None:
    """Remove email verification fields from users table."""
    # Drop index first
    op.drop_index(op.f('ix_users_verification_token'), table_name='users')

    # Drop columns
    op.drop_column('users', 'verified_at')
    op.drop_column('users', 'verification_token_expires_at')
    op.drop_column('users', 'verification_token')
