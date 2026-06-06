/* ============================================================
   library.js — Loomling Library viewer
   ------------------------------------------------------------
   Fetches library/manifest.json, groups entries by status and
   category, renders the sticky sub-nav + card gallery.
   ============================================================ */

// Idempotent init — runs on initial page load and on every loom:nav into
// the Library page. The render functions clear and rebuild their target
// elements, so calling them again on the new <main> after a router swap
// produces a clean catalog state.
async function initLibrary() {
  if (document.body.dataset.page !== "library") return;
  const manifest = await loadManifest();
  if (!manifest) return;
  setProjectName(manifest.project?.name);
  await render(manifest);
}

// Register with the router. The router calls window.LoomPages[<page>]()
// after swapping <main>. We also self-invoke here for the initial load
// (the router doesn't fire loom:nav for the first paint).
window.LoomPages = window.LoomPages || {};
window.LoomPages.library = initLibrary;
document.addEventListener("loom:nav", initLibrary);
initLibrary();

async function loadManifest() {
  try {
    const res = await fetch("manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    showError(
      "Could not load manifest.json",
      `Run \`npx serve library\` from the project root. (fetch failed: ${err.message})`
    );
    return null;
  }
}

function setProjectName(name) {
  const el = document.querySelector("[data-project-name]");
  if (el) el.textContent = name ? name : "(unnamed)";
}

async function render(manifest) {
  const content = document.getElementById("lib-content");
  const sideNav = document.getElementById("lib-side-nav");
  const empty = document.getElementById("lib-empty");

  content.innerHTML = "";

  // Filter out:
  //  - component primitives — atomic primitives live on the System page,
  //    not in the user-authored element catalog (see system/primitives.md).
  //  - removed entries — kept in the manifest for history but surfaced
  //    only in the Settings → Archive view (ADR 0010, CLAUDE.md §11).
  //
  // Module primitives (e.g. navigation, footer tagged "primitive" plus a
  // sub-category like "nav" / "layout") are intentionally KEPT in the
  // Library — they're dual-typed and appear in both surfaces as the same
  // element. See CLAUDE.md §19 (Starter primitives) for the convention.
  const allEntries = manifest.entries ?? [];
  const entries = allEntries.filter((e) => {
    if (e.status === "removed") return false;
    const isPrimitive = (e.tags || []).includes("primitive");
    return !(isPrimitive && e.category === "components");
  });
  const drafts = entries.filter((e) => e.status === "draft");
  const approved = entries.filter((e) => e.status === "approved");

  if (entries.length === 0) {
    content.appendChild(empty);
    empty.hidden = false;
    renderSideNav(sideNav, [], []);
    return;
  }

  empty.hidden = true;

  // Identify which drafts have an `_approved/` snapshot — those are
  // pending re-approval (edited from approved). Probe in parallel.
  const awaitingSet = await detectAwaitingApproval(drafts);

  // Pre-load every composition.json + module/template HTML once, then use it
  // for cheap consumer counts on each awaiting-approval card.
  const consumerData = awaitingSet.size > 0
    ? await loadConsumerData(manifest)
    : null;

  const awaitingDrafts = drafts.filter((e) => awaitingSet.has(e.slug));
  const freshDrafts = drafts.filter((e) => !awaitingSet.has(e.slug));

  const sections = [];

  // Awaiting approval sits above Drafts. Hidden entirely when empty.
  if (awaitingDrafts.length > 0) {
    sections.push({
      id: "awaiting-approval",
      title: "Awaiting approval",
      meta: `${awaitingDrafts.length} pending`,
      variant: "awaiting",
      entries: awaitingDrafts,
      consumerData
    });
  }

  if (freshDrafts.length > 0) {
    sections.push({
      id: "drafts",
      title: "Drafts",
      meta: `${freshDrafts.length} draft${freshDrafts.length === 1 ? "" : "s"}`,
      entries: freshDrafts
    });
  }

  for (const category of manifest.categories) {
    const inCat = approved.filter((e) => e.category === category.id);
    if (inCat.length === 0) continue;
    sections.push({
      id: category.id,
      title: category.title,
      meta: `${inCat.length} approved`,
      entries: inCat
    });
  }

  for (const section of sections) {
    content.appendChild(renderSection(section));
  }

  renderSideNav(sideNav, sections, manifest.categories);
  const sideToggle = wireSideToggle();
  // Seed the toggle with the first section so the mobile bar doesn't
  // start blank before the scroll-spy fires.
  if (sections[0]) sideToggle?.setLabel(sections[0].title);
  wireScrollSpy(sections, sideToggle);
}

