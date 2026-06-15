"""
Global pytest fixtures and configuration for Phase 18 Testing & Quality
"""
import os
import sys

# Set env vars BEFORE importing backend modules
if not os.getenv("ALLOWED_HOSTS"):
    os.environ["ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"
# Use SQLite so tests run without a PostgreSQL server
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_tpt.db")
os.environ["TESTING"] = "true"

# Add backend directory to path so local imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import asyncio
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, String, Integer, event as sa_event
from sqlalchemy.sql.schema import ColumnDefault
from sqlalchemy.dialects.postgresql import JSONB, INET, ENUM
from uuid import uuid4 as _uuid4

from models import Base
from database import engine, SessionLocal


# Patch all PostgreSQL-specific column types so SQLite can create the schema.
for table in Base.metadata.tables.values():
    for col in table.c:
        type_name = type(col.type).__name__
        if type_name == 'JSONB':
            col.type = JSON()
        elif type_name == 'INET':
            col.type = String(45)
        elif type_name == 'UUID':
            col.type = String(36)
            # Ensure the default produces strings (not UUID objects)
            if col.default is not None and callable(getattr(col.default, 'arg', None)):
                col.default = ColumnDefault(lambda: str(_uuid4()))
        elif type_name == 'ENUM':
            col.type = String(50)
        elif type_name == 'Geography':
            col.type = String(255)
        elif type_name == 'ARRAY':
            col.type = JSON()
        elif type_name == 'BigInteger' and col.primary_key:
            col.type = Integer()


# Convert enum and UUID values to strings on bind for SQLite
def _coerce(v):
    if v is None:
        return None
    if hasattr(v, 'value') and not isinstance(v, (str, int, float, bytes, bool)):
        return v.value  # Python enum → string value
    if hasattr(v, 'int') and hasattr(v, 'hex') and not isinstance(v, (str, int)):
        return str(v)  # UUID object → string
    return v


@sa_event.listens_for(engine, "before_cursor_execute", retval=True)
def _coerce_pg_types(conn, cursor, statement, parameters, context, executemany):
    if isinstance(parameters, (list, tuple)):
        if parameters and isinstance(parameters[0], dict):
            parameters = [{k: _coerce(val) for k, val in p.items()} for p in parameters]
        else:
            parameters = [_coerce(v) for v in parameters]
    elif isinstance(parameters, dict):
        parameters = {k: _coerce(v) for k, v in parameters.items()}
    return statement, parameters

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

from main import app, limiter

# Disable rate limiting in tests by resetting storage before each test module load
limiter._storage.reset()


@pytest.fixture(autouse=True)
def reset_test_state():
    """Clear all DB tables and reset rate limiter between tests."""
    limiter._storage.reset()
    # Truncate all tables (reverse order to respect FK constraints)
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def db_session() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def test_user_credentials():
    return {
        "email": "test@tpt.local",
        "password": "TestPassword123!",
        "organisation": "Test Organisation"
    }
