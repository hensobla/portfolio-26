/* ============================================================
   brand.js — nav brand area logo wiring
   ------------------------------------------------------------
   Renders the optional user logo to the left of the Loomling
   mark in every Loom view. Resolution order:

     1. localStorage["loomling:user-logo:v1"]  (live preview)
     2. project.json.logo  (path saved to disk, fetched if 1 is empty)
     3. nothing — user logo + separator stay hidden

   Loaded on every Loom HTML alongside theme.js. Listens for the
   "loomling:user-logo-changed" event so the Settings page can
   trigger a re-render without a reload.
   ============================================================ */

(function () {
  const STORAGE_KEY = "loomling:user-logo:v1";

  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  async function resolveLogoSrc() {
    const stored = readStored();
    if (stored && stored.dataUrl) return stored.dataUrl;
    // Disk fallback — only fires when localStorage is empty.
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.logo) {
        // project.json.logo is a path relative to project root.
        // Loom pages live in /library/, so resolve as ../<path>.
        return "../" + String(json.logo).replace(/^\/+/, "");
      }
    } catch { /* no project.json */ }
    return null;
  }

  function render(src) {
    const img = document.querySelector(".lib-brand__user-logo");
    const sep = document.querySelector(".lib-brand__sep");
    if (!img || !sep) return;
    if (src) {
      img.src = src;
      img.hidden = false;
      sep.hidden = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
      sep.hidden = true;
    }
  }

  async function refresh() {
    const src = await resolveLogoSrc();
    render(src);
  }

  const Brand = {
    refresh,
    /* Called by settings.js after upload / clear so other open Loom views
       (and the Settings page's own nav preview) update without a reload. */
    set(dataUrl, meta) {
      try {
        if (dataUrl) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ dataUrl, ...meta }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch { /* quota / private — silent */ }
      render(dataUrl);
      document.dispatchEvent(new CustomEvent("loomling:user-logo-changed", {
        detail: { src: dataUrl || null }
      }));
    },
    get() { return readStored(); },
  };

  window.Brand = Brand;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