/* Probes _approved/preview.html next to each draft's previewPath. Returns
   a Set of slugs that have a snapshot (= edited-from-approved). Probes run
   in parallel; failures are silent (treated as no-snapshot). */
async function detectAwaitingApproval(drafts) {
  const probes = drafts.map(async (entry) => {
    const path = approvedPath(entry.previewPath);
    if (!path || !isSafeManifestPath(path)) return null;
    try {
      const res = await fetch("/" + path, { cache: "no-store" });
      return res.ok ? entry.slug : null;
    } catch (_) {
      return null;
    }
  });
  const results = await Promise.all(probes);
  return new Set(results.filter(Boolean));
}

function approvedPath(previewPath) {
  if (!previewPath) return null;
  const idx = previewPath.lastIndexOf("/");
  if (idx < 0) return null;
  return previewPath.slice(0, idx) + "/_approved/" + previewPath.slice(idx + 1);
}

/* Pre-fetches every module/template body file + every composition.json in
   parallel. The result is a lookup the consumer counter walks in-memory
   instead of doing N grep-style fetches per awaiting-approval card. */
async function loadConsumerData(manifest) {
  const entries = manifest.entries || [];
  const data = {
    moduleHtml: {},
    templateHtml: {},
    compositionJson: {}
  };

  const tasks = [];

  for (const e of entries) {
    if (!isSafeManifestPath(e.filePath)) continue;
    // Modules: body fragment HTML at e.filePath
    if (e.category === "modules") {
      tasks.push((async () => {
        try {
          const res = await fetch("/" + e.filePath, { cache: "no-store" });
          if (res.ok) data.moduleHtml[e.slug] = await res.text();
        } catch (_) {}
      })());
    }
    // Templates: either a body fragment (hand-written) or composition.json
    // (composed). Distinguish by filePath suffix.
    if (e.category === "templates") {
      if (e.filePath.endsWith(".json")) {
        tasks.push((async () => {
          try {
            const res = await fetch("/" + e.filePath, { cache: "no-store" });
            if (res.ok) data.compositionJson[e.slug] = await res.json();
          } catch (_) {}
        })());
      } else {
        tasks.push((async () => {
          try {
            const res = await fetch("/" + e.filePath, { cache: "no-store" });
            if (res.ok) data.templateHtml[e.slug] = await res.text();
          } catch (_) {}
        })());
      }
    }
  }

  await Promise.all(tasks);
  return data;
}

/* Counts direct consumers of `slug` (a component or module). Mirrors the
   procedure in CLAUDE.md §15. Templates have no downstream consumers in
   this project's model. */
function countConsumers(slug, category, data) {
  if (!data) return 0;
  let count = 0;

  if (category === "components") {
    const pattern = `data-loom="${slug}"`;
    for (const html of Object.values(data.moduleHtml)) {
      if (html.includes(pattern)) count++;
    }
    for (const html of Object.values(data.templateHtml)) {
      if (html.includes(pattern)) count++;
    }
  } else if (category === "modules") {
    const pattern = `data-loom-module="${slug}"`;
    for (const html of Object.values(data.templateHtml)) {
      if (html.includes(pattern)) count++;
    }
    for (const comp of Object.values(data.compositionJson)) {
      const modules = comp?.modules || [];
      if (modules.some((m) => m.moduleSlug === slug)) count++;
    }
  }
  // Templates: no downstream consumers.

  return count;
}

function renderSection(section) {
  const root = document.createElement("section");
  root.className = "lib-section";
  if (section.variant) root.dataset.variant = section.variant;
  root.id = `section-${section.id}`;

  const head = document.createElement("div");
  head.className = "lib-section__head";
  head.innerHTML = `
    <h2 class="lib-section__title">${escape(section.title)}</h2>
    <span class="lib-section__meta">${escape(section.meta)}</span>
  `;
  root.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "lib-grid";
  for (const entry of section.entries) {
    const cardOpts = {};
    if (section.variant === "awaiting" && section.consumerData) {
      cardOpts.awaitingApproval = true;
      cardOpts.consumerCount = countConsumers(entry.slug, entry.category, section.consumerData);
    }
    grid.appendChild(renderCard(entry, cardOpts));
  }
  root.appendChild(grid);

  return root;
}

