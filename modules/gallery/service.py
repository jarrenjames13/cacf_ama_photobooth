from modules.gallery import repository


def list_photos() -> list[dict]:
    return repository.get_all_photos()
