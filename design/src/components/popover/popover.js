/* ============================================================
   popover.js — anchor-positioned popover
   ------------------------------------------------------------
   Pattern:
     <button data-loom-popover-trigger="my-popover">Open</button>
     <div data-loom="popover" id="my-popover" hidden>…</div>

   Click the trigger to open; click outside or press Escape to close.
   The popover positions itself below the trigger by default.

   `data-loom-popover-side="top|bottom|left|right"` overrides position.

   Static [data-loom="popover"] elements on the tokens page are
   demos — they render visible without any triggers. This script
   only activates the trigger-driven mode.
   ============================================================ */

(function () {
  let current = null;

  function open(popover, trigger) {
    if (current) close();
    popover.hidden = false;
    position(popover, trigger);
    current = { popover, trigger };
    setTimeout(() => {
      document.addEventListener("click", onOutsideClick);
      document.addEventListener("keydown", onKey);
    }, 0);
  }

  function close() {
    if (!current) return;
    current.popover.hidden = true;
    document.removeEventListener("click", onOutsideClick);
    document.removeEventListener("keydown", onKey);
    if (current.trigger) current.trigger.focus();
    current = null;
  }

  function position(popover, trigger) {
    const rect = trigger.getBoundingClientRect();
    const side = trigger.getAttribute("data-loom-popover-side") || "bottom";
    const GAP = 10;

    // Make positioned & measurable
    popover.style.position = "fixed";
    popover.style.zIndex = "8500";
    popover.style.visibility = "hidden";
    popover.style.display = "inline-flex";
    popover.style.top = "0";
    popover.style.left = "0";

    const pr = popover.getBoundingClientRect();

    let top, left;
    switch (side) {
      case "top":
        top = rect.top - pr.height - GAP;
        left = rect.left + rect.width / 2 - pr.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - pr.height / 2;
        left = rect.left - pr.width - GAP;
        break;
      case "right":
        top = rect.top + rect.height / 2 - pr.height / 2;
        left = rect.right + GAP;
        break;
      case "bottom":
      default:
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2 - pr.width / 2;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    top  = Math.max(8, Math.min(top,  window.innerHeight - pr.height - 8));

    popover.style.top = top + "px";
    popover.style.left = left + "px";
    popover.style.visibility = "";
  }

  function onOutsideClick(e) {
    if (!current) return;
    if (current.popover.contains(e.target)) return;
    if (current.trigger && current.trigger.contains(e.target)) return;
    close();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function wire() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-loom-popover-trigger]");
      if (!t) return;
      const id = t.getAttribute("data-loom-popover-trigger");
      const popover = document.getElementById(id);
      if (popover) {
        e.preventDefault();
        if (current && current.popover === popover) close();
        else open(popover, t);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  window.LoomPopover = { open, close };
})();