function renderCard(entry, opts) {
  opts = opts || {};
  const root = document.createElement("article");
  root.className = "lib-card";
  if (opts.awaitingApproval) root.classList.add("lib-card--awaiting");
  root.dataset.entry = entry.slug;

  const initialState = entry.states[0]?.id ?? "default";

  // NOTE: we intentionally do NOT put the iframe src in innerHTML.
  // The HTML parser appears to mangle iframe URLs that include both .html
  // and ampersand-separated query strings when the element is parsed in a
  // detached subtree. Setting src via JS AFTER the iframe is in the DOM
  // resolves correctly.
  const sandboxUrl = `sandbox.html?entry=${encodeURIComponent(entry.slug)}`;

  root.innerHTML = `
    <div class="lib-card__preview">
      <div class="lib-card__preview-fit">
        <div class="lib-card__preview-scaler">
          <iframe
            loading="lazy"
            title="${escape(entry.name)} preview"
            sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
      </div>
    </div>
    <div class="lib-card__body">
      <div class="lib-card__title-row">
        <h3 class="lib-card__title">
          <a class="lib-card__title-link" href="${escape(sandboxUrl)}">${escape(entry.name)}</a>
        </h3>
        <span class="lib-badge lib-badge--${entry.status}">${escape(entry.status)}</span>
      </div>
      <div class="lib-card__meta">
        <span class="lib-card__slug">${escape(entry.slug)}</span>
        ${entry.tags && entry.tags.length ? `<span>· ${entry.tags.map(escape).join(", ")}</span>` : ""}
      </div>
      ${
        opts.awaitingApproval
          ? `<div class="lib-card__consumer-chip" title="Places this element is used">
              <span aria-hidden="true">●</span>
              <span>${opts.consumerCount === 1 ? "Used in 1 place" : `Used in ${opts.consumerCount} places`}</span>
            </div>`
          : ""
      }
      ${
        entry.states.length > 1
          ? `<div class="lib-card__states" role="group" aria-label="States for ${escape(entry.name)}">
              ${entry.states
                .map(
                  (s, i) =>
                    `<button type="button" class="lib-state ${i === 0 ? "is-active" : ""}" data-state="${escape(s.id)}">${escape(s.label)}</button>`
                )
                .join("")}
            </div>`
          : ""
      }
    </div>
  `;

  const stateButtons = root.querySelectorAll("[data-state]");
  const iframe = root.querySelector("iframe");
  const previewEl = root.querySelector(".lib-card__preview");
  const fitEl = root.querySelector(".lib-card__preview-fit");
  const scalerEl = root.querySelector(".lib-card__preview-scaler");

  // Render iframe content at a category-appropriate "design width" so the
  // piece sees a layout that matches its intended context — components feel
  // right at ~360px, modules and templates at desktop (1280px). The scaler
  // then transforms the iframe down to fit the 180px tile while preserving
  // the layout the piece was designed for (media queries still fire at the
  // design width, not the visual width).
  const designWidth = categoryDesignWidth(entry.category);
  iframe.style.width = `${designWidth}px`;
  // Seed with a tiny height so document.documentElement.scrollHeight reflects
  // the actual content rather than the HTML-spec default iframe height of
  // 150px. Without this, small previews (eyebrow, buttons, nav) report a
  // floored height of 150 and visually top-align inside an over-tall fit
  // box. fitPreview() updates this to the real measured content height.
  iframe.style.height = "40px";

  // Chrome deduplicates iframe.src assignments to a previously-loaded URL
  // even when the query string changes — the iframe appears to not navigate
  // and contentWindow.location stays at the prior URL. Appending a unique
  // cachebuster sidesteps the dedup and guarantees a fresh navigation.
  const setIframeSrc = (state) => {
    if (!isSafeManifestPath(entry.previewPath)) return;
    const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    iframe.src = `/${entry.previewPath}?entry=${encodeURIComponent(entry.slug)}&state=${encodeURIComponent(state)}&_=${bust}`;
  };

  stateButtons.forEach((btn) => {
    // Stop the click from bubbling to the card's link overlay.
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      stateButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      setIframeSrc(btn.dataset.state);
    });
  });

  // Inner buffer reserved inside the tile so the scaled preview doesn't sit
  // flush against the edges.
  const PREVIEW_INNER_PAD = 8;
  let bodyObserver = null;

  const fitPreview = () => {
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;
    // body.scrollHeight only. documentElement.scrollHeight is bounded
    // below by the iframe's current viewport height; once we've sized the
    // iframe tall it stays tall there, so the preview wouldn't shrink
    // back when content reflows shorter. body is honest because previews
    // don't use vh-based heights (a hard rule documented in CLAUDE.md).
    const contentH = Math.max(doc.body.scrollHeight, 40);
    iframe.style.height = `${contentH}px`;

    const tileW = previewEl.clientWidth;
    const tileH = previewEl.clientHeight;
    const innerW = Math.max(40, tileW - PREVIEW_INNER_PAD * 2);
    const innerH = Math.max(40, tileH - PREVIEW_INNER_PAD * 2);
    const ratio = Math.min(innerW / designWidth, innerH / contentH, 1);

    scalerEl.style.width = `${designWidth}px`;
    scalerEl.style.height = `${contentH}px`;
    scalerEl.style.transform = `scale(${ratio})`;
    fitEl.style.width = `${Math.ceil(designWidth * ratio)}px`;
    fitEl.style.height = `${Math.ceil(contentH * ratio)}px`;
  };

  iframe.addEventListener("load", () => {
    fitPreview();
    if (bodyObserver) {
      try { bodyObserver.disconnect(); } catch (_) {}
      bodyObserver = null;
    }
    const doc = iframe.contentDocument;
    if (doc && doc.body && typeof ResizeObserver !== "undefined") {
      bodyObserver = new ResizeObserver(() => fitPreview());
      bodyObserver.observe(doc.body);
    }
  });

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => fitPreview()).observe(previewEl);
  }

  // Set initial src after the card is in the DOM so URLs resolve against
  // the live page rather than a detached subtree.
  queueMicrotask(() => {
    if (root.isConnected) setIframeSrc(initialState);
    else requestAnimationFrame(() => { if (root.isConnected) setIframeSrc(initialState); });
  });

  return root;
}

