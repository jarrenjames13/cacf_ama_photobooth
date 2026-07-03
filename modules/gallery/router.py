from fastapi import APIRouter, Query

from modules.gallery import service
from modules.gallery.schema import PhotoListResponse

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("", response_model=PhotoListResponse)
def get_gallery(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(24, ge=1, le=100, description="Photos per page"),
):
    """
    Returns one page of photos, low-res AND high-res URLs included. The
    gallery page only ever renders the low-res URL as the thumbnail; the
    high-res URL rides along and is only turned into a QR code client-side
    when the user opens a preview.
    """
    return service.list_photos(page=page, page_size=page_size)
