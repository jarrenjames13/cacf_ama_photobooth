from pydantic import BaseModel


class PhotoResponse(BaseModel):
    id: int
    uuid: str
    s3_url_low_res: str
    s3_url_high_res: str
    created_at: str
