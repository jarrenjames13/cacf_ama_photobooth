from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from modules.camera_capture.router import router as camera_capture_router  # noqa: E402
from database import init_db  # noqa: E402
from modules.gallery.router import router as gallery_router  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Photobooth")

init_db()

app.include_router(camera_capture_router)
app.include_router(gallery_router)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/")
def serve_capture_page():
    return FileResponse(BASE_DIR / "static" / "templates" / "capture.html")


@app.get("/gallery")
def serve_gallery_page():
    return FileResponse(BASE_DIR / "static" / "templates" / "gallery.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)