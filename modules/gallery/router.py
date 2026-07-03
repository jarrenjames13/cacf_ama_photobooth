from fastapi import APIRouter

from modules.gallery import service
from modules.gallery.schema import PhotoListResponse

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("", response_model=PhotoListResponse)
def get_gallery():
    """
    Returns every photo's low-res AND high-res URLs. The gallery page only
    ever renders the low-res URL as the thumbnail; the high-res URL rides
    along in this same response and is only turned into a QR code
    client-side when the user opens a preview.
    """
    return {"photos": service.list_photos()}
