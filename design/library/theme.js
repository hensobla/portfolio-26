/* ============================================================
   theme.js — light/dark theme manager for the Loom
   ------------------------------------------------------------
   Two independent surfaces:

   1. Loomling chrome — the --lib-* tokens defined in library.css.
      Always toggleable. :root[data-theme="dark"] overrides in
      library.css define the dark palette.

   2. User design system — the --background/--text1/etc tokens in
      src/tokens.css. Optionally toggleable. Whether the user's
      DS participates depends on:
        a) project.json.darkMode ("auto" | "always" | "never")
        b) detection: does src/tokens.css declare a
           [data-theme="dark"] block?

   Decision matrix (Loomling chrome ALWAYS follows the toggle):

      flag        | tokens.css has dark? | iframes follow?
      ------------|----------------------|-----------------
      "auto"      | yes                  | yes
      "auto"      | no                   | no  (chrome-only)
      "always"    | yes                  | yes
      "always"    | no                   | yes (but user's tokens
                  |                      |      won't actually flip)
      "never"     | (either)             | no

   "always" with no dark tokens is allowed because the user
   might be mid-build — the toggle still works, the user's
   visuals just won't flip until they add dark tokens.

   This file does NOT write to disk. The flag value comes from
   project.json (read once at init). To change the flag the user
   uses the System-page setting, which builds a CC paste.

   ── INLINE PRE-PAINT COMPANION ─────────────────────────────────
   This script loads `defer`, which means it runs AFTER the first
   paint — too late to prevent a one-frame flash of light theme on
   every page navigation. To avoid that, each Loom page in
   `library/*.html` ships a tiny inline `<script>` immediately
   after `<title>` (and BEFORE any <link rel="stylesheet">) that
   reads the same STORAGE_KEY and sets data-theme="dark" on <html>
   synchronously. If you add a NEW Loom page, include the same
   inline script in the same position — otherwise dark mode will
   flash on navigation into your page. The full theme.js still
   handles toggle clicks, iframe propagation, and first-visit
   prefers-color-scheme detection.

   See system/dark-mode.md.
   ============================================================ */

