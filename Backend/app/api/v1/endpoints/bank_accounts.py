from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.bank_account import Currency
from app.repositories.bank_account_repository import BankAccountRepository
from app.schemas.bank_account import (
    BankAccountCreate,
    BankAccountUpdate,
    BankAccountResponse,
    BankAccountListResponse,
)

router = APIRouter()


@router.post("", response_model=BankAccountResponse, status_code=201)
async def create_bank_account(
    bank_account_data: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new bank account"""
    bank_account = await BankAccountRepository.create(
        db=db,
        user_id=current_user.id,
        bank_account_data=bank_account_data
    )
    return bank_account


@router.get("", response_model=BankAccountListResponse)
async def list_bank_accounts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    currency: Optional[Currency] = Query(None, description="Filter by currency"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all bank accounts for current user"""
    skip = (page - 1) * page_size

    bank_accounts, total = await BankAccountRepository.get_all(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        is_active=is_active,
        currency=currency
    )

    total_pages = (total + page_size - 1) // page_size

    return BankAccountListResponse(
        bank_accounts=bank_accounts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/active", response_model=list[BankAccountResponse])
async def get_active_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active bank accounts (for dropdowns)"""
    bank_accounts = await BankAccountRepository.get_active_accounts(
        db=db,
        user_id=current_user.id
    )
    return bank_accounts


@router.get("/{bank_account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    bank_account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific bank account"""
    bank_account = await BankAccountRepository.get_by_id(
        db=db,
        bank_account_id=bank_account_id,
        user_id=current_user.id
    )

    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    return bank_account


@router.put("/{bank_account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    bank_account_id: UUID,
    update_data: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a bank account"""
    bank_account = await BankAccountRepository.update(
        db=db,
        bank_account_id=bank_account_id,
        user_id=current_user.id,
        update_data=update_data
    )

    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    return bank_account


@router.delete("/{bank_account_id}", status_code=204)
async def delete_bank_account(
    bank_account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a bank account"""
    success = await BankAccountRepository.delete(
        db=db,
        bank_account_id=bank_account_id,
        user_id=current_user.id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Bank account not found")

    return None


@router.post("/{bank_account_id}/deactivate", response_model=BankAccountResponse)
async def deactivate_bank_account(
    bank_account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a bank account (soft delete)"""
    bank_account = await BankAccountRepository.deactivate(
        db=db,
        bank_account_id=bank_account_id,
        user_id=current_user.id
    )

    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    return bank_account
