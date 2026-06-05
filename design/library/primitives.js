/* ============================================================
   primitives.js — Tokens-page primitive renderer
   ------------------------------------------------------------
   Reads `library/manifest.json`, filters entries tagged
   "primitive", groups them by sub-category tag (action, input,
   data-display, nav, feedback, overlay), and renders each into
   the matching <section data-cat="…"> container on the Tokens
   page.

   Each primitive's CSS is loaded once via a dynamically-injected
   <link rel="stylesheet"> tag. Its HTML is fetched and injected
   inline (no iframe — the [data-loom="<slug>"] attribute selector
   in the component CSS already scopes styles).

   See system/primitives.md for the convention.
   ============================================================ */

(function () {
  const SUB_CATEGORIES = ["action", "input", "data-display", "nav", "feedback", "overlay"];

  // Loom router compatibility: each navigation INTO the Components page
  // calls initComponents() via window.LoomPages, which re-runs the
  // primitive renderers. The renderers are idempotent — they clear and
  // rebuild their target .ds-primitives container, so re-entry produces
  // a clean state with no double-rendering.
  async function initComponents() {
    // Bail if the current page doesn't have the primitive sections.
    if (!document.querySelector(".ds-primitives")) return;
    await run();
  }

  window.LoomPages = window.LoomPages || {};
  window.LoomPages.components = initComponents;
  document.addEventListener("loom:nav", initComponents);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initComponents);
  } else {
    initComponents();
  }

  async function run() {
    let manifest;
    try {
      const res = await fetch("manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
      manifest = await res.json();
    } catch (err) {
      console.warn("[primitives] couldn't load manifest:", err);
      return;
    }

    const allEntries = manifest.entries || [];
    const primitives = allEntries.filter((e) => (e.tags || []).includes("primitive"));

    // Group by sub-category tag. An entry can in theory carry multiple sub-cats;
    // first match wins (current convention is exactly one per primitive).
    const grouped = Object.fromEntries(SUB_CATEGORIES.map((c) => [c, []]));
    for (const e of primitives) {
      const sub = (e.tags || []).find((t) => SUB_CATEGORIES.includes(t));
      if (!sub) continue;
      grouped[sub].push(e);
    }

    // Update the count metadata in each section's head.
    for (const cat of SUB_CATEGORIES) {
      const meta = document.querySelector(`[data-primitive-count="${cat}"]`);
      if (meta) meta.textContent = `${grouped[cat].length} primitive${grouped[cat].length === 1 ? "" : "s"}`;
    }

    // Render every category in parallel. Layout stability for hash-anchor
    // scrolling comes from CSS min-heights on each .ds-primitives[data-cat]
    // container (see library.css) — the page is roughly the right shape at
    // parse time, so the browser's native anchor scroll lands correctly
    // without any JS orchestration here.
    await Promise.all(SUB_CATEGORIES.map((cat) => renderCategory(cat, grouped[cat])));
  }

  async function renderCategory(cat, entries) {
    const root = document.querySelector(`.ds-primitives[data-cat="${cat}"]`);
    if (!root) return;
    root.innerHTML = "";
    if (entries.length === 0) {
      root.innerHTML = `<div class="ds-note">No primitives in this category.</div>`;
      return;
    }
    // Build every card synchronously in manifest order — this fixes the
    // visual order regardless of mount completion times. Then kick off
    // all mounts in parallel and await the batch. Drops total time from
    // sum-of-mounts to max-of-mounts; on 35 starter primitives that's
    // often a 5–8× speedup.
    const tasks = [];
    for (const entry of entries) {
      const card = document.createElement("div");
      card.className = "ds-primitive-card";
      card.dataset.slug = entry.slug;
      card.dataset.category = entry.category;
      const sandboxUrl = `sandbox.html?entry=${encodeURIComponent(entry.slug)}`;
      card.innerHTML = `
        <div class="ds-primitive-card__demo" data-loom-demo></div>
        <div class="ds-primitive-card__foot">
          <span class="ds-primitive-card__slug">${escape(entry.slug)}</span>
          <a class="ds-primitive-card__open"
             href="${escape(sandboxUrl)}"
             title="Open ${escape(entry.name)} in the Sandbox">
            Open <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
          </a>
        </div>
      `;
      root.appendChild(card);
      const demo = card.querySelector("[data-loom-demo]");
      if (entry.category === "modules") {
        // Module primitives (e.g. navigation, footer) render in their own
        // iframe so the module's responsive logic + JS state machines
        // exercise the live preview. Inline-injection would lose all that
        // because the @media + JS need real document scope.
        tasks.push(mountModuleInCard(entry, demo));
      } else {
        tasks.push(mountPrimitive(entry, demo));
      }
    }
    await Promise.all(tasks);
  }

  /* Render a module preview inside a primitive card. Module cards span
     the full grid row (see library.css), so the iframe runs at real
     layout width — desktop nav with all links, footer with columns
     side-by-side, etc. Iframe height syncs to body.scrollHeight so the
     card is exactly as tall as the rendered module needs. */
  function mountModuleInCard(entry, demo) {
    if (!isSafeManifestPath(entry.previewPath)) {
      demo.innerHTML = `<div class="ds-note">⚠️ Unsafe path for <code>${escape(entry.slug)}</code>; refused.</div>`;
      return Promise.resolve();
    }
    demo.classList.add("ds-primitive-card__demo--module");
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", `${entry.name} preview`);
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.setAttribute("loading", "lazy");
    iframe.style.height = "80px"; // initial; sync after load
    const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    iframe.src = `/${entry.previewPath}?entry=${encodeURIComponent(entry.slug)}&state=default&_=${bust}`;
    demo.appendChild(iframe);

    const sync = () => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) return;
      const h = Math.max(doc.body.scrollHeight, 60);
      iframe.style.height = `${h}px`;
    };

    // Return a promise that resolves once the iframe loads + the first
    // height sync runs. Caller (renderCategory) awaits this so the page's
    // final layout settles before post-render scrollIntoView (run()).
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      iframe.addEventListener("load", () => {
        sync();
        const doc = iframe.contentDocument;
        if (doc && doc.body && typeof ResizeObserver !== "undefined") {
          new ResizeObserver(sync).observe(doc.body);
        }
        finish();
      });
      // Safety: don't hang forever if the iframe never fires load
      // (network failure, blocked, etc.). 1.5s is plenty for local serve.
      // Note: this only delays the post-mount scroll for #navigation /
      // #site-chrome anchors (sections below would have already triggered
      // tryScroll). For #navigation specifically, the section ABOVE the
      // iframe is what gates the scroll, so the timeout rarely matters.
      setTimeout(finish, 1500);
    });
  }

  /* Mount one primitive: load its CSS link (once), fetch its HTML fragment,
     inject into the demo container, probe for an optional <slug>.js and
     load when present. Quiet failures — a missing file logs to console
     but doesn't break the rest of the page. */
  async function mountPrimitive(entry, container) {
    // Refuse any path that doesn't match the canonical layout. Without this
    // a hostile manifest entry could load HTML or JS from outside src/, and
    // primitives.js injects the fetched HTML directly into the live page
    // (so the path validation IS the XSS gate, not just the route gate).
    if (!isSafeManifestPath(entry.filePath)) {
      container.innerHTML = `<div class="ds-note">⚠️ Unsafe path for <code>${escape(entry.slug)}</code>; refused.</div>`;
      return;
    }
    ensureCssLoaded(entry);
    try {
      const res = await fetch("../" + entry.filePath, { cache: "no-store" });
      if (!res.ok) throw new Error(`${entry.slug}: ${res.status}`);
      container.innerHTML = await res.text();
    } catch (err) {
      console.warn(`[primitives] couldn't load ${entry.slug}:`, err);
      container.innerHTML = `<div class="ds-note">⚠️ Couldn't load <code>${escape(entry.slug)}</code></div>`;
      return;
    }
    // After markup lands in the DOM, probe for the optional <slug>.js.
    // The JS auto-initializes on load and exposes Loom<Pascal>.init so
    // we can re-run it on dynamically-injected instances.
    await ensureJsLoaded(entry);
  }

  const cssLoaded = new Set();
  function ensureCssLoaded(entry) {
    if (cssLoaded.has(entry.slug)) return;
    cssLoaded.add(entry.slug);
    const cssPath = entry.filePath.replace(/\.html$/, ".css");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../" + cssPath;
    link.dataset.loomPrimitive = entry.slug;
    document.head.appendChild(link);
  }

  const jsLoaded = new Set();
  const jsAbsent = new Set();
  const jsLoading = new Map();
  async function ensureJsLoaded(entry) {
    const slug = entry.slug;
    if (jsAbsent.has(slug)) return;
    if (jsLoaded.has(slug)) {
      // Re-run init for the newly-injected instance.
      const init = initFnFor(slug);
      if (init) try { init(); } catch (_) {}
      return;
    }
    if (jsLoading.has(slug)) { await jsLoading.get(slug); return; }
    const jsPath = "../" + entry.filePath.replace(/\.html$/, ".js");
    // Optimistic load — onerror covers the missing-file case. The previous
    // HEAD probe doubled the request count for primitives that have no JS
    // (most of them), one wasted round-trip per primitive per System-page
    // load.
    const loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = jsPath;
      s.defer = true;
      s.dataset.loomPrimitive = slug;
      s.onload = () => { jsLoaded.add(slug); resolve(); };
      s.onerror = () => { jsAbsent.add(slug); resolve(); };
      document.head.appendChild(s);
    });
    jsLoading.set(slug, loading);
    await loading;
  }

  function initFnFor(slug) {
    const name = "Loom" + slug.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
    return window[name]?.init;
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  /* See library.js for the canonical regex. Inline copy because primitives.js
     runs on the System page without other library/*.js dependencies. */
  function isSafeManifestPath(p) {
    if (typeof p !== "string" || !p) return false;
    if (p.includes("..") || p.startsWith("/") || /[\\:]/.test(p)) return false;
    return /^src\/(components|modules|templates)\/[a-z0-9][a-z0-9-]*\/(_approved\/)?[a-zA-Z0-9._-]+\.(html|json|css|js)$/.test(p);
  }
})();