(function () {
  const STORAGE_KEY = "loomling:theme:v1";
  const STATE = {
    theme: "light",            // "light" | "dark"
    flag: "auto",              // "auto" | "always" | "never" — from project.json
    userDsHasDark: false,      // detected from src/tokens.css
  };

  function read() {
    try { return localStorage.getItem(STORAGE_KEY) || null; }
    catch { return null; }
  }

  function write(value) {
    try { localStorage.setItem(STORAGE_KEY, value); }
    catch { /* quota / private mode — silent */ }
  }

  /* Whether the toggle should propagate to user-DS surfaces
     (the page's <html data-theme> reaches user CSS, and we
     also push data-theme into every iframe's <html>). */
  function shouldPropagateToUser() {
    if (STATE.flag === "never") return false;
    if (STATE.flag === "always") return true;
    return STATE.userDsHasDark; // auto
  }

  function applyToDocument() {
    const html = document.documentElement;
    // Loomling chrome ALWAYS reflects the chosen theme (the --lib-* dark
    // overrides in library.css are scoped to :root[data-theme="dark"]).
    if (STATE.theme === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      // We don't store data-theme="light" — absence == light. This way
      // user CSS that only ships :root[data-theme="dark"] doesn't need
      // a sibling :root[data-theme="light"] for the default state.
      html.removeAttribute("data-theme");
    }
  }

  /* For iframes the rule is different: the iframe document's <html>
     gets data-theme only when shouldPropagateToUser() is true. This is
     what gates the user's DS dark-mode from running when their tokens
     don't have it, OR they've explicitly disabled propagation.

     Recurses into nested same-origin iframes — composed templates
     load module previews as nested iframes-within-iframes, and those
     need data-theme too. */
  function applyToIframe(frame) {
    if (!frame || frame.tagName !== "IFRAME") return;
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.documentElement) return;
      const propagate = shouldPropagateToUser();
      if (propagate && STATE.theme === "dark") {
        doc.documentElement.setAttribute("data-theme", "dark");
      } else {
        doc.documentElement.removeAttribute("data-theme");
      }
      // Recurse: same-origin iframes inside this iframe (e.g. composed
      // templates that stitch module previews together).
      doc.querySelectorAll("iframe").forEach(applyToIframe);
    } catch { /* cross-origin */ }
  }

  function applyToAllIframes() {
    document.querySelectorAll("iframe").forEach(applyToIframe);
  }

  /* MutationObserver: cover iframes added after init (Sandbox state
     swaps, Builder canvas adds, etc.). Mirrors dev-tokens.js's hook
     pattern so the two scripts compose cleanly.

     For composed templates: when a top-level iframe loads, we also
     hook ITS contentDocument so iframes appended inside it (one per
     module) get caught the same way. */
  function attachObserver(doc) {
    if (!doc || !doc.body) return null;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          // Use nodeType + tagName instead of `instanceof Element`. The
          // node may have been created in a different document realm
          // (e.g. composed templates create iframes inside their own
          // contentDocument), where `instanceof` against the Loom
          // window's Element constructor returns false.
          if (!n || n.nodeType !== 1) return;
          if (n.tagName === "IFRAME") {
            n.addEventListener("load", () => applyToIframe(n));
            applyToIframe(n);
          }
          n.querySelectorAll?.("iframe").forEach((frame) => {
            frame.addEventListener("load", () => applyToIframe(frame));
            applyToIframe(frame);
          });
        });
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    return observer;
  }

  function hookIframes() {
    const hookOne = (frame) => {
      frame.addEventListener("load", () => {
        applyToIframe(frame);
        // After the iframe loads, hook its contentDocument too so any
        // iframes appended inside it (composed templates, etc.) follow.
        try {
          if (frame.contentDocument) {
            attachObserver(frame.contentDocument);
            frame.contentDocument.querySelectorAll("iframe").forEach(hookOne);
          }
        } catch { /* cross-origin */ }
      });
      applyToIframe(frame);
      // Already-loaded iframe: hook its doc now.
      try {
        if (frame.contentDocument && frame.contentDocument.body) {
          attachObserver(frame.contentDocument);
          frame.contentDocument.querySelectorAll("iframe").forEach(hookOne);
        }
      } catch { /* cross-origin */ }
    };
    document.querySelectorAll("iframe").forEach(hookOne);
    return attachObserver(document);
  }

  /* Read project.json.darkMode (relative path is ../project.json from
     /library/). Silent on failure — defaults to "auto". */
  async function loadFlag() {
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const v = json && json.darkMode;
      if (v === "always" || v === "never" || v === "auto") {
        STATE.flag = v;
      }
      // null/undefined → keep default "auto".
    } catch { /* no project.json or invalid JSON */ }
  }

  /* Detect whether src/tokens.css declares any [data-theme="dark"]
     selector. Cheap text scan — no need to parse the CSS AST. We
     accept `[data-theme="dark"]`, `[data-theme='dark']`, and the
     unquoted `[data-theme=dark]` form. */
  async function detectUserDsDark() {
    try {
      const res = await fetch("../src/tokens.css", { cache: "no-store" });
      if (!res.ok) return false;
      const text = await res.text();
      return /\[data-theme=["']?dark["']?\]/.test(text);
    } catch { return false; }
  }

  function renderToggle() {
    const host = document.querySelector(".lib-header__inner");
    if (!host) return;
    if (host.querySelector(".lib-theme-toggle")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lib-theme-toggle";
    btn.setAttribute("aria-pressed", STATE.theme === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", "Toggle dark mode");
    btn.dataset.propagates = shouldPropagateToUser() ? "true" : "false";
    btn.title = makeTitle();
    btn.innerHTML = ICONS.sun + ICONS.moon;
    btn.addEventListener("click", () => Theme.toggle());

    // Insert after the tabs nav. The tabs have margin-left:auto so the
    // toggle ends up flush-right.
    host.appendChild(btn);
  }

  function updateToggle() {
    const btn = document.querySelector(".lib-theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", STATE.theme === "dark" ? "true" : "false");
    btn.dataset.propagates = shouldPropagateToUser() ? "true" : "false";
    btn.title = makeTitle();
  }

  function makeTitle() {
    const next = STATE.theme === "dark" ? "light" : "dark";
    if (shouldPropagateToUser()) {
      return `Switch to ${next} mode (affects Loomling and your design system)`;
    }
    return `Switch to ${next} mode (affects Loomling chrome only — your design system has no dark tokens yet)`;
  }

  const ICONS = {
    sun: '<svg class="lib-theme-toggle__icon lib-theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon: '<svg class="lib-theme-toggle__icon lib-theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };

  const Theme = {
    get current() { return STATE.theme; },
    get flag()    { return STATE.flag; },
    get userDsHasDark() { return STATE.userDsHasDark; },
    get propagatesToUser() { return shouldPropagateToUser(); },

    set(theme) {
      const next = theme === "dark" ? "dark" : "light";
      if (next === STATE.theme) return;
      STATE.theme = next;
      write(next);
      applyToDocument();
      applyToAllIframes();
      updateToggle();
      document.dispatchEvent(new CustomEvent("loomling:theme-changed", {
        detail: { theme: next, propagatesToUser: shouldPropagateToUser() }
      }));
    },

    toggle() {
      this.set(STATE.theme === "dark" ? "light" : "dark");
    },

    /* Called by tokens.js after a dev-tokens apply/clear or a
       successful Tokens Import commit — re-detects dark support
       from the current src/tokens.css. */
    async refreshDetection() {
      STATE.userDsHasDark = await detectUserDsDark();
      applyToAllIframes();
      updateToggle();
      // Surface the result so downstream UI (e.g. System page swatches)
      // can re-render with the up-to-date detection.
      document.dispatchEvent(new CustomEvent("loomling:theme-ready", {
        detail: { theme: STATE.theme, userDsHasDark: STATE.userDsHasDark }
      }));
    },

    async init() {
      // Read persisted theme BEFORE first paint where possible.
      const persisted = read();
      if (persisted === "dark" || persisted === "light") {
        STATE.theme = persisted;
      }
      applyToDocument();

      // These are async but non-blocking for the toggle render.
      await Promise.all([loadFlag(), detectUserDsDark().then(v => { STATE.userDsHasDark = v; })]);

      // Detection complete — let downstream scripts (e.g. tokens.js) know
      // so they can render anything that depends on userDsHasDark.
      document.dispatchEvent(new CustomEvent("loomling:theme-ready", {
        detail: { theme: STATE.theme, userDsHasDark: STATE.userDsHasDark }
      }));

      const onReady = () => {
        renderToggle();
        applyToAllIframes();
        hookIframes();
      };
      if (document.body) onReady();
      else document.addEventListener("DOMContentLoaded", onReady);

      // Listen for token changes from dev-tokens.js or a Tokens Import
      // commit — re-detect dark support in case it changed.
      document.addEventListener("loomling:tokens-changed", () => {
        Theme.refreshDetection();
      });
    }
  };

  window.Theme = Theme;

  // Apply persisted theme synchronously at script execution so chrome
  // doesn't flash. The deferred init does the full setup (toggle render,
  // flag read, detection).
  try {
    const persisted = read();
    if (persisted === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      STATE.theme = "dark";
    }
  } catch { /* no-op */ }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Theme.init());
  } else {
    Theme.init();
  }
})();
