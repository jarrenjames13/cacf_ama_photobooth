(() => {
  "use strict";

  const grid = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("empty-state");
  const modal = document.getElementById("preview-modal");
  const previewImage = document.getElementById("preview-image");
  const qrContainer = document.getElementById("qr-code");
  const modalClose = document.getElementById("modal-close");

  const pagination = document.getElementById("pagination");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageInfo = document.getElementById("page-info");

  const PAGE_SIZE = 24;
  let currentPage = 1;

  let qrCodeInstance = null;

  function renderPhoto(photo) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";
    item.setAttribute("aria-label", "Open photo preview and QR code");

    const img = document.createElement("img");
    img.src = photo.s3_url_low_res;
    img.alt = "";
    img.loading = "lazy";
    item.appendChild(img);

    item.addEventListener("click", () => openPreview(photo));
    grid.appendChild(item);
  }

  function openPreview(photo) {
    previewImage.src = photo.s3_url_low_res;

    // The QR code is built fresh here, in the browser, from the high-res
    // URL that already came down with the gallery list — it is never
    // generated on the server and never stored anywhere.
    qrContainer.innerHTML = "";
    // The URL being encoded is long (bucket + region + prefix + uuid), so
    // the library's default correctLevel (H, highest redundancy) forces an
    // unnecessarily dense code that's too fine to scan reliably at modal
    // size. M is still plenty robust for a clean digital screen and keeps
    // modules bigger/easier to resolve; a larger render size helps too.
    qrCodeInstance = new QRCode(qrContainer, {
      text: photo.s3_url_high_res,
      width: 240,
      height: 240,
      colorDark: "#23132f",
      colorLight: "#f8ecd4",
      correctLevel: QRCode.CorrectLevel.M,
    });

    modal.classList.add("open");
    modalClose.focus();
  }

  function closePreview() {
    modal.classList.remove("open");
  }

  modalClose.addEventListener("click", closePreview);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closePreview();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePreview();
  });

  async function loadGallery(page) {
    grid.innerHTML = "";
    emptyState.hidden = true;
    pagination.hidden = true;

    try {
      const response = await fetch(`/api/gallery?page=${page}&page_size=${PAGE_SIZE}`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();

      currentPage = data.page;

      if (!data.total) {
        emptyState.textContent = "No golden tickets yet — step up and take the first one.";
        emptyState.hidden = false;
        return;
      }

      data.photos.forEach(renderPhoto);

      if (data.total_pages > 1) {
        pagination.hidden = false;
        pageInfo.textContent = `Page ${data.page} of ${data.total_pages}`;
        prevBtn.disabled = data.page <= 1;
        nextBtn.disabled = data.page >= data.total_pages;
      }
    } catch (err) {
      emptyState.textContent = "Couldn't load photos. Refresh to try again.";
      emptyState.hidden = false;
    }
  }

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      loadGallery(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  nextBtn.addEventListener("click", () => {
    loadGallery(currentPage + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  loadGallery(1);
})();
