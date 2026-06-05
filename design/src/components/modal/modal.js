/* ============================================================
   modal.js — show/hide, focus trap, escape, backdrop click
   ------------------------------------------------------------
   Self-contained modal infrastructure. Two ways to use:

   1. **API:** `LoomModal.open(panelEl)` / `LoomModal.close(panelEl)`.
      Wraps the panel in a backdrop, traps focus, returns focus
      to the previously-focused element on close. Escape closes.

   2. **Declarative:** any element with `data-loom-modal-open="<id>"`
      opens the modal whose id is "<id>" on click. Inside the
      modal, any element with `data-loom-modal-close` closes it.

   Auto-wires declarative bindings on DOMContentLoaded.
   ============================================================ */

(function () {
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const stack = [];   // stack of open backdrops, top is active

  function open(panel) {
    if (!panel || panel.dataset.loomOpen === "true") return;
    const previousFocus = document.activeElement;
    panel.dataset.loomOpen = "true";
    panel.dataset.loomPrevFocus = "";

    // Build backdrop and float the panel into it
    const backdrop = document.createElement("div");
    backdrop.className = "loom-modal-backdrop";
    Object.assign(backdrop.style, {
      position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)",
      display: "grid", placeItems: "center", zIndex: "9000",
      backdropFilter: "blur(2px)"
    });

    // Park panel in backdrop, remember its original parent for restoration
    const home = panel.parentNode;
    const homeNext = panel.nextSibling;
    panel.__loomHome = { home, homeNext };
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(panel);
    });

    stack.push({ panel, backdrop, previousFocus });
    document.addEventListener("keydown", onKey);

    // Focus the first focusable inside the panel
    setTimeout(() => {
      const first = panel.querySelector(FOCUSABLE);
      (first || panel).focus();
    }, 0);

    panel.dispatchEvent(new CustomEvent("loom:modal-open", { bubbles: true }));
  }

  function close(panel) {
    const idx = stack.findIndex((s) => s.panel === panel);
    if (idx < 0) return;
    const { backdrop, previousFocus } = stack[idx];
    stack.splice(idx, 1);
    if (stack.length === 0) document.removeEventListener("keydown", onKey);

    // Restore panel to original parent
    const home = panel.__loomHome;
    if (home && home.home) home.home.insertBefore(panel, home.homeNext);
    backdrop.remove();
    panel.dataset.loomOpen = "false";
    delete panel.dataset.loomPrevFocus;

    if (previousFocus && previousFocus.focus) previousFocus.focus();
    panel.dispatchEvent(new CustomEvent("loom:modal-close", { bubbles: true }));
  }

  function onKey(e) {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === "Escape") { close(top.panel); e.preventDefault(); return; }
    if (e.key === "Tab") {
      // Focus trap
      const items = Array.from(top.panel.querySelectorAll(FOCUSABLE))
        .filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function wireDeclarative() {
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-loom-modal-open]");
      if (opener) {
        const id = opener.getAttribute("data-loom-modal-open");
        const panel = document.getElementById(id);
        if (panel) { open(panel); e.preventDefault(); }
        return;
      }
      const closer = e.target.closest("[data-loom-modal-close]");
      if (closer) {
        const panel = closer.closest('[data-loom="modal"]');
        if (panel) { close(panel); e.preventDefault(); }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireDeclarative);
  } else {
    wireDeclarative();
  }

  window.LoomModal = { open, close };
})();
