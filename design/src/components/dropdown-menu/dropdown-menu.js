/* ============================================================
   dropdown-menu.js — declarative trigger + item selection
   ------------------------------------------------------------
   The static [data-loom="dropdown-menu"] markup is the visual
   demo (always-open). For runtime behavior:

   <button data-loom-dropdown-trigger="<id>">Actions</button>
   <div data-loom="dropdown-menu" id="<id>" hidden>…</div>

   Click trigger to open below it. Click outside or press Escape
   to close. Clicking a menuitem fires `loom:menu-select`
   (detail: { label }) and closes the menu. Arrow keys move focus
   between items; Enter activates.
   ============================================================ */

(function () {
  let openMenu = null;
  let openTrigger = null;

  function open(menu, trigger) {
    if (openMenu) close();
    menu.hidden = false;
    position(menu, trigger);
    openMenu = menu; openTrigger = trigger;
    const items = focusableItems(menu);
    if (items[0]) items[0].focus();
    setTimeout(() => {
      document.addEventListener("click", onOutsideClick);
      document.addEventListener("keydown", onKey);
    }, 0);
  }

  function close() {
    if (!openMenu) return;
    openMenu.hidden = true;
    document.removeEventListener("click", onOutsideClick);
    document.removeEventListener("keydown", onKey);
    if (openTrigger) openTrigger.focus();
    openMenu = null; openTrigger = null;
  }

  function position(menu, trigger) {
    menu.style.position = "fixed";
    menu.style.zIndex = "8600";
    menu.style.visibility = "hidden";
    menu.style.top = "0"; menu.style.left = "0";
    const tr = trigger.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    let top = tr.bottom + 6;
    let left = tr.left;
    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - mr.width - 8));
    top  = Math.max(8, Math.min(top,  window.innerHeight - mr.height - 8));
    menu.style.top = top + "px";
    menu.style.left = left + "px";
    menu.style.visibility = "";
  }

  function focusableItems(menu) {
    return Array.from(menu.querySelectorAll('button[role="menuitem"]:not([disabled])'));
  }

  function onOutsideClick(e) {
    if (!openMenu) return;
    if (openMenu.contains(e.target)) return;
    if (openTrigger && openTrigger.contains(e.target)) return;
    close();
  }

  function onKey(e) {
    if (!openMenu) return;
    if (e.key === "Escape") { close(); e.preventDefault(); return; }
    const items = focusableItems(openMenu);
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { (items[idx + 1] || items[0]).focus(); e.preventDefault(); }
    if (e.key === "ArrowUp")   { (items[idx - 1] || items[items.length - 1]).focus(); e.preventDefault(); }
    if (e.key === "Home")      { items[0]?.focus(); e.preventDefault(); }
    if (e.key === "End")       { items[items.length - 1]?.focus(); e.preventDefault(); }
  }

  function wireMenuItems(menu) {
    if (menu.dataset.loomInit === "true") return;
    menu.dataset.loomInit = "true";
    menu.querySelectorAll('button[role="menuitem"]').forEach((item) => {
      item.addEventListener("click", () => {
        const label = item.querySelector("span")?.textContent?.trim() || item.textContent.trim();
        menu.dispatchEvent(new CustomEvent("loom:menu-select", {
          detail: { label, tone: item.dataset.tone || null }, bubbles: true
        }));
        if (openMenu === menu) close();
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-loom="dropdown-menu"]').forEach(wireMenuItems);
  }

  function wireTriggers() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-loom-dropdown-trigger]");
      if (!t) return;
      const id = t.getAttribute("data-loom-dropdown-trigger");
      const menu = document.getElementById(id);
      if (!menu) return;
      e.preventDefault();
      if (openMenu === menu) close();
      else open(menu, t);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { init(); wireTriggers(); });
  } else {
    init(); wireTriggers();
  }

  window.LoomDropdownMenu = { init, open, close };
})();
