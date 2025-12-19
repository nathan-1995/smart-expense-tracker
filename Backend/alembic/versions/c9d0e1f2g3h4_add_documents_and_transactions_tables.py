"""Add documents and transactions tables

Revision ID: c9d0e1f2g3h4
Revises: b7c8d9e0f1a2
Create Date: 2025-12-17 00:14:29.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2g3h4'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create documents and transactions tables."""

    # Create document_type enum
    document_type_enum = postgresql.ENUM(
        'bank_statement', 'receipt', 'invoice_attachment', 'other',
        name='documenttype',
        create_type=False
    )
    document_type_enum.create(op.get_bind(), checkfirst=True)

    # Create processing_status enum
    processing_status_enum = postgresql.ENUM(
        'pending', 'processing', 'completed', 'failed',
        name='processingstatus',
        create_type=False
    )
    processing_status_enum.create(op.get_bind(), checkfirst=True)

    # Create transaction_type enum
    transaction_type_enum = postgresql.ENUM(
        'debit', 'credit',
        name='transactiontype',
        create_type=False
    )
    transaction_type_enum.create(op.get_bind(), checkfirst=True)

    # Create transaction_category enum
    transaction_category_enum = postgresql.ENUM(
        'uncategorized', 'salary', 'rent', 'utilities', 'food',
        'transportation', 'entertainment', 'shopping', 'healthcare',
        'business_expense', 'investment', 'transfer', 'other',
        name='transactioncategory',
        create_type=False
    )
    transaction_category_enum.create(op.get_bind(), checkfirst=True)

    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_type', document_type_enum, nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('status', processing_status_enum, nullable=False),
        sa.Column('processing_started_at', sa.DateTime(), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(), nullable=True),
        sa.Column('extraction_result', sa.Text(), nullable=True, comment='JSON string of extracted data'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )

    # Create indexes for documents
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_index('idx_documents_user_id', 'documents', ['user_id'], unique=False)
    op.create_index('idx_documents_status', 'documents', ['status'], unique=False)
    op.create_index('idx_documents_type', 'documents', ['document_type'], unique=False)

    # Create transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Document this transaction was extracted from (null for manual entries)'),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('amount', sa.DECIMAL(15, 2), nullable=False),
        sa.Column('transaction_type', transaction_type_enum, nullable=False),
        sa.Column('balance_after', sa.DECIMAL(15, 2), nullable=True, comment='Running balance after this transaction'),
        sa.Column('category', transaction_category_enum, nullable=False),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('account_last4', sa.String(4), nullable=True, comment='Last 4 digits of account number'),
        sa.Column('linked_invoice_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Invoice this transaction is linked to (for payment matching)'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_manually_added', sa.Boolean(), nullable=False, server_default='false', comment='True if manually added by user, False if extracted from document'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['linked_invoice_id'], ['invoices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )

    # Create indexes for transactions
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
    op.create_index('idx_transactions_user_id', 'transactions', ['user_id'], unique=False)
    op.create_index('idx_transactions_date', 'transactions', ['transaction_date'], unique=False)
    op.create_index('idx_transactions_type', 'transactions', ['transaction_type'], unique=False)
    op.create_index('idx_transactions_category', 'transactions', ['category'], unique=False)
    op.create_index('idx_transactions_document_id', 'transactions', ['document_id'], unique=False)


def downgrade() -> None:
    """Drop documents and transactions tables."""

    # Drop tables
    op.drop_index('idx_transactions_document_id', table_name='transactions')
    op.drop_index('idx_transactions_category', table_name='transactions')
    op.drop_index('idx_transactions_type', table_name='transactions')
    op.drop_index('idx_transactions_date', table_name='transactions')
    op.drop_index('idx_transactions_user_id', table_name='transactions')
    op.drop_index(op.f('ix_transactions_id'), table_name='transactions')
    op.drop_table('transactions')

    op.drop_index('idx_documents_type', table_name='documents')
    op.drop_index('idx_documents_status', table_name='documents')
    op.drop_index('idx_documents_user_id', table_name='documents')
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_table('documents')

    # Drop enums
    op.execute('DROP TYPE transactioncategory')
    op.execute('DROP TYPE transactiontype')
    op.execute('DROP TYPE processingstatus')
    op.execute('DROP TYPE documenttype')
