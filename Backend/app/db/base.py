from sqlalchemy.orm import declarative_base

# Declarative base for all ORM models.
#
# Kept separate from engine/session creation so Alembic (and model imports)
# don't require application settings to be present.
Base = declarative_base()