function categoryDesignWidth(category) {
  switch (category) {
    case "components": return 360;
    case "modules":    return 1280;
    case "templates":  return 1280;
    default:           return 800;
  }
}

// Map a category id (components/modules/templates/etc.) to a Phosphor icon
// class. Used to render an icon next to each side-nav section so the sidebar
// can be collapsed to icons-only.
function sideNavIconFor(sectionId) {
  switch (sectionId) {
    case "awaiting-approval": return "ph-clock-countdown";
    case "drafts":            return "ph-pencil-simple";
    case "components":        return "ph-square";
    case "modules":           return "ph-stack";
    case "templates":         return "ph-browsers";
    default:                  return "ph-folder";
  }
}

function renderSideNav(sideNav, sections, categories) {
  sideNav.innerHTML = "";

  if (sections.length === 0) {
    sideNav.innerHTML = `
      <div class="lib-side__group-title">Catalog</div>
      <div class="lib-side__link" style="color: var(--lib-muted); cursor: default;">empty</div>
    `;
    return;
  }

  const title = document.createElement("div");
  title.className = "lib-side__group-title";
  title.textContent = "Catalog";
  sideNav.appendChild(title);

  for (const section of sections) {
    const link = document.createElement("a");
    link.className = "lib-side__link";
    link.href = `#section-${section.id}`;
    link.setAttribute("data-tooltip", section.title);
    link.innerHTML = `
      <i class="ph ${sideNavIconFor(section.id)} lib-side__icon" aria-hidden="true"></i>
      <span class="lib-side__label">${escape(section.title)}</span>
      <span class="lib-side__count">${section.entries.length}</span>
    `;
    sideNav.appendChild(link);
  }
}

