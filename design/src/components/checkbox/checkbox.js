/* ============================================================
   checkbox.js — click/keyboard flips the box's data-checked
   ------------------------------------------------------------
   Cycles unchecked → checked → (back to unchecked). The
   "mixed" / indeterminate state is set programmatically only
   (clicking it clears to unchecked, matching native semantics).
   ============================================================ */

(function () {
  const ATTR = '[data-loom="checkbox"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(cb) {
    if (cb.dataset.loomInit === "true") return;
    cb.dataset.loomInit = "true";
    const box = cb.querySelector(".checkbox__box");
    if (!box) return;
    if (!cb.hasAttribute("tabindex")) cb.setAttribute("tabindex", "0");
    cb.setAttribute("role", "checkbox");
    syncAria();

    function syncAria() {
      const v = box.dataset.checked;
      cb.setAttribute("aria-checked", v === "mixed" ? "mixed" : (v === "true" ? "true" : "false"));
    }

    function flip() {
      if (cb.dataset.state === "disabled") return;
      const cur = box.dataset.checked;
      // Mixed → unchecked; otherwise toggle true ↔ false
      box.dataset.checked = (cur === "true") ? "false" : "true";
      syncAria();
      cb.dispatchEvent(new CustomEvent("loom:change", {
        detail: { checked: box.dataset.checked === "true" }, bubbles: true
      }));
    }

    cb.addEventListener("click", flip);
    cb.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { flip(); e.preventDefault(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomCheckbox = { init };
})();
