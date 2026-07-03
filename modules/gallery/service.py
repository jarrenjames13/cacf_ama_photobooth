from modules.gallery import repository

DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100


def list_photos(page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> dict:
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)

    total = repository.count_photos()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(max(1, page), total_pages)  # clamp out-of-range requests instead of erroring

    offset = (page - 1) * page_size
    photos = repository.get_photos_page(offset=offset, limit=page_size)

    return {
        "photos": photos,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
