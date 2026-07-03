(() => {
  "use strict";

  // ---- Config -------------------------------------------------------------
  const BORDER_IMAGE_SRC = "/static/assets/border.png";
  const LOW_RES_MAX_DIMENSION = 800; // longest edge, px
  const HIGH_RES_QUALITY = 0.92; // jpeg quality 0-1
  const LOW_RES_QUALITY = 0.7;
  const COUNTDOWN_SECONDS = 5;

  // The transparent "window" inside the border, as fractions of the full
  // border image. Regenerate with `python tools/detect_window.py <path>`
  // any time the border image changes.
  const WINDOW_RECT = { left: 0.2812, top: 0.1901, right: 0.7238, bottom: 0.7669 };

  // ---- Elements -------------------------------------------------------------
  const video = document.getElementById("camera-feed");
  const viewfinder = document.querySelector(".viewfinder");
  const borderOverlay = document.getElementById("border-overlay");
  const shutter = document.getElementById("shutter-btn");
  const statusEl = document.getElementById("status");
  const flashEl = document.getElementById("flash");
  const countdownEl = document.getElementById("countdown");

  const resultModal = document.getElementById("result-modal");
  const resultImage = document.getElementById("result-image");
  const resultQr = document.getElementById("result-qr");
  const resultClose = document.getElementById("result-close");
  const takeAnotherBtn = document.getElementById("take-another-btn");

  let borderReady = false;
  let cameraReady = false;
  let resultObjectUrl = null;

  function updateShutterState() {
    shutter.disabled = !(borderReady && cameraReady);
  }

  function setStatus(message, tone) {
    statusEl.textContent = message;
    statusEl.classList.remove("error", "success");
    if (tone) statusEl.classList.add(tone);
  }

  // Sizes the on-screen viewfinder box to match the border's real aspect
  // ratio (portrait or landscape), fitted within the viewport, so what the
  // person sees while framing the shot matches the final composited output.
  function fitViewfinder() {
    if (!borderOverlay.naturalWidth) return;
    const aspect = borderOverlay.naturalWidth / borderOverlay.naturalHeight;

    const maxW = window.innerWidth * 0.94;
    const maxH = window.innerHeight * 0.72;

    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }

    viewfinder.style.width = `${Math.round(w)}px`;
    viewfinder.style.height = `${Math.round(h)}px`;

    // Position the live video feed to sit exactly where the transparent
    // window is, not across the whole box — this is what keeps the live
    // preview's crop matching the final composite's crop.
    const vx = WINDOW_RECT.left * w;
    const vy = WINDOW_RECT.top * h;
    const vw = (WINDOW_RECT.right - WINDOW_RECT.left) * w;
    const vh = (WINDOW_RECT.bottom - WINDOW_RECT.top) * h;
    video.style.left = `${vx}px`;
    video.style.top = `${vy}px`;
    video.style.width = `${vw}px`;
    video.style.height = `${vh}px`;
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitViewfinder, 120);
  });

  // ---- Camera ---------------------------------------------------------------
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      cameraReady = true;
      updateShutterState();
      setStatus("Step up to the gates and tap the shutter when you're ready.");
    } catch (err) {
      setStatus(
        "Camera access is blocked. Allow camera permissions in your browser and reload.",
        "error"
      );
    }
  }

  borderOverlay.onload = () => {
    borderReady = true;
    fitViewfinder();
    updateShutterState();
  };
  borderOverlay.onerror = () => {
    setStatus("Could not load the border image (static/assets/border.png).", "error");
  };
  borderOverlay.src = BORDER_IMAGE_SRC;

  // ---- Compositing ------------------------------------------------------------
  // Draws the current video frame into a canvas sized `targetW x targetH`,
  // cropped and scaled to exactly fill the transparent window (not the
  // whole canvas), then draws the border on top at full size. Because the
  // border's opaque pixels — including the square corners of its
  // bounding box — sit on top, they naturally mask the video down to the
  // window's actual (rounded) shape with no extra clipping code needed.
  function compositeFrame(targetW, targetH) {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    const winX = WINDOW_RECT.left * targetW;
    const winY = WINDOW_RECT.top * targetH;
    const winW = (WINDOW_RECT.right - WINDOW_RECT.left) * targetW;
    const winH = (WINDOW_RECT.bottom - WINDOW_RECT.top) * targetH;

    const videoAspect = video.videoWidth / video.videoHeight;
    const windowAspect = winW / winH;

    let sx, sy, sWidth, sHeight;
    if (videoAspect > windowAspect) {
      sHeight = video.videoHeight;
      sWidth = sHeight * windowAspect;
      sx = (video.videoWidth - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = video.videoWidth;
      sHeight = sWidth / windowAspect;
      sx = 0;
      sy = (video.videoHeight - sHeight) / 2;
    }

    // Mirror within just the window rectangle (matches the mirrored live video)
    ctx.save();
    ctx.translate(winX + winW, winY);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, winW, winH);
    ctx.restore();

    if (borderReady) {
      ctx.drawImage(borderOverlay, 0, 0, targetW, targetH);
    }

    return canvas;
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  function scaledDimensions(fullW, fullH, maxDim) {
    if (fullW <= maxDim && fullH <= maxDim) return { width: fullW, height: fullH };
    const scale = maxDim / Math.max(fullW, fullH);
    return { width: Math.round(fullW * scale), height: Math.round(fullH * scale) };
  }

  function fireFlash() {
    flashEl.classList.remove("fire");
    // restart the animation
    void flashEl.offsetWidth;
    flashEl.classList.add("fire");
  }

  // Shows a 5→1 countdown over the viewfinder, resolving once it hits zero.
  function runCountdown(seconds) {
    return new Promise((resolve) => {
      let remaining = seconds;
      countdownEl.hidden = false;
      countdownEl.setAttribute("data-count", String(remaining));

      const tick = () => {
        countdownEl.classList.remove("tick");
        void countdownEl.offsetWidth; // restart the pulse animation
        countdownEl.classList.add("tick");
      };
      tick();

      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          countdownEl.hidden = true;
          resolve();
          return;
        }
        countdownEl.setAttribute("data-count", String(remaining));
        tick();
      }, 1000);
    });
  }

  // ---- Result modal -----------------------------------------------------------
  function openResultModal(lowResBlob, highResUrl) {
    if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
    resultObjectUrl = URL.createObjectURL(lowResBlob);
    resultImage.src = resultObjectUrl;

    resultQr.innerHTML = "";
    new QRCode(resultQr, {
      text: highResUrl,
      width: 240,
      height: 240,
      colorDark: "#23132f",
      colorLight: "#f8ecd4",
      correctLevel: QRCode.CorrectLevel.M,
    });

    resultModal.classList.add("open");
  }

  function closeResultModal() {
    resultModal.classList.remove("open");
    if (resultObjectUrl) {
      URL.revokeObjectURL(resultObjectUrl);
      resultObjectUrl = null;
    }
    updateShutterState();
  }

  resultClose.addEventListener("click", closeResultModal);
  takeAnotherBtn.addEventListener("click", closeResultModal);
  resultModal.addEventListener("click", (e) => {
    if (e.target === resultModal) closeResultModal();
  });

  // ---- Capture + upload -------------------------------------------------------
  async function captureAndUpload() {
    fireFlash();
    setStatus("Printing your golden ticket…");

    try {
      const fullW = borderOverlay.naturalWidth;
      const fullH = borderOverlay.naturalHeight;
      const { width: lowW, height: lowH } = scaledDimensions(fullW, fullH, LOW_RES_MAX_DIMENSION);

      const highResCanvas = compositeFrame(fullW, fullH);
      const lowResCanvas = compositeFrame(lowW, lowH);

      const [highResBlob, lowResBlob] = await Promise.all([
        canvasToBlob(highResCanvas, HIGH_RES_QUALITY),
        canvasToBlob(lowResCanvas, LOW_RES_QUALITY),
      ]);

      const formData = new FormData();
      formData.append("low_res", lowResBlob, "low_res.jpg");
      formData.append("high_res", highResBlob, "high_res.jpg");

      const response = await fetch("/api/photos", { method: "POST", body: formData });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.detail || `Upload failed (${response.status})`);
      }

      setStatus("Step up to the gates and tap the shutter when you're ready.");
      openResultModal(lowResBlob, body.s3_url_high_res);
    } catch (err) {
      setStatus(`Couldn't upload that photo: ${err.message}`, "error");
      updateShutterState();
    }
  }

  async function handleShutterClick() {
    shutter.disabled = true;
    setStatus("Get ready…");
    await runCountdown(COUNTDOWN_SECONDS);
    await captureAndUpload();
  }

  shutter.addEventListener("click", handleShutterClick);
  startCamera();
})();
