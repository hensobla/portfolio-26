/* ============================================================
   tag.js — click the X icon (when present) to remove the tag
   ------------------------------------------------------------
   Tags without a child <i class="ph-x"> are non-interactive
   (the wire pass skips them).
   ============================================================ */

(function () {
  const ATTR = '[data-loom="tag"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(tag) {
    if (tag.dataset.loomInit === "true") return;
    tag.dataset.loomInit = "true";
    const closeIcon = tag.querySelector("i.ph-x");
    if (!closeIcon) return;
    closeIcon.style.cursor = "pointer";
    closeIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      const ev = new CustomEvent("loom:tag-remove", {
        cancelable: true, bubbles: true,
        detail: { label: tag.textContent.trim() }
      });
      const ok = tag.dispatchEvent(ev);
      if (ok) {
        tag.style.transition = "opacity 150ms ease, transform 150ms ease";
        tag.style.opacity = "0";
        tag.style.transform = "scale(0.9)";
        setTimeout(() => tag.remove(), 160);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomTag = { init };
})();
