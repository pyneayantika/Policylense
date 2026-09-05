"""
SQLite engine and session factory.

WHY: FastAPI request handlers and scripts (init_db, seed_demo) must share
one database file. A single engine avoids 'I wrote data in script A and
API B cannot see it' bugs during the demo.
"""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from config import get_settings
from db.models import Base


def _ensure_sqlite_dir(sqlite_path: str) -> None:
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)


def _set_sqlite_pragmas(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def get_engine():
    settings = get_settings()
    _ensure_sqlite_dir(settings.sqlite_path)
    eng = create_engine(
        f"sqlite:///{settings.sqlite_path}",
        connect_args={"check_same_thread": False},
    )
    event.listen(eng, "connect", _set_sqlite_pragmas)
    return eng


engine = get_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables() -> None:
    """Create tables from ORM models (Arch §5.1). Recreate if the local schema is stale."""
    try:
        inspector = inspect(engine)
        if "policy_facts" in inspector.get_table_names():
            columns = {col["name"] for col in inspector.get_columns("policy_facts")}
            if "copay_condition" not in columns:
                print("[db] stale schema detected; recreating tables")
                Base.metadata.drop_all(bind=engine)
    except Exception as exc:
        print(f"[db] schema inspection failed ({exc}); rebuilding database")
        _remove_corrupt_db()
    Base.metadata.create_all(bind=engine)
    _ensure_column("policy", "ingestion_error", "TEXT")
    print(f"[db] Tables ready at {get_settings().sqlite_path}")


def _remove_corrupt_db() -> None:
    """Delete a corrupt SQLite file and its journal/WAL so tables can be recreated."""
    db_path = Path(get_settings().sqlite_path)
    for suffix in ("", "-wal", "-shm", "-journal"):
        p = db_path.parent / (db_path.name + suffix)
        if p.exists():
            p.unlink()
            print(f"[db] removed {p.name}")


def _ensure_column(table: str, column: str, ddl_type: str) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    cols = {col["name"] for col in inspector.get_columns(table)}
    if column in cols:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
    print(f"[db] added {table}.{column}")
