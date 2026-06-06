/* ============================================================
   toast.js — declarative API + action callback
   ------------------------------------------------------------
   Static demo: the [data-loom="toast"] markup is the visual.
   Dynamic API: LoomToast.show({ text, action, timeout }) returns
   an element you can dismiss programmatically with LoomToast.hide(el).

   Clicking the .toast__action button on any toast dispatches
   `loom:toast-action` (CustomEvent) so consumers can react.
   The toast auto-dismisses after `data-timeout` ms (default 4000)
   when set; omit to keep it open until dismissed.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="toast"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(toast) {
    if (toast.dataset.loomInit === "true") return;
    toast.dataset.loomInit = "true";

    const actionBtn = toast.querySelector(".toast__action");
    if (actionBtn) {
      actionBtn.addEventListener("click", () => {
        toast.dispatchEvent(new CustomEvent("loom:toast-action", {
          detail: { text: actionBtn.textContent.trim() }, bubbles: true
        }));
      });
    }

    const timeout = parseInt(toast.dataset.timeout || "", 10);
    if (timeout > 0) {
      setTimeout(() => hide(toast), timeout);
    }
  }

  function hide(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 200);
  }

  function show({ text = "Done", action = null, timeout = 4000, icon = "ph-check-circle" } = {}) {
    const toast = document.createElement("div");
    toast.setAttribute("data-loom", "toast");
    toast.setAttribute("role", "status");
    toast.style.position = "fixed";
    toast.style.right = "24px";
    toast.style.bottom = "24px";
    toast.style.zIndex = "9200";
    toast.innerHTML =
      `<i class="ph ${icon}" aria-hidden="true"></i>` +
      `<span class="toast__text"></span>` +
      (action ? `<button type="button" class="toast__action"></button>` : "");
    toast.querySelector(".toast__text").textContent = text;
    if (action) toast.querySelector(".toast__action").textContent = String(action).toUpperCase();
    if (timeout > 0) toast.dataset.timeout = String(timeout);

    document.body.appendChild(toast);
    wireOne(toast);
    return toast;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomToast = { init, show, hide };
})();
