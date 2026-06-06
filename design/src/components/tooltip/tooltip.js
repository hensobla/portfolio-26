/* ============================================================
   tooltip.js — hover-triggered tooltip for `[data-loom-tooltip]`
   ------------------------------------------------------------
   Pattern: any element with `data-loom-tooltip="text here"` and
   optional `data-loom-tooltip-side="top|bottom|left|right"`
   (default "top") gets a tooltip on hover/focus.

   The static [data-loom="tooltip"] elements on the tokens page
   are visual demos — this script doesn't touch them. It only
   provides the dynamic hover behavior for production usage.
   ============================================================ */

(function () {
  let current = null;
  // The tooltipped element the tooltip belongs to. Used to bail out of
  // mouseover events that bubble up from child nodes (icon → label → button
  // would otherwise flicker the tooltip on every nested pointer transit).
  let currentTarget = null;

  function show(target) {
    if (currentTarget === target) return;
    if (current) hide();
    const text = target.getAttribute("data-loom-tooltip");
    const side = target.getAttribute("data-loom-tooltip-side") || "top";
    if (!text) return;

    const tip = document.createElement("span");
    tip.setAttribute("data-loom", "tooltip");
    tip.setAttribute("data-side", side);
    tip.style.position = "fixed";
    tip.style.zIndex = "9100";
    tip.style.pointerEvents = "none";
    tip.innerHTML = "<span></span>";
    tip.querySelector("span").textContent = text;
    document.body.appendChild(tip);

    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const GAP = 8;

    let top, left;
    switch (side) {
      case "bottom":
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.left - tipRect.width - GAP;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.right + GAP;
        break;
      case "top":
      default:
        top = rect.top - tipRect.height - GAP;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
    }

    // Keep inside viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    top  = Math.max(8, Math.min(top,  window.innerHeight - tipRect.height - 8));

    tip.style.top = top + "px";
    tip.style.left = left + "px";
    current = tip;
    currentTarget = target;
  }

  function hide() {
    if (current) { current.remove(); current = null; }
    currentTarget = null;
  }

  function wire() {
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-loom-tooltip]");
      if (t) show(t);
    });
    document.addEventListener("mouseout", (e) => {
      const t = e.target.closest("[data-loom-tooltip]");
      if (!t) return;
      // If the cursor moved to another descendant of the same tooltipped
      // element, the user is still hovering it — don't hide.
      const next = e.relatedTarget;
      if (next && t.contains(next)) return;
      hide();
    });
    document.addEventListener("focusin", (e) => {
      const t = e.target.closest("[data-loom-tooltip]");
      if (t) show(t);
    });
    document.addEventListener("focusout", () => hide());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  window.LoomTooltip = { show, hide };
})();
