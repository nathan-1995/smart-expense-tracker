from typing import Optional
from uuid import UUID
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from app.models.bank_account import BankAccount, AccountType, Currency
from app.schemas.bank_account import BankAccountCreate, BankAccountUpdate


class BankAccountRepository:
    """Repository for bank account database operations"""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        bank_account_data: BankAccountCreate
    ) -> BankAccount:
        """Create a new bank account"""
        bank_account = BankAccount(
            user_id=user_id,
            **bank_account_data.model_dump()
        )

        # Set current_balance to opening_balance if provided
        if bank_account_data.opening_balance is not None:
            bank_account.current_balance = bank_account_data.opening_balance

        db.add(bank_account)
        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        bank_account_id: UUID,
        user_id: UUID
    ) -> Optional[BankAccount]:
        """Get a bank account by ID (user-scoped)"""
        result = await db.execute(
            select(BankAccount).where(
                and_(
                    BankAccount.id == bank_account_id,
                    BankAccount.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        currency: Optional[Currency] = None
    ) -> tuple[list[BankAccount], int]:
        """Get all bank accounts for a user with pagination and filters"""
        # Build base query
        query = select(BankAccount).where(BankAccount.user_id == user_id)

        # Apply filters
        if is_active is not None:
            query = query.where(BankAccount.is_active == is_active)
        if currency is not None:
            query = query.where(BankAccount.currency == currency)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(BankAccount.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        bank_accounts = result.scalars().all()

        return list(bank_accounts), total

    @staticmethod
    async def update(
        db: AsyncSession,
        bank_account_id: UUID,
        user_id: UUID,
        update_data: BankAccountUpdate
    ) -> Optional[BankAccount]:
        """Update a bank account"""
        bank_account = await BankAccountRepository.get_by_id(db, bank_account_id, user_id)
        if not bank_account:
            return None

        # Update only provided fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(bank_account, field, value)

        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    @staticmethod
    async def delete(
        db: AsyncSession,
        bank_account_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a bank account (hard delete)"""
        bank_account = await BankAccountRepository.get_by_id(db, bank_account_id, user_id)
        if not bank_account:
            return False

        await db.delete(bank_account)
        await db.commit()
        return True

    @staticmethod
    async def deactivate(
        db: AsyncSession,
        bank_account_id: UUID,
        user_id: UUID
    ) -> Optional[BankAccount]:
        """Soft delete - deactivate a bank account"""
        bank_account = await BankAccountRepository.get_by_id(db, bank_account_id, user_id)
        if not bank_account:
            return None

        bank_account.is_active = False
        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    @staticmethod
    async def update_balance(
        db: AsyncSession,
        bank_account_id: UUID,
        user_id: UUID,
        new_balance: Decimal
    ) -> Optional[BankAccount]:
        """Update the current balance of a bank account"""
        bank_account = await BankAccountRepository.get_by_id(db, bank_account_id, user_id)
        if not bank_account:
            return None

        bank_account.current_balance = new_balance
        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    @staticmethod
    async def get_active_accounts(
        db: AsyncSession,
        user_id: UUID
    ) -> list[BankAccount]:
        """Get all active bank accounts for a user (for dropdowns)"""
        result = await db.execute(
            select(BankAccount)
            .where(
                and_(
                    BankAccount.user_id == user_id,
                    BankAccount.is_active == True
                )
            )
            .order_by(BankAccount.account_name)
        )
        return list(result.scalars().all())
