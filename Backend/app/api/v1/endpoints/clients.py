from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from math import ceil

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.repositories.client_repository import ClientRepository


router = APIRouter()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """
    Create a new client.

    Args:
        client_data: Client creation data
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Created client data

    Raises:
        401: Not authenticated
        422: Validation error
    """
    client = await ClientRepository.create(db, current_user.id, client_data)
    return ClientResponse.model_validate(client)


@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientListResponse:
    """
    List all clients for the current user.

    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page
        is_active: Filter by active status (optional)
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Paginated list of clients

    Raises:
        401: Not authenticated
    """
    skip = (page - 1) * page_size
    clients, total = await ClientRepository.get_all(
        db, current_user.id, skip=skip, limit=page_size, is_active=is_active
    )

    total_pages = ceil(total / page_size) if total > 0 else 1

    return ClientListResponse(
        clients=[ClientResponse.model_validate(client) for client in clients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """
    Get a specific client by ID.

    Args:
        client_id: Client UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Client data

    Raises:
        401: Not authenticated
        404: Client not found
    """
    client = await ClientRepository.get_by_id(db, client_id, current_user.id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """
    Update a client.

    Args:
        client_id: Client UUID
        client_data: Client update data
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated client data

    Raises:
        401: Not authenticated
        404: Client not found
        422: Validation error
    """
    client = await ClientRepository.update(db, client_id, current_user.id, client_data)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a client.

    Args:
        client_id: Client UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Raises:
        401: Not authenticated
        404: Client not found
        409: Client has invoices (cannot delete)
    """
    success = await ClientRepository.delete(db, client_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )


@router.post("/{client_id}/deactivate", response_model=ClientResponse)
async def deactivate_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """
    Deactivate a client (soft delete).

    Args:
        client_id: Client UUID
        db: Database session (injected)
        current_user: Current authenticated user (injected)

    Returns:
        Updated client data

    Raises:
        401: Not authenticated
        404: Client not found
    """
    client = await ClientRepository.deactivate(db, client_id, current_user.id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)
