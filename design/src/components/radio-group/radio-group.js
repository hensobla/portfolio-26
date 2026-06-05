/* ============================================================
   radio-group.js — click any label to select that radio
   ============================================================ */

(function () {
  const ATTR = '[data-loom="radio-group"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(group) {
    if (group.dataset.loomInit === "true") return;
    group.dataset.loomInit = "true";
    const labels = Array.from(group.querySelectorAll("label"));
    if (labels.length === 0) return;

    labels.forEach((label, idx) => {
      const radio = label.querySelector(".radio");
      if (!radio) return;
      label.setAttribute("role", "radio");
      label.setAttribute("tabindex", "0");

      const select = () => {
        if (label.dataset.state === "disabled") return;
        labels.forEach((l) => {
          const r = l.querySelector(".radio");
          if (r) r.dataset.selected = (l === label) ? "true" : "false";
          l.setAttribute("aria-checked", l === label ? "true" : "false");
        });
        const text = label.querySelector("span:last-child")?.textContent?.trim();
        group.dispatchEvent(new CustomEvent("loom:change", {
          detail: { index: idx, value: text }, bubbles: true
        }));
      };

      label.addEventListener("click", select);
      label.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { select(); e.preventDefault(); }
        else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          labels[(idx + 1) % labels.length].focus();
          e.preventDefault();
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          labels[(idx - 1 + labels.length) % labels.length].focus();
          e.preventDefault();
        }
      });
    });

    // Initial aria sync from existing data-selected markup
    labels.forEach((l) => {
      const r = l.querySelector(".radio");
      l.setAttribute("aria-checked", r?.dataset.selected === "true" ? "true" : "false");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomRadioGroup = { init };
})();
