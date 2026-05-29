import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "synapse.db"
SCHEMA_PATH = BASE_DIR / "synapse_schema.sql"


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    with sqlite3.connect(DB_PATH) as conn:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sql = f.read()
        conn.executescript(sql)
        conn.commit()

    print(f"Created SQLite DB at: {DB_PATH}")


if __name__ == "__main__":
    main()
