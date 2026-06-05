/* ============================================================
   loom-router.js — Loom client-side router (vanilla)
   ------------------------------------------------------------
   The Loom is a multi-page app (Library / System / Components /
   Builder / Settings) — each tab is its own HTML document. Every
   click used to be a full page reload, which felt jittery (white
   flash, scripts restart, sidebar state re-applies, brand text
   flashes in late).

   This router intercepts those clicks and swaps just the <main>
   element instead, keeping the header / brand / theme / sidebar
   collapse state / matchMedia listeners alive across navigations.
   No framework, no library — vanilla JS, in keeping with the
   "library viewer stays vanilla forever" rule (CLAUDE.md §11).

   Lifecycle:
     1. User clicks a .lib-tab link.
     2. Router fetches the destination HTML.
     3. Parses out: <title>, <main> content, body[data-page],
        active-tab href.
     4. Swaps the current <main> with the new one. Updates the
        header's active tab class, document.title, body[data-page],
        and history (pushState).
     5. Dispatches `loom:nav` on document. Each page script
        (library.js / tokens.js / primitives.js / settings.js)
        listens for this event and re-runs its init via the
        `window.LoomPages` registry.

   Pages outside the registry (e.g. Builder, which has Sortable.js
   and a fundamentally different shape) fall through to a normal
   browser navigation — no harm, just no smoothness boost there.

   Failure modes (bad HTML, fetch error, missing <main>) fall back
   to a real navigation so the user never gets stranded.

   Each page script must follow this contract:
     window.LoomPages = window.LoomPages || {};
     window.LoomPages.<page> = function init() { ... };
   The init function runs on every navigation INTO that page. It
   should be idempotent — guard one-time setup (matchMedia,
   document-level listeners) behind closure flags so it doesn't
   double-bind on re-entry.
   ============================================================ */

