import uuid as uuid_lib

from modules.camera_capture import repository
from s3_client import build_key, upload_file_to_s3


def process_and_store_photo(
    low_res_bytes: bytes,
    high_res_bytes: bytes,
    low_res_content_type: str,
    high_res_content_type: str,
) -> dict:
    """
    Uploads both resolutions to S3 under the same photo uuid, then writes
    the resulting URLs to SQLite. The uuid is generated once here so the
    S3 key prefix and the DB row are guaranteed to line up.
    """
    photo_uuid = str(uuid_lib.uuid4())
    low_res_key = build_key("photos", photo_uuid, "low_res.jpg")
    high_res_key = build_key("photos", photo_uuid, "high_res.jpg")

    low_res_url = upload_file_to_s3(low_res_bytes, low_res_key, low_res_content_type)
    high_res_url = upload_file_to_s3(high_res_bytes, high_res_key, high_res_content_type)

    return repository.create_photo(photo_uuid, low_res_url, high_res_url)
