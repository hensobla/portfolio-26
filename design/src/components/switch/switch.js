/* ============================================================
   switch.js — click/keyboard flips the track's data-on state
   ============================================================ */

(function () {
  const ATTR = '[data-loom="switch"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(sw) {
    if (sw.dataset.loomInit === "true") return;
    sw.dataset.loomInit = "true";
    const track = sw.querySelector(".switch__track");
    if (!track) return;
    if (!sw.hasAttribute("tabindex")) sw.setAttribute("tabindex", "0");
    sw.setAttribute("role", "switch");
    syncAria();

    function syncAria() {
      sw.setAttribute("aria-checked", track.dataset.on === "true" ? "true" : "false");
    }

    function flip() {
      if (sw.dataset.state === "disabled") return;
      const next = track.dataset.on !== "true";
      track.dataset.on = next ? "true" : "false";
      syncAria();
      sw.dispatchEvent(new CustomEvent("loom:change", {
        detail: { on: next }, bubbles: true
      }));
    }

    sw.addEventListener("click", flip);
    sw.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { flip(); e.preventDefault(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomSwitch = { init };
})();
