from typing import Optional
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


class ClientRepository:
    """Repository for Client database operations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, client_id: UUID, user_id: UUID) -> Optional[Client]:
        """
        Get client by ID for a specific user.

        Args:
            db: Database session
            client_id: Client UUID
            user_id: User UUID (for authorization)

        Returns:
            Client object or None if not found
        """
        result = await db.execute(
            select(Client).filter(Client.id == client_id, Client.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> tuple[list[Client], int]:
        """
        Get all clients for a user with pagination.

        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            is_active: Filter by active status (optional)

        Returns:
            Tuple of (clients list, total count)
        """
        query = select(Client).filter(Client.user_id == user_id)

        if is_active is not None:
            query = query.filter(Client.is_active == is_active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Client.name)
        result = await db.execute(query)
        clients = result.scalars().all()

        return list(clients), total

    @staticmethod
    async def create(db: AsyncSession, user_id: UUID, client_data: ClientCreate) -> Client:
        """
        Create a new client.

        Args:
            db: Database session
            user_id: User UUID
            client_data: Client creation data

        Returns:
            Created Client object
        """
        client = Client(
            user_id=user_id,
            name=client_data.name,
            email=client_data.email,
            phone=client_data.phone,
            address=client_data.address,
            city=client_data.city,
            country=client_data.country,
            currency=client_data.currency,
            tax_id=client_data.tax_id,
            notes=client_data.notes,
            is_active=client_data.is_active,
        )

        db.add(client)
        await db.commit()
        await db.refresh(client)

        return client

    @staticmethod
    async def update(
        db: AsyncSession, client_id: UUID, user_id: UUID, client_data: ClientUpdate
    ) -> Optional[Client]:
        """
        Update a client.

        Args:
            db: Database session
            client_id: Client UUID
            user_id: User UUID (for authorization)
            client_data: Client update data

        Returns:
            Updated Client object or None if not found
        """
        client = await ClientRepository.get_by_id(db, client_id, user_id)
        if not client:
            return None

        update_data = client_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(client, field, value)

        await db.commit()
        await db.refresh(client)

        return client

    @staticmethod
    async def delete(db: AsyncSession, client_id: UUID, user_id: UUID) -> bool:
        """
        Delete a client (hard delete).

        Args:
            db: Database session
            client_id: Client UUID
            user_id: User UUID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        client = await ClientRepository.get_by_id(db, client_id, user_id)
        if not client:
            return False

        await db.delete(client)
        await db.commit()

        return True

    @staticmethod
    async def deactivate(db: AsyncSession, client_id: UUID, user_id: UUID) -> Optional[Client]:
        """
        Deactivate a client (soft delete).

        Args:
            db: Database session
            client_id: Client UUID
            user_id: User UUID (for authorization)

        Returns:
            Updated Client object or None if not found
        """
        client = await ClientRepository.get_by_id(db, client_id, user_id)
        if not client:
            return None

        client.is_active = False
        await db.commit()
        await db.refresh(client)

        return client
