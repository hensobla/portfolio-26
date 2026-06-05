/* ============================================================
   tabs.js — click any tab to switch aria-selected
   ============================================================ */

(function () {
  const ATTR = '[data-loom="tabs"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(group) {
    if (group.dataset.loomInit === "true") return;
    group.dataset.loomInit = "true";
    const tabs = Array.from(group.querySelectorAll("button"));
    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => {
        if (tab.disabled) return;
        tabs.forEach((t) => t.setAttribute("aria-selected", t === tab ? "true" : "false"));
        group.dispatchEvent(new CustomEvent("loom:tab-change", {
          detail: { index: idx, label: tab.textContent.trim() }, bubbles: true
        }));
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { (tabs[idx + 1] || tabs[0]).focus(); e.preventDefault(); }
        if (e.key === "ArrowLeft")  { (tabs[idx - 1] || tabs[tabs.length - 1]).focus(); e.preventDefault(); }
        if (e.key === "Home") { tabs[0].focus(); e.preventDefault(); }
        if (e.key === "End")  { tabs[tabs.length - 1].focus(); e.preventDefault(); }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomTabs = { init };
})();
