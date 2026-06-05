/* ============================================================
   toggle-button.js — click flips aria-pressed
   ------------------------------------------------------------
   Dispatches `loom:toggle` (CustomEvent, detail.pressed:boolean)
   on every change so consumers can listen without a callback.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="toggle-button"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(btn) {
    if (btn.dataset.loomInit === "true") return;
    btn.dataset.loomInit = "true";
    btn.addEventListener("click", (e) => {
      if (btn.dataset.state === "disabled" || btn.hasAttribute("disabled")) return;
      const next = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", next ? "true" : "false");
      btn.dispatchEvent(new CustomEvent("loom:toggle", {
        detail: { pressed: next }, bubbles: true
      }));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomToggleButton = { init };
})();
