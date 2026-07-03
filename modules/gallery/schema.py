from pydantic import BaseModel


class PhotoItem(BaseModel):
    id: int
    uuid: str
    s3_url_low_res: str
    s3_url_high_res: str
    created_at: str


class PhotoListResponse(BaseModel):
    photos: list[PhotoItem]
    page: int
    page_size: int
    total: int
    total_pages: int
