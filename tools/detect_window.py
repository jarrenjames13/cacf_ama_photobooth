"""
Detects the transparent "window" rectangle inside a border PNG and prints
the fractional coordinates to paste into WINDOW_RECT in static/js/capture.js.

Run this any time you swap in a new border image:

    python tools/detect_window.py static/assets/border.png

Requires Pillow and numpy (dev-only, not part of requirements.txt since the
running app never needs this):

    pip install pillow numpy
"""
import sys

from PIL import Image
import numpy as np


def detect_window(path: str, alpha_threshold: int = 15) -> dict:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    alpha = np.array(img.split()[3])

    mask = alpha < alpha_threshold
    if not mask.any():
        raise ValueError("No transparent pixels found — is this border fully opaque?")

    ys, xs = np.where(mask)
    left, right = int(xs.min()), int(xs.max())
    top, bottom = int(ys.min()), int(ys.max())

    return {
        "image_size": (w, h),
        "pixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "fractions": {
            "left": round(left / w, 4),
            "top": round(top / h, 4),
            "right": round(right / w, 4),
            "bottom": round(bottom / h, 4),
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python tools/detect_window.py <path-to-border.png>")
        sys.exit(1)

    result = detect_window(sys.argv[1])
    f = result["fractions"]

    print(f"Image size: {result['image_size']}")
    print(f"Window (pixels): {result['pixels']}")
    print()
    print("Paste this into WINDOW_RECT in static/js/capture.js:")
    print(
        "  const WINDOW_RECT = "
        f"{{ left: {f['left']}, top: {f['top']}, right: {f['right']}, bottom: {f['bottom']} }};"
    )
