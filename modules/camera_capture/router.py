from botocore.exceptions import ClientError, EndpointConnectionError, NoCredentialsError
from fastapi import APIRouter, File, HTTPException, UploadFile

from modules.camera_capture import service
from modules.camera_capture.schema import PhotoResponse
from s3_client import S3ConfigError

router = APIRouter(prefix="/api/photos", tags=["camera_capture"])


@router.post("", response_model=PhotoResponse)
def upload_photo(
    low_res: UploadFile = File(...),
    high_res: UploadFile = File(...),
):
    """
    Receives the already-composited (border applied client-side) low-res
    and high-res JPEGs, uploads both to S3, and stores the resulting URLs.
    """
    low_res_bytes = low_res.file.read()
    high_res_bytes = high_res.file.read()

    if not low_res_bytes or not high_res_bytes:
        raise HTTPException(status_code=400, detail="Both low_res and high_res files are required")

    try:
        result = service.process_and_store_photo(
            low_res_bytes=low_res_bytes,
            high_res_bytes=high_res_bytes,
            low_res_content_type=low_res.content_type or "image/jpeg",
            high_res_content_type=high_res.content_type or "image/jpeg",
        )
    except (ClientError, NoCredentialsError, EndpointConnectionError, S3ConfigError) as exc:
        raise HTTPException(status_code=502, detail=f"S3 upload failed: {exc}")

    return result
