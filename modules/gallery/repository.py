from modules.database import get_connection


def get_photos_page(offset: int, limit: int) -> list[dict]:
    """Returns one page of photo records, most recent first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [dict(row) for row in rows]


def count_photos() -> int:
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM photos").fetchone()
        return row["c"]
