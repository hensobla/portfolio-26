/* ============================================================
   pagination.js — click numbered button to switch aria-current
   ------------------------------------------------------------
   Prev/next buttons step ±1 within the available numbered set.
   Disabled boundary buttons are honored.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="pagination"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(nav) {
    if (nav.dataset.loomInit === "true") return;
    nav.dataset.loomInit = "true";
    const buttons = Array.from(nav.querySelectorAll("button"));
    const pageButtons = buttons.filter((b) => /^\d+$/.test(b.textContent.trim()));
    if (pageButtons.length === 0) return;

    const isPrev = (b) => b === buttons[0] && b.querySelector(".ph-caret-left");
    const isNext = (b) => b === buttons[buttons.length - 1] && b.querySelector(".ph-caret-right");

    function setCurrent(btn) {
      pageButtons.forEach((b) => {
        if (b === btn) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
      nav.dispatchEvent(new CustomEvent("loom:page-change", {
        detail: { page: parseInt(btn.textContent.trim(), 10) }, bubbles: true
      }));
    }

    function findCurrent() {
      return pageButtons.find((b) => b.getAttribute("aria-current") === "page") || pageButtons[0];
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        if (isPrev(btn)) {
          const cur = findCurrent();
          const idx = pageButtons.indexOf(cur);
          if (idx > 0) setCurrent(pageButtons[idx - 1]);
        } else if (isNext(btn)) {
          const cur = findCurrent();
          const idx = pageButtons.indexOf(cur);
          if (idx >= 0 && idx < pageButtons.length - 1) setCurrent(pageButtons[idx + 1]);
        } else if (pageButtons.includes(btn)) {
          setCurrent(btn);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomPagination = { init };
})();
