"""
Repository for Transaction database operations.

This module handles all database queries related to transactions.
Follows the repository pattern used throughout the FinTrack application.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType, TransactionCategory
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class TransactionRepository:
    """Repository for Transaction database operations."""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        transaction_data: TransactionCreate,
        document_id: Optional[UUID] = None,
        bank_account_id: Optional[UUID] = None,
        is_manually_added: bool = False
    ) -> Transaction:
        """
        Create a new transaction.

        Args:
            db: Database session
            user_id: User UUID
            transaction_data: Transaction creation data
            document_id: Document UUID (optional, for extracted transactions)
            bank_account_id: Bank account UUID (optional)
            is_manually_added: Whether transaction was manually added

        Returns:
            Created Transaction object
        """
        transaction = Transaction(
            user_id=user_id,
            document_id=document_id,
            bank_account_id=bank_account_id,
            transaction_date=transaction_data.transaction_date,
            description=transaction_data.description,
            amount=transaction_data.amount,
            transaction_type=transaction_data.transaction_type,
            balance_after=transaction_data.balance_after,
            category=transaction_data.category,
            merchant=transaction_data.merchant,
            account_last4=transaction_data.account_last4,
            notes=transaction_data.notes,
            is_manually_added=is_manually_added
        )

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return transaction

    @staticmethod
    async def bulk_create(
        db: AsyncSession,
        user_id: UUID,
        transactions_data: List[TransactionCreate],
        document_id: Optional[UUID] = None,
        bank_account_id: Optional[UUID] = None,
        source_document_name: Optional[str] = None
    ) -> List[Transaction]:
        """
        Bulk create transactions.

        Args:
            db: Database session
            user_id: User UUID
            transactions_data: List of transaction creation data
            document_id: Document UUID (optional)
            bank_account_id: Bank account UUID (optional)
            source_document_name: Original filename of source document (optional)

        Returns:
            List of created Transaction objects
        """
        transactions = []

        for transaction_data in transactions_data:
            transaction = Transaction(
                user_id=user_id,
                document_id=document_id,
                bank_account_id=bank_account_id,
                transaction_date=transaction_data.transaction_date,
                description=transaction_data.description,
                amount=transaction_data.amount,
                transaction_type=transaction_data.transaction_type,
                balance_after=transaction_data.balance_after,
                category=transaction_data.category,
                merchant=transaction_data.merchant,
                account_last4=transaction_data.account_last4,
                notes=transaction_data.notes,
                source_document_name=source_document_name,
                is_manually_added=False
            )
            transactions.append(transaction)
            db.add(transaction)

        await db.commit()

        # Refresh all transactions
        for transaction in transactions:
            await db.refresh(transaction)

        return transactions

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID
    ) -> Optional[Transaction]:
        """
        Get transaction by ID.

        Args:
            db: Database session
            transaction_id: Transaction UUID
            user_id: User UUID (for authorization)

        Returns:
            Transaction object or None if not found
        """
        result = await db.execute(
            select(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        transaction_type: Optional[TransactionType] = None,
        category: Optional[TransactionCategory] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        document_id: Optional[UUID] = None,
        bank_account_id: Optional[UUID] = None
    ) -> tuple[list[Transaction], int]:
        """
        Get all transactions for a user with pagination and filters.

        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            transaction_type: Filter by transaction type (optional)
            category: Filter by category (optional)
            start_date: Filter by date >= (optional)
            end_date: Filter by date <= (optional)
            document_id: Filter by document (optional)
            bank_account_id: Filter by bank account (optional)

        Returns:
            Tuple of (transactions list, total count)
        """
        query = select(Transaction).filter(Transaction.user_id == user_id)

        # Apply filters
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        if category:
            query = query.filter(Transaction.category == category)
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
        if document_id:
            query = query.filter(Transaction.document_id == document_id)
        if bank_account_id:
            query = query.filter(Transaction.bank_account_id == bank_account_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Transaction.transaction_date.desc())
        result = await db.execute(query)
        transactions = result.scalars().all()

        return list(transactions), total

    @staticmethod
    async def update(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID,
        transaction_data: TransactionUpdate
    ) -> Optional[Transaction]:
        """
        Update a transaction.

        Args:
            db: Database session
            transaction_id: Transaction UUID
            user_id: User UUID (for authorization)
            transaction_data: Transaction update data

        Returns:
            Updated Transaction object or None if not found
        """
        transaction = await TransactionRepository.get_by_id(db, transaction_id, user_id)
        if not transaction:
            return None

        update_data = transaction_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(transaction, field, value)

        await db.commit()
        await db.refresh(transaction)

        return transaction

    @staticmethod
    async def delete(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Delete a transaction (hard delete).

        Args:
            db: Database session
            transaction_id: Transaction UUID
            user_id: User UUID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        transaction = await TransactionRepository.get_by_id(db, transaction_id, user_id)
        if not transaction:
            return False

        await db.delete(transaction)
        await db.commit()

        return True

    @staticmethod
    async def delete_by_document_id(
        db: AsyncSession,
        document_id: UUID,
        user_id: UUID
    ) -> int:
        """
        Delete all transactions for a specific document.

        Used when reimporting a document to replace old transactions.

        Args:
            db: Database session
            document_id: Document UUID
            user_id: User UUID (for authorization)

        Returns:
            Number of transactions deleted
        """
        # Get all transactions for this document that belong to the user
        result = await db.execute(
            select(Transaction).filter(
                Transaction.document_id == document_id,
                Transaction.user_id == user_id
            )
        )
        transactions = result.scalars().all()

        count = len(transactions)

        # Delete all transactions
        for transaction in transactions:
            await db.delete(transaction)

        await db.commit()

        return count

    @staticmethod
    async def get_stats(db: AsyncSession, user_id: UUID) -> dict:
        """
        Get transaction statistics for a user.

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            Dictionary with statistics
        """
        # Get all transactions
        result = await db.execute(
            select(Transaction).filter(Transaction.user_id == user_id)
        )
        transactions = result.scalars().all()

        total_transactions = len(transactions)

        debits = [t for t in transactions if t.transaction_type == TransactionType.DEBIT]
        credits = [t for t in transactions if t.transaction_type == TransactionType.CREDIT]

        total_debit_amount = sum(float(t.amount) for t in debits)
        total_credit_amount = sum(float(t.amount) for t in credits)

        # Count by category
        transactions_by_category = {}
        for transaction in transactions:
            category = transaction.category.value
            transactions_by_category[category] = transactions_by_category.get(category, 0) + 1

        return {
            "total_transactions": total_transactions,
            "total_debits": len(debits),
            "total_credits": len(credits),
            "total_debit_amount": total_debit_amount,
            "total_credit_amount": total_credit_amount,
            "net_balance": total_credit_amount - total_debit_amount,
            "transactions_by_category": transactions_by_category
        }
