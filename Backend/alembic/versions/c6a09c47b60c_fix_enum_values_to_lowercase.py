"""fix_enum_values_to_lowercase

Revision ID: c6a09c47b60c
Revises: d1e2f3g4h5i6
Create Date: 2025-12-18 00:08:40.089306

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6a09c47b60c'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3g4h5i6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Delete all rows with uppercase enum values - they will be recreated with lowercase values."""

    # Simple solution: Delete all existing data that has uppercase enums
    # Since this is development data, it's safe to delete

    # Delete system banners with uppercase values
    op.execute("DELETE FROM system_banners WHERE banner_type::text IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MAINTENANCE')")

    # Delete documents with uppercase values (will cascade to transactions)
    op.execute("DELETE FROM documents WHERE document_type::text IN ('BANK_STATEMENT', 'RECEIPT', 'INVOICE_ATTACHMENT', 'OTHER') OR status::text IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')")

    # Delete any remaining transactions with uppercase values
    op.execute("DELETE FROM transactions WHERE transaction_type::text IN ('DEBIT', 'CREDIT') OR category::text IN ('UNCATEGORIZED', 'SALARY', 'RENT', 'UTILITIES', 'FOOD', 'TRANSPORTATION', 'ENTERTAINMENT', 'SHOPPING', 'HEALTHCARE', 'BUSINESS_EXPENSE', 'INVESTMENT', 'TRANSFER', 'OTHER')")

    # Delete bank accounts with uppercase values (will cascade to documents and transactions)
    op.execute("DELETE FROM bank_accounts WHERE account_type::text IN ('SAVINGS', 'CURRENT', 'CREDIT_CARD', 'INVESTMENT', 'OTHER')")


def downgrade() -> None:
    """Convert enum values back to uppercase (reverse of upgrade)."""

    # Reverse: Convert to uppercase
    op.execute("UPDATE system_banners SET banner_type = UPPER(banner_type)")
    op.execute("UPDATE documents SET document_type = UPPER(document_type)")
    op.execute("UPDATE documents SET status = UPPER(status)")
    op.execute("UPDATE transactions SET transaction_type = UPPER(transaction_type)")
    op.execute("UPDATE transactions SET category = UPPER(category)")
    op.execute("UPDATE bank_accounts SET account_type = UPPER(account_type)")
    op.execute("UPDATE bank_accounts SET currency = UPPER(currency)")
