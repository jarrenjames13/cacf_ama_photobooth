from database import get_connection


def create_photo(photo_uuid: str, s3_url_low_res: str, s3_url_high_res: str) -> dict:
    """Inserts a photo record and returns the row that was created."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO photos (uuid, s3_url_low_res, s3_url_high_res)
            VALUES (?, ?, ?)
            """,
            (photo_uuid, s3_url_low_res, s3_url_high_res),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM photos WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict(row)
