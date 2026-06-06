/* ============================================================
   navigation.js — hamburger toggle for the navigation module
   ------------------------------------------------------------
   The mobile state (CSS @media (max-width: 767px) or the
   sandbox-forced data-state="mobile-stacked") hides .nav__links
   and .nav__cta and surfaces the .nav__menu button. This script
   wires that button to a dropdown panel (`.nav__panel`) that
   slides in beneath the nav bar with copies of the same links
   and CTA, vertically stacked.

   Document-level delegation means a single listener handles every
   navigation instance — including any that get re-rendered by the
   sandbox or page builder via innerHTML resets. No re-binding
   needed when the DOM is rebuilt.

   ARIA: the menu button carries aria-expanded; the panel carries
   the same data-state-mirroring attribute used by the rest of
   the module.

   Pattern peer-of: src/components/dropdown-menu/dropdown-menu.js,
   src/components/nav-menu/nav-menu.js (the primitives).
   ============================================================ */

(function () {
  if (window.LoomNavigation) return; // idempotent across reloads

  function open(nav) {
    const btn   = nav.querySelector(".nav__menu");
    const panel = nav.querySelector(".nav__panel");
    if (!btn || !panel) return;
    nav.dataset.menuOpen = "true";
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function close(nav) {
    const btn   = nav.querySelector(".nav__menu");
    const panel = nav.querySelector(".nav__panel");
    if (!btn || !panel) return;
    delete nav.dataset.menuOpen;
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function closeAllExcept(exceptNav) {
    document.querySelectorAll('[data-loom-module="navigation"][data-menu-open="true"]').forEach((n) => {
      if (n !== exceptNav) close(n);
    });
  }

  /* Click delegation: toggling the button, closing on link tap, and
     closing on outside click are all handled here. */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav__menu");
    if (btn) {
      const nav = btn.closest('[data-loom-module="navigation"]');
      if (!nav) return;
      const isOpen = nav.dataset.menuOpen === "true";
      closeAllExcept(nav);
      if (isOpen) close(nav); else open(nav);
      return;
    }
    // Tap a link inside the panel → close (typical mobile UX).
    const panelLink = e.target.closest(".nav__panel a, .nav__panel [data-loom='button-primary']");
    if (panelLink) {
      const nav = panelLink.closest('[data-loom-module="navigation"]');
      if (nav) close(nav);
      return;
    }
    // Click outside any open nav → close it.
    const insideOpenNav = e.target.closest('[data-loom-module="navigation"][data-menu-open="true"]');
    if (!insideOpenNav) closeAllExcept(null);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const anyOpen = document.querySelector('[data-loom-module="navigation"][data-menu-open="true"]');
    if (!anyOpen) return;
    close(anyOpen);
    // Restore focus to the trigger button so keyboard users don't get lost.
    anyOpen.querySelector(".nav__menu")?.focus();
  });

  /* Initial pass: any nav already in the DOM gets its button wired with
     aria-expanded="false" if not already set. The button starts closed. */
  function init(scope) {
    const root = scope || document;
    root.querySelectorAll('[data-loom-module="navigation"]').forEach((nav) => {
      const btn   = nav.querySelector(".nav__menu");
      const panel = nav.querySelector(".nav__panel");
      if (btn && !btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
      if (btn && panel && !btn.hasAttribute("aria-controls")) {
        // Generate a stable id per nav instance so aria-controls can point at
        // the panel. Use the slot value if present (data-loom-nav-id) or a
        // random suffix. Avoid id collisions when multiple navs exist.
        if (!panel.id) panel.id = "loom-nav-panel-" + Math.random().toString(36).slice(2, 8);
        btn.setAttribute("aria-controls", panel.id);
      }
      if (panel && panel.hidden == null) panel.hidden = nav.dataset.menuOpen !== "true";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  window.LoomNavigation = { init, open, close };
})();
