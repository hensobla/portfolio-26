/* ============================================================
   alert.js — click .alert__close to dismiss
   ------------------------------------------------------------
   Dispatches `loom:alert-dismiss` before removing the alert,
   so consumers can react (e.g., re-show it after a timeout).
   The default action is to remove the alert from the DOM.
   Cancel the event with preventDefault() to keep it visible.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="alert"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(alert) {
    if (alert.dataset.loomInit === "true") return;
    alert.dataset.loomInit = "true";
    const closeBtn = alert.querySelector(".alert__close");
    if (!closeBtn) return;
    closeBtn.addEventListener("click", () => {
      const ev = new CustomEvent("loom:alert-dismiss", {
        cancelable: true, bubbles: true,
        detail: { tone: alert.dataset.tone || "info" }
      });
      const ok = alert.dispatchEvent(ev);
      if (ok) {
        alert.style.transition = "opacity 180ms ease, margin 180ms ease, transform 180ms ease";
        alert.style.opacity = "0";
        alert.style.transform = "translateY(-4px)";
        setTimeout(() => alert.remove(), 200);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomAlert = { init };
})();
