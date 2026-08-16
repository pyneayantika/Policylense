"""
Create the SQLite file and schema.

WHY a script: first-run setup is one command, not hidden only inside API startup.
`python db/init_db.py` puts this file's folder on sys.path, so we add the
backend root explicitly.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings
from db.database import create_all_tables


def main() -> None:
    path = get_settings().sqlite_path
    create_all_tables()
    print(f"Database initialized at {path}")


if __name__ == "__main__":
    main()