(function () {
  // Selector for the swap region. We match the <main> tag rather than a
  // specific class because Library / System / Components / Settings use
  // `.lib-main` but Builder uses `.bld-main` — the tag is the stable
  // contract every Loom page agrees on.
  const SWAP_SELECTOR = "main";
  const ROUTABLE_PAGES = new Set(["library", "tokens", "components", "builder", "settings"]);

  // Left-to-right order of the top nav tabs. Used to compute the
  // animation direction — clicking a tab to the left of the current
  // page slides one way; clicking right slides the other. Builder
  // isn't routed but sits in the visual order for direction math
  // (e.g. Components → Settings is still "forward" even though we
  // skip over Builder in the routing layer).
  const TAB_ORDER = ["index.html", "tokens.html", "components.html", "builder.html", "settings.html"];

  function currentHref() {
    return (location.pathname.split("/").pop() || "index.html").split("?")[0];
  }

  function directionFor(toHref) {
    const from = TAB_ORDER.indexOf(currentHref());
    const to   = TAB_ORDER.indexOf(toHref);
    if (from === -1 || to === -1 || from === to) return null;
    return to > from ? "forward" : "back";
  }

  // Per-page <title> overrides. We could also pull this from the
  // fetched document, but pre-listing keeps the first paint snappy
  // (title updates the moment the user clicks, not after fetch).
  // Filled lazily from successful navigations.
  const titleCache = new Map();

  function isHandled(href) {
    if (!href || href.startsWith("#") || /^https?:/i.test(href)) return false;
    return true;
  }

  // Append any <link rel="stylesheet"> the destination document links but the
  // live document's head lacks, keyed by the href attribute (all Loom pages
  // live in /library/, so relative hrefs compare 1:1 without resolution). If
  // one or more sheets were newly added, fire `onNewSheetLoaded` once the last
  // of them finishes loading, so renderers reading their tokens can repopulate.
  function adoptMissingStylesheets(doc, onNewSheetLoaded) {
    const present = new Set(
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((l) => l.getAttribute("href"))
    );
    const toAdd = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .filter((l) => !present.has(l.getAttribute("href")));
    if (!toAdd.length) return;

    let pending = toAdd.length;
    const settle = () => { if (--pending === 0 && onNewSheetLoaded) onNewSheetLoaded(); };
    for (const src of toAdd) {
      const link = document.createElement("link");
      // Copy the meaningful attributes (href, integrity, crossorigin, media)
      // rather than importing the node, so it's owned by this document.
      for (const { name, value } of Array.from(src.attributes)) {
        link.setAttribute(name, value);
      }
      link.addEventListener("load", settle, { once: true });
      link.addEventListener("error", settle, { once: true });
      document.head.appendChild(link);
    }
  }

  // Scripts inserted via DOMParser + replaceWith() are inert — the HTML spec
  // never executes them. So any <script> a page keeps inside its <main> (e.g.
  // the System page's inline motion-demo wiring, and its src=motion.js) silently
  // fails to run after an SPA swap, even though it runs fine on a hard load.
  // Re-create each one as a fresh, executable node so it behaves like a real
  // navigation. Inline scripts run synchronously in document order here; src
  // scripts re-fetch (cached) and run on load. Both must be idempotent — they
  // re-run on every nav into the page (the page scripts already guard this).
  function executeMainScripts(container) {
    const scripts = container.querySelectorAll("script");
    for (const old of scripts) {
      const fresh = document.createElement("script");
      for (const { name, value } of Array.from(old.attributes)) {
        fresh.setAttribute(name, value);
      }
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    }
  }

  function intercept(e) {
    // Modifier keys / non-primary clicks → let the browser handle
    // (cmd-click to open in new tab still works).
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;

    const a = e.target.closest(".lib-tab");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!isHandled(href)) return;

    e.preventDefault();
    if (a.classList.contains("is-active")) return; // already here
    navigate(href, /* pushHistory */ true);
  }

  async function navigate(href, pushHistory) {
    // Mark the clicked tab active immediately so the UI feels responsive
    // even before the fetch resolves. If the navigation fails, we revert
    // by hard-loading the href.
    document.querySelectorAll(".lib-tab").forEach((t) => {
      t.classList.toggle("is-active", t.getAttribute("href") === href);
    });

    // Pre-update title if we've seen this page before. Otherwise updates
    // after the fetch.
    const cachedTitle = titleCache.get(href);
    if (cachedTitle) document.title = cachedTitle;

    let html;
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      html = await res.text();
    } catch (err) {
      // Fallback to a regular navigation so the user always gets there.
      window.location.href = href;
      return;
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const newMain = doc.querySelector(SWAP_SELECTOR);
    const oldMain = document.querySelector(SWAP_SELECTOR);
    if (!newMain || !oldMain) {
      window.location.href = href;
      return;
    }

    // Compute slide direction. We do this BEFORE the swap so we capture
    // the user's previous location (currentHref() reads from
    // window.location which is still the source page until pushState).
    const direction = directionFor(href);

    // Bundle the DOM mutations into one callback so they all happen
    // inside a single View Transition snapshot boundary. The browser:
    //   1. snapshots the current document
    //   2. invokes `swap()` to mutate the DOM to the new state
    //   3. snapshots the new state
    //   4. animates from snapshot 1 → snapshot 2 using the CSS keyframes
    //      bound to ::view-transition-old/new(root)
    const swap = () => {
      if (doc.title) {
        document.title = doc.title;
        titleCache.set(href, doc.title);
      }
      const newPage = doc.body.getAttribute("data-page") || "";
      const runPageInit = () => {
        if (window.LoomPages && typeof window.LoomPages[newPage] === "function") {
          try { window.LoomPages[newPage](); } catch (e) { console.error("Page init error:", e); }
        }
      };
      // The router swaps only <main>, so the destination page's <head> never
      // enters the document. Any stylesheet the destination links but the
      // current head lacks (e.g. src/tokens.css, which the System page's color
      // tiles read) would silently go missing. Adopt the missing ones. A newly
      // added sheet loads async, so re-run the page init once it lands — the
      // renderers that read its tokens repopulate (init is idempotent).
      adoptMissingStylesheets(doc, runPageInit);
      if (newPage) document.body.setAttribute("data-page", newPage);
      oldMain.replaceWith(newMain);
      // Re-execute any <script> the new <main> carries — DOMParser left them
      // inert. Without this, inline page scripts (e.g. the System page's motion
      // demos) never run when the page is reached via SPA nav.
      executeMainScripts(newMain);
      if (pushHistory) {
        try { history.pushState({ href }, "", href); } catch (_) {}
      }
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent("loom:nav", {
        detail: { href, page: newPage }
      }));
      runPageInit();
    };

    if (direction && typeof document.startViewTransition === "function") {
      // The dataset attribute is what the CSS ::view-transition rules
      // select on (data-loom-nav-direction="forward" / "back"). Cleared
      // when the transition finishes so it doesn't leak into the next
      // navigation.
      document.documentElement.dataset.loomNavDirection = direction;
      const transition = document.startViewTransition(swap);
      transition.finished.finally(() => {
        delete document.documentElement.dataset.loomNavDirection;
      });
    } else {
      // No View Transitions support (Firefox <130, or same-page click) —
      // just swap immediately. No visible regression vs. the un-animated
      // baseline.
      swap();
    }
  }

  // Back/forward button — re-swap to the URL the browser is now
  // showing. popstate fires with the same href; we treat it like a
  // navigate() without pushState.
  window.addEventListener("popstate", () => {
    const href = location.pathname.split("/").pop() || "index.html";
    navigate(href, /* pushHistory */ false);
  });

  // One click handler at the document level — survives <main> swaps
  // because document never gets replaced.
  document.addEventListener("click", intercept);

  // Expose for debugging / programmatic nav.
  window.LoomRouter = { navigate };
})();
