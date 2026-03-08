import argparse
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Allow running from repo root (ensure `Backend/` is on sys.path).
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.user import User
from app.models.user_settings import UserSettings


def _hash_password(password: str) -> str:
    rounds = int(os.getenv("BCRYPT_COST_FACTOR", "12"))
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is required.")

    # Allow passing a sync URL; SQLAlchemy async engine requires +asyncpg.
    if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Remove libpq-only options that can break asyncpg connections.
    parts = urlsplit(url)
    if parts.query:
        query_items = [(k, v) for (k, v) in parse_qsl(parts.query, keep_blank_values=True)]
        query_items = [(k, v) for (k, v) in query_items if k != "channel_binding"]
        url = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query_items), parts.fragment)
        )
    return url


async def _run(args: argparse.Namespace) -> None:
    email = (args.email or os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = args.password or os.getenv("ADMIN_PASSWORD")

    if not email:
        raise SystemExit("Admin email is required (pass --email or set ADMIN_EMAIL).")
    if not password:
        raise SystemExit("Admin password is required (pass --password or set ADMIN_PASSWORD).")

    engine = create_async_engine(_get_database_url(), pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        existing = await session.scalar(select(User).where(User.email == email))
        now = datetime.utcnow()

        if existing is None:
            user = User(
                email=email,
                password_hash=_hash_password(password),
                first_name=args.first_name,
                last_name=args.last_name,
                business_name=args.business_name,
                is_active=not args.inactive,
                is_verified=not args.unverified,
                is_superuser=not args.not_superuser,
                verified_at=now if not args.unverified else None,
                failed_login_attempts=0,
                locked_until=None,
            )
            session.add(user)
            await session.flush()
        else:
            user = existing
            user.is_active = not args.inactive
            user.is_verified = not args.unverified
            user.is_superuser = not args.not_superuser
            user.password_hash = _hash_password(password) if args.rotate_password else user.password_hash
            user.first_name = args.first_name if args.first_name is not None else user.first_name
            user.last_name = args.last_name if args.last_name is not None else user.last_name
            user.business_name = args.business_name if args.business_name is not None else user.business_name
            if user.is_verified and user.verified_at is None:
                user.verified_at = now

        # Ensure settings row exists for the admin user (some pages assume it exists).
        settings = await session.scalar(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )
        if settings is None:
            session.add(UserSettings(user_id=user.id))

        await session.commit()

        created_or_updated = "created" if existing is None else "updated"
        print(
            f"Admin user {created_or_updated}: email={user.email} id={user.id} "
            f"is_superuser={user.is_superuser} is_active={user.is_active} is_verified={user.is_verified}"
        )

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update a FinTrack admin (superuser) account."
    )
    parser.add_argument("--email", help="Admin email (or set ADMIN_EMAIL).")
    parser.add_argument("--password", help="Admin password (or set ADMIN_PASSWORD).")
    parser.add_argument("--first-name", default=None)
    parser.add_argument("--last-name", default=None)
    parser.add_argument("--business-name", default=None)
    parser.add_argument(
        "--rotate-password",
        action="store_true",
        help="If user exists, replace their password hash with the provided password.",
    )
    parser.add_argument(
        "--not-superuser",
        action="store_true",
        help="Do not grant admin privileges (sets is_superuser=false).",
    )
    parser.add_argument(
        "--inactive",
        action="store_true",
        help="Create/update the user as inactive (sets is_active=false).",
    )
    parser.add_argument(
        "--unverified",
        action="store_true",
        help="Create/update the user as unverified (sets is_verified=false).",
    )

    asyncio.run(_run(parser.parse_args()))


if __name__ == "__main__":
    main()
