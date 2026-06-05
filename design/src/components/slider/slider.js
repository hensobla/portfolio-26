/* ============================================================
   slider.js — drag interaction for [data-loom="slider"]
   ------------------------------------------------------------
   Pointer-driven thumb drag. Updates the fill width + thumb
   position + value label in sync. Honors data-state="disabled"
   and data-min/data-max attributes (default 0–100).

   Auto-initializes every slider in the document on DOMContentLoaded.
   Idempotent — safe to call init() multiple times.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="slider"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(slider) {
    if (slider.dataset.loomInit === "true") return;
    slider.dataset.loomInit = "true";

    const track = slider.querySelector(".slider__track");
    const fill  = slider.querySelector(".slider__fill");
    const thumb = slider.querySelector(".slider__thumb");
    const value = slider.querySelector(".slider__value");
    if (!track || !fill || !thumb) return;

    const min = parseFloat(slider.dataset.min ?? 0);
    const max = parseFloat(slider.dataset.max ?? 100);
    const suffix = slider.dataset.suffix ?? "%";

    let pct = parsePctFromStyle(fill.style.width, 50);

    function render() {
      fill.style.width = pct + "%";
      thumb.style.left = pct + "%";
      if (value) {
        const v = Math.round(min + (pct / 100) * (max - min));
        value.textContent = v + suffix;
      }
    }

    function pctFromEvent(e) {
      const rect = track.getBoundingClientRect();
      const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
      return Math.max(0, Math.min(100, (x / rect.width) * 100));
    }

    function onMove(e) {
      if (slider.dataset.state === "disabled") return;
      pct = pctFromEvent(e);
      render();
      e.preventDefault();
    }

    function endDrag() {
      slider.dataset.dragging = "false";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", endDrag);
    }

    function startDrag(e) {
      if (slider.dataset.state === "disabled") return;
      slider.dataset.dragging = "true";
      pct = pctFromEvent(e);
      render();
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", endDrag);
      thumb.focus();
    }

    // Keyboard nav (when thumb is focusable — adding tabindex)
    if (!thumb.hasAttribute("tabindex")) thumb.setAttribute("tabindex", "0");
    thumb.addEventListener("keydown", (e) => {
      if (slider.dataset.state === "disabled") return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowRight" || e.key === "ArrowUp")   { pct = Math.min(100, pct + step); render(); e.preventDefault(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowDown") { pct = Math.max(0,   pct - step); render(); e.preventDefault(); }
      if (e.key === "Home") { pct = 0;   render(); e.preventDefault(); }
      if (e.key === "End")  { pct = 100; render(); e.preventDefault(); }
    });

    track.addEventListener("pointerdown", startDrag);
    thumb.addEventListener("pointerdown", startDrag);

    render();
  }

  function parsePctFromStyle(str, fallback) {
    const m = String(str || "").match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : fallback;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose so other scripts (primitives.js after dynamic injection)
  // can re-run initialization on newly-mounted sliders.
  window.LoomSlider = { init };
})();
