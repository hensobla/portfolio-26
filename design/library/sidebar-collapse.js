/* ============================================================
   sidebar-collapse.js — desktop sidebar collapse toggle
   ------------------------------------------------------------
   Wires the small button at the top of .lib-side. Clicking toggles
   a global collapsed state (html[data-sidebar-collapsed]) persisted
   in localStorage so it survives reloads and is shared across the
   Library / System / Components / Settings pages.

   The initial value is restored synchronously in each page's <head>
   (avoids a flash of expanded sidebar). This script handles user-
   driven toggles after load.

   Loom router compatibility: the collapse button lives inside <main>,
   which the router replaces on every navigation. So `wireToggle()`
   re-runs on every `loom:nav` event to attach the click handler to
   the new button. The persisted collapsed state (on <html>) survives
   the swap untouched.
   ============================================================ */

(function () {
  const KEY = "loomling:sidebar:collapsed:v1";

  function isCollapsed() {
    return document.documentElement.getAttribute("data-sidebar-collapsed") === "true";
  }

  function applyState(btn, collapsed) {
    if (collapsed) {
      document.documentElement.setAttribute("data-sidebar-collapsed", "true");
    } else {
      document.documentElement.removeAttribute("data-sidebar-collapsed");
    }
    if (!btn) return;
    btn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    btn.setAttribute("data-tooltip", collapsed ? "Expand sidebar" : "Collapse sidebar");
    const sr = btn.querySelector(".sr-only");
    if (sr) sr.textContent = collapsed ? "Expand sidebar" : "Collapse sidebar";
  }

  function wireToggle() {
    const btn = document.getElementById("lib-side-collapse");
    if (!btn || btn.dataset.loomInit === "true") {
      // Either no collapse button on this page (e.g. Builder) or the
      // current button was already wired on a previous nav. Either way,
      // make sure the global state is reflected on whatever button is
      // present.
      if (btn) applyState(btn, isCollapsed());
      return;
    }
    btn.dataset.loomInit = "true";
    applyState(btn, isCollapsed());

    btn.addEventListener("click", () => {
      const next = !isCollapsed();
      applyState(btn, next);
      try { localStorage.setItem(KEY, next ? "true" : "false"); } catch (_) {}
    });
  }

  wireToggle();
  document.addEventListener("loom:nav", wireToggle);
})();
