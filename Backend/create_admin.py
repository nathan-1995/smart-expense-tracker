"""
Script to create an admin superuser in the database.

Usage:
    python create_admin.py

This script will create an admin user with:
    - Email: admin@fintracker.cc
    - Password: XRingo1414 (bcrypt hashed)
    - is_superuser: True
    - is_verified: True
    - is_active: True
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password
from sqlalchemy import select


async def create_admin_user():
    """Create admin superuser in the database."""

    admin_email = "admin@fintracker.cc"
    admin_password = "XRingo1414"

    async with AsyncSessionLocal() as db:
        try:
            # Check if admin user already exists
            result = await db.execute(
                select(User).filter(User.email == admin_email)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(f"❌ Admin user '{admin_email}' already exists!")
                print(f"   User ID: {existing_user.id}")
                print(f"   Is Superuser: {existing_user.is_superuser}")
                print(f"   Is Verified: {existing_user.is_verified}")
                print(f"   Is Active: {existing_user.is_active}")

                # Ask if user wants to update existing user to superuser
                response = input("\nDo you want to make this user a superuser? (y/n): ")
                if response.lower() == 'y':
                    existing_user.is_superuser = True
                    existing_user.is_verified = True
                    existing_user.is_active = True
                    await db.commit()
                    print(f"\n✅ Updated '{admin_email}' to superuser!")
                else:
                    print("\n❌ No changes made.")
                return

            # Hash the password using bcrypt
            password_hash = hash_password(admin_password)

            # Create the admin user
            admin_user = User(
                email=admin_email,
                password_hash=password_hash,
                first_name="Admin",
                last_name="User",
                business_name="FinTracker Admin",
                is_superuser=True,
                is_verified=True,
                is_active=True,
                failed_login_attempts=0,
            )

            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

            print("=" * 60)
            print("✅ Admin user created successfully!")
            print("=" * 60)
            print(f"Email:        {admin_user.email}")
            print(f"Password:     {admin_password}")
            print(f"User ID:      {admin_user.id}")
            print(f"Is Superuser: {admin_user.is_superuser}")
            print(f"Is Verified:  {admin_user.is_verified}")
            print(f"Is Active:    {admin_user.is_active}")
            print(f"Created At:   {admin_user.created_at}")
            print("=" * 60)
            print("\n⚠️  IMPORTANT: Save these credentials securely!")
            print("You can now login at /admin with these credentials.\n")

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error creating admin user: {str(e)}")
            raise


async def main():
    """Main function to run the script."""
    print("\n" + "=" * 60)
    print("FinTrack Admin User Creation Script")
    print("=" * 60 + "\n")

    print("This script will create an admin superuser with:")
    print("  - Email: admin@fintracker.cc")
    print("  - Password: XRingo1414 (bcrypt hashed)")
    print("  - Superuser privileges: YES")
    print("  - Email verified: YES")
    print("  - Account active: YES\n")

    response = input("Do you want to proceed? (y/n): ")

    if response.lower() != 'y':
        print("\n❌ Operation cancelled.")
        return

    print("\n🔄 Creating admin user...\n")

    try:
        await create_admin_user()
    except Exception as e:
        print(f"\n❌ Failed to create admin user: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
