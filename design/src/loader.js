/* ============================================================
   loader.js — auto-load module & component JS based on the DOM
   ------------------------------------------------------------
   Walks the document looking for [data-loom-module="<slug>"]
   and [data-loom="<slug>"] attributes, then lazy-loads each
   referenced JS file from /src/modules/<slug>/<slug>.js or
   /src/components/<slug>/<slug>.js (if it exists on disk).

   Why this exists
   ---------------
   Loomling modules sometimes ship a companion JS file
   (e.g. navigation.js wires the mobile hamburger). When a
   template *inlines* the module's markup instead of pointing
   an iframe at the module's preview.html, the template was
   previously responsible for also <script>-loading that JS.
   That coupling forced the designer to remember which scripts
   to wire when they "just edit a component." The fix is this
   loader: drop one <script src=".../src/loader.js"> in the
   template head and every consumed module/component's JS gets
   loaded automatically. Edits to a module propagate to every
   page without further template work.

   How it works
   ------------
   - On DOMContentLoaded (and once at first run after that),
     scans the whole document for matching attributes.
   - On every DOM mutation, scans the *added* subtree only
     (cheap). Catches sandbox postMessage rebuilds + dynamic
     content insertion.
   - 404s (no JS file for that slug, which is normal — most
     primitives don't need JS) are cached so we don't keep
     retrying.

   Security
   --------
   Slug values are validated against the schema regex before
   they become part of a URL. Anything else is silently skipped.

   See `CLAUDE.md §4` (Authoring contract) for the convention
   that every new hand-written template should include this
   loader.
   ============================================================ */
(function () {
  if (window.LoomLoader) return;

  const loadingOrLoaded = new Set();
  const failed = new Set();

  function loadScript(src) {
    if (loadingOrLoaded.has(src) || failed.has(src)) return;
    loadingOrLoaded.add(src);
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.dataset.loomAuto = "true";
    s.onerror = () => {
      // No JS file for this slug — that's expected for primitives
      // with CSS-only behavior. Remember so we don't keep retrying.
      loadingOrLoaded.delete(src);
      failed.add(src);
    };
    document.head.appendChild(s);
  }

  // Mirror the schema regex for slugs (lowercase-kebab, must start with
  // alphanumeric). Reject anything else so a bad attribute value can't
  // smuggle a path into <script src>.
  const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

  function scan(scope) {
    const root = scope || document;
    // Use closest('html')?.contains check for added text nodes etc.
    if (root.nodeType !== 1 && root.nodeType !== 9) return;

    const modules = root.querySelectorAll
      ? root.querySelectorAll("[data-loom-module]")
      : [];
    modules.forEach((el) => {
      const slug = el.getAttribute("data-loom-module");
      if (!SLUG_RE.test(slug)) return;
      loadScript(`/src/modules/${slug}/${slug}.js`);
    });

    const components = root.querySelectorAll
      ? root.querySelectorAll("[data-loom]")
      : [];
    components.forEach((el) => {
      const slug = el.getAttribute("data-loom");
      if (!SLUG_RE.test(slug)) return;
      loadScript(`/src/components/${slug}/${slug}.js`);
    });

    // If the root itself carries an attribute, catch it too (querySelectorAll
    // doesn't include the root element).
    if (root.nodeType === 1) {
      if (root.hasAttribute("data-loom-module")) {
        const slug = root.getAttribute("data-loom-module");
        if (SLUG_RE.test(slug)) loadScript(`/src/modules/${slug}/${slug}.js`);
      }
      if (root.hasAttribute("data-loom")) {
        const slug = root.getAttribute("data-loom");
        if (SLUG_RE.test(slug)) loadScript(`/src/components/${slug}/${slug}.js`);
      }
    }
  }

  function startObserving() {
    if (!document.body || window.__loomLoaderObserver) return;
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) scan(node);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.__loomLoaderObserver = obs;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      startObserving();
    });
  } else {
    scan();
    startObserving();
  }

  window.LoomLoader = {
    scan,
    loaded: () => [...loadingOrLoaded],
    failed: () => [...failed]
  };
})();
