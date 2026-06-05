/* ============================================================
   nav-menu.js — click any link to switch aria-current
   ------------------------------------------------------------
   For the static demo on the tokens page, this swaps aria-current
   between siblings without navigating. In a real app, the user
   should preventDefault selectively or wire to a router.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="nav-menu"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(nav) {
    if (nav.dataset.loomInit === "true") return;
    nav.dataset.loomInit = "true";
    const links = Array.from(nav.querySelectorAll("a"));
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        // Demo behavior: prevent navigation for "#" href, just flip current
        if (link.getAttribute("href") === "#" || link.dataset.demo === "true") {
          e.preventDefault();
          links.forEach((l) => {
            if (l === link) l.setAttribute("aria-current", "page");
            else l.removeAttribute("aria-current");
          });
          nav.dispatchEvent(new CustomEvent("loom:nav-change", {
            detail: { label: link.textContent.trim(), href: link.getAttribute("href") },
            bubbles: true
          }));
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomNavMenu = { init };
})();