function wireScrollSpy(sections, sideToggle) {
  const links = document.querySelectorAll(".lib-side__link[href^='#section-']");
  const linkBySlug = new Map();
  links.forEach((l) => linkBySlug.set(l.getAttribute("href"), l));
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  /* Suspend the scroll spy while a click-triggered smooth scroll is in
     flight. Without this, the IntersectionObserver fires for every
     section the page passes through, flickering `.is-active` between
     5+ links before landing on the destination. */
  let spySuspendedUntil = 0;
  const SUSPEND_MS = 900;

  function setActiveByHash(hash) {
    links.forEach((l) => l.classList.remove("is-active"));
    const match = linkBySlug.get(hash);
    if (match) match.classList.add("is-active");
    const sectionId = hash.replace(/^#section-/, "");
    const section = sectionById.get(sectionId);
    if (sideToggle && section) sideToggle.setLabel(section.title);
  }

  // On click, set the destination active immediately and gate the
  // observer until the scroll settles.
  links.forEach((link) => {
    link.addEventListener("click", () => {
      setActiveByHash(link.getAttribute("href"));
      spySuspendedUntil = Date.now() + SUSPEND_MS;
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      if (Date.now() < spySuspendedUntil) return;
      for (const e of entries) {
        if (e.isIntersecting) {
          setActiveByHash("#" + e.target.id);
        }
      }
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
  );

  for (const section of sections) {
    const el = document.getElementById(`section-${section.id}`);
    if (el) observer.observe(el);
  }
}

/* ------------------------------------------------------------------
   Mobile side-nav collapse
   ------------------------------------------------------------------
   On narrow viewports the sidebar collapses to a sticky button bar
   that names the current section. Tap the caret to expand the full
   nav as a dropdown. Outside click, Escape, and link click all close
   it. Returns a setter the scroll-spy uses to keep the label fresh.

   The same helper is duplicated in tokens.js because tokens.html
   doesn't import library.js. Both copies must stay in sync.
*/
// Document-level listeners attached by wireSideToggle() must not double-bind
// when the router calls initLibrary() on every nav. The element-bound
// listeners (toggle.addEventListener, nav.addEventListener) live inside
// <main> and die with the old DOM, so those CAN safely re-attach.
let sideToggleDocListenersInstalled = false;

function wireSideToggle() {
  const side = document.querySelector(".lib-side");
  const toggle = document.getElementById("lib-side-toggle");
  const label = document.getElementById("lib-side-toggle-label");
  const nav = document.getElementById("lib-side-nav");
  if (!side || !toggle || !nav) return null;

  const open  = () => { side.dataset.open = "true";  toggle.setAttribute("aria-expanded", "true");  };
  const close = () => { delete side.dataset.open;    toggle.setAttribute("aria-expanded", "false"); };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (side.dataset.open === "true") close(); else open();
  });

  // Closing the dropdown when the user picks a link from inside it
  // mirrors a typical menu UX and prevents the panel from covering the
  // section the user just navigated to.
  nav.addEventListener("click", (e) => {
    if (e.target.closest(".lib-side__link")) close();
  });

  if (!sideToggleDocListenersInstalled) {
    sideToggleDocListenersInstalled = true;
    // These listeners use document.querySelector(".lib-side") each fire
    // (not a captured reference) — see closeIfOpen / escapeIfOpen — so
    // they continue to work after <main> is swapped.
    document.addEventListener("click", closeIfOpenOutside);
    document.addEventListener("keydown", escapeIfOpen);
  }

  return {
    setLabel: (text) => { if (label && text) label.textContent = text; }
  };
}

// Module-level helpers used by the document-attached listeners. They
// re-query the current .lib-side each call so they keep working after
// the router swaps <main>.
function closeIfOpenOutside(e) {
  const side = document.querySelector(".lib-side");
  if (!side || side.dataset.open !== "true") return;
  if (!side.contains(e.target)) {
    delete side.dataset.open;
    const t = document.getElementById("lib-side-toggle");
    if (t) t.setAttribute("aria-expanded", "false");
  }
}

function escapeIfOpen(e) {
  if (e.key !== "Escape") return;
  const side = document.querySelector(".lib-side");
  if (!side || side.dataset.open !== "true") return;
  delete side.dataset.open;
  const t = document.getElementById("lib-side-toggle");
  if (t) { t.setAttribute("aria-expanded", "false"); t.focus(); }
}

function showError(title, body) {
  const content = document.getElementById("lib-content");
  content.innerHTML = `
    <div class="lib-empty">
      <h2 class="lib-empty__title">${escape(title)}</h2>
      <p class="lib-empty__body">${escape(body)}</p>
    </div>
  `;
}

function escape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

/* Reject any manifest path that doesn't match the on-disk convention. A
   hostile manifest could otherwise smuggle "../../etc/secret.html" or an
   absolute URL into iframe.src / fetch(). The schema in
   .loomling/schema/manifest.schema.json mirrors this regex. */
function isSafeManifestPath(p) {
  if (typeof p !== "string" || !p) return false;
  if (p.includes("..") || p.startsWith("/") || /[\\:]/.test(p)) return false;
  return /^src\/(components|modules|templates)\/[a-z0-9][a-z0-9-]*\/(_approved\/)?[a-zA-Z0-9._-]+\.(html|json|css|js)$/.test(p);
}
