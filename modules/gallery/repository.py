from database import get_connection


def get_all_photos() -> list[dict]:
    """Returns all photo records, most recent first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM photos ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]
