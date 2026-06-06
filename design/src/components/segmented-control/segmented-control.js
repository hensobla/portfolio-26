/* ============================================================
   segmented-control.js — click any segment to switch selection
   ============================================================ */

(function () {
  const ATTR = '[data-loom="segmented-control"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(group) {
    if (group.dataset.loomInit === "true") return;
    group.dataset.loomInit = "true";
    const segs = Array.from(group.querySelectorAll("button"));
    segs.forEach((seg, idx) => {
      seg.addEventListener("click", () => {
        if (seg.disabled) return;
        segs.forEach((s) => s.setAttribute("aria-selected", s === seg ? "true" : "false"));
        group.dispatchEvent(new CustomEvent("loom:change", {
          detail: { index: idx, value: seg.textContent.trim() }, bubbles: true
        }));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomSegmentedControl = { init };
})();
