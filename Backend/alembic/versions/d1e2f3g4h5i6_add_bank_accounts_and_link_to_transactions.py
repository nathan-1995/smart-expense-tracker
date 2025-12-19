"""add bank accounts and link to transactions

Revision ID: d1e2f3g4h5i6
Revises: c9d0e1f2g3h4
Create Date: 2025-12-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd1e2f3g4h5i6'
down_revision = 'c9d0e1f2g3h4'
branch_labels = None
depends_on = None


def upgrade():
    # Create account_type enum
    account_type_enum = postgresql.ENUM(
        'savings', 'current', 'credit_card', 'investment', 'other',
        name='accounttype',
        create_type=False
    )
    account_type_enum.create(op.get_bind(), checkfirst=True)

    # Create currency enum (24 currencies)
    currency_enum = postgresql.ENUM(
        'USD', 'EUR', 'GBP', 'JPY',  # Major currencies
        'LKR', 'INR', 'PKR', 'BDT', 'NPR', 'CNY', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW',  # Asian
        'AED', 'SAR', 'QAR',  # Middle East
        'AUD', 'CAD', 'CHF', 'NZD', 'ZAR',  # Other
        name='currency',
        create_type=False
    )
    currency_enum.create(op.get_bind(), checkfirst=True)

    # Create bank_accounts table
    op.create_table(
        'bank_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=False),
        sa.Column('bank_name', sa.String(length=255), nullable=False),
        sa.Column('account_number_last4', sa.String(length=4), nullable=True),
        sa.Column('account_type', account_type_enum, nullable=False),
        sa.Column('currency', currency_enum, nullable=False),
        sa.Column('opening_balance', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('current_balance', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for bank_accounts
    op.create_index('ix_bank_accounts_user_id', 'bank_accounts', ['user_id'])
    op.create_index('ix_bank_accounts_is_active', 'bank_accounts', ['is_active'])

    # Add bank_account_id to documents table
    op.add_column(
        'documents',
        sa.Column('bank_account_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index('ix_documents_bank_account_id', 'documents', ['bank_account_id'])
    op.create_foreign_key(
        'fk_documents_bank_account_id',
        'documents',
        'bank_accounts',
        ['bank_account_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Add bank_account_id to transactions table
    op.add_column(
        'transactions',
        sa.Column('bank_account_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index('ix_transactions_bank_account_id', 'transactions', ['bank_account_id'])
    op.create_foreign_key(
        'fk_transactions_bank_account_id',
        'transactions',
        'bank_accounts',
        ['bank_account_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Remove foreign keys and columns from transactions
    op.drop_constraint('fk_transactions_bank_account_id', 'transactions', type_='foreignkey')
    op.drop_index('ix_transactions_bank_account_id', 'transactions')
    op.drop_column('transactions', 'bank_account_id')

    # Remove foreign keys and columns from documents
    op.drop_constraint('fk_documents_bank_account_id', 'documents', type_='foreignkey')
    op.drop_index('ix_documents_bank_account_id', 'documents')
    op.drop_column('documents', 'bank_account_id')

    # Drop bank_accounts table
    op.drop_index('ix_bank_accounts_is_active', 'bank_accounts')
    op.drop_index('ix_bank_accounts_user_id', 'bank_accounts')
    op.drop_table('bank_accounts')

    # Drop enums
    sa.Enum(name='currency').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='accounttype').drop(op.get_bind(), checkfirst=True)
