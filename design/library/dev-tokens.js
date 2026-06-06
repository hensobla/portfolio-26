/* ============================================================
   dev-tokens.js — preview-only token overrides
   ------------------------------------------------------------
   Lets the user test the Tokens Import flow without round-
   tripping through Claude Code each time. Saves a CSS override
   to localStorage, injects it into the current Loom page, and
   (because module previews are same-origin) reaches into every
   iframe to inject the same style there too. This way a dev
   preview re-skins both the Loom chrome AND the real component
   previews (Sandbox, Builder canvas, composed templates) — so
   the user can validate how their proposed tokens look on real
   modules without pasting into CC.

   This is intentionally NOT a write path. The on-disk
   src/tokens.css never changes. A banner on every Loom page
   makes it obvious dev tokens are active and provides a one-
   click Clear. See system/tokens-import.md § Dev mode.
   ============================================================ */

(function () {
  const STORAGE_KEY = "loomling:dev-tokens:v1";
  const STYLE_ID = "loomling-dev-tokens";
  const BANNER_ID = "loomling-dev-banner";

  function read() {
    try { return localStorage.getItem(STORAGE_KEY) || null; }
    catch { return null; }
  }

  function write(css) {
    try { localStorage.setItem(STORAGE_KEY, css); }
    catch { /* quota / private mode — silent */ }
  }

  function erase() {
    try { localStorage.removeItem(STORAGE_KEY); }
    catch { /* no-op */ }
  }

  /* Inject the dev style into a given Document. Safe to call
     repeatedly — replaces the existing style if present. */
  function injectInto(doc, css) {
    if (!doc) return;
    let el = doc.getElementById(STYLE_ID);
    if (!el) {
      el = doc.createElement("style");
      el.id = STYLE_ID;
      doc.head.appendChild(el);
    }
    el.textContent = css;
  }

  function removeFrom(doc) {
    if (!doc) return;
    const el = doc.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  /* Walk every iframe under root and inject the dev style into
     its document on load. Also catches iframes added later via
     MutationObserver. Same-origin iframes only — cross-origin
     access throws and we swallow. */
  function hookIframes(root, css) {
    const hookOne = (frame) => {
      if (!frame || frame.tagName !== "IFRAME") return;
      const attempt = () => {
        try { injectInto(frame.contentDocument, css); } catch { /* cross-origin */ }
      };
      // Hit it now in case it's already loaded.
      attempt();
      // And on every reload (state changes, etc.).
      frame.addEventListener("load", attempt);
    };

    root.querySelectorAll("iframe").forEach(hookOne);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          // Use nodeType not `instanceof Element` — cross-realm nodes
          // (e.g. iframes appended inside a composed template's own
          // contentDocument) fail instanceof but are still elements.
          if (!n || n.nodeType !== 1) return;
          if (n.tagName === "IFRAME") hookOne(n);
          n.querySelectorAll?.("iframe").forEach(hookOne);
        });
      }
    });
    observer.observe(root, { childList: true, subtree: true });

    return observer;
  }

  /* The banner has two variants:
     - "dev" (default): user clicked Try it in the Import modal. Cleared
       via Clear button (removes from localStorage + DOM).
     - "proposal": CC wrote .loomling/tokens.proposed.css after a Vibe paste.
       Shows Commit + Discard buttons; each copies a CC-prompt to the
       clipboard with a brief toast. */
  function renderBanner(variant) {
    let el = document.getElementById(BANNER_ID);
    if (!variant) {
      if (el) el.remove();
      document.body?.removeAttribute("data-dev-tokens");
      return;
    }
    // Recreate if variant changed so listeners are fresh.
    if (el && el.dataset.variant !== variant) {
      el.remove();
      el = null;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = BANNER_ID;
      el.className = "dev-banner";
      el.dataset.variant = variant;
      if (variant === "proposal") {
        el.innerHTML = `
          <span class="dev-banner__dot" aria-hidden="true"></span>
          <span class="dev-banner__text">
            <strong>Proposed tokens</strong> — preview of Claude Code's response. Review across the Loom, then Commit or Discard.
          </span>
          <button type="button" class="dev-banner__clear" id="dev-banner-discard">Discard</button>
          <button type="button" class="dev-banner__commit" id="dev-banner-commit">Commit</button>
        `;
        document.body.appendChild(el);
        document.getElementById("dev-banner-commit").addEventListener("click", () => copyPromptToClipboard("commit"));
        document.getElementById("dev-banner-discard").addEventListener("click", () => copyPromptToClipboard("discard"));
      } else {
        el.innerHTML = `
          <span class="dev-banner__dot" aria-hidden="true"></span>
          <span class="dev-banner__text">
            <strong>Dev tokens active</strong> — preview only, not written to <code>src/tokens.css</code>.
          </span>
          <button type="button" class="dev-banner__clear" id="dev-banner-clear">Clear</button>
        `;
        document.body.appendChild(el);
        document.getElementById("dev-banner-clear").addEventListener("click", () => DevTokens.clear());
      }
    }
    document.body.setAttribute("data-dev-tokens", variant);
  }

  const COMMIT_PROMPT = `Commit the pending Tokens Import proposal:
1. Read \`.loomling/tokens.proposed.css\` and apply its contents to \`src/tokens.css\` per the original Vibe payload's scope (merge / replace-all / replace-target).
2. Update \`system/color.md\` (Palette + Surface map) and \`system/typography.md\` (family declarations) to match the now-committed tokens.
3. Run the contrast check (WCAG AA body-on-paper, 3:1 accent-on-paper) and surface any failure before finalizing.
4. If the proposal introduces a new semantic vocabulary (different role names), run § Finalize step 3.5 (rewrite \`var(--<old>)\` → \`var(--<new>)\` across \`src/{components,modules,templates}/**/*.css\`).
5. Delete \`.loomling/tokens.proposed.css\`.
6. Report back: tokens written, system docs updated, any drift or accessibility issues.

See \`system/tokens-import.md\` § Preview-and-commit protocol.`;

  const DISCARD_PROMPT = `Discard the pending Tokens Import proposal:
1. Delete \`.loomling/tokens.proposed.css\`.
2. Do NOT touch \`src/tokens.css\` or any \`system/*.md\` docs.
3. Report back confirming the file is gone.`;

  async function copyPromptToClipboard(kind) {
    const text = kind === "commit" ? COMMIT_PROMPT : DISCARD_PROMPT;
    try { await navigator.clipboard.writeText(text); }
    catch { /* swallow */ }
    showToast(kind === "commit" ? "Commit prompt copied — paste into Claude Code." : "Discard prompt copied — paste into Claude Code.");
  }

  function showToast(message) {
    let toast = document.getElementById("loomling-dev-toast");
    if (toast) toast.remove();
    toast = document.createElement("div");
    toast.id = "loomling-dev-toast";
    toast.className = "dev-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }

  /* The proposal file lives in .loomling/ (project metadata), not src/
     (deployable site content), so it never accidentally ships. All
     Loom views live in /library/, so ../.loomling/ is the right path. */
  const PROPOSAL_URL = "../.loomling/tokens.proposed.css";

  async function fetchProposal() {
    try {
      const res = await fetch(PROPOSAL_URL, { cache: "no-store" });
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.trim()) return null;
      return text;
    } catch { return null; }
  }

  const DevTokens = {
    /* Dev preview write (from the Import modal's Try it button).
       Takes precedence over a proposal file only while it's freshly
       applied — on reload, the proposal file wins (lasts longer; it
       represents an actual CC proposal, not just user tinkering). */
    apply(css) {
      if (!css || typeof css !== "string") return;
      write(css);
      injectInto(document, css);
      renderBanner("dev");
      document.querySelectorAll("iframe").forEach((frame) => {
        try { injectInto(frame.contentDocument, css); } catch { /* cross-origin */ }
      });
      // Tokens page (or any other view) can listen and re-render swatches.
      document.dispatchEvent(new CustomEvent("loomling:tokens-changed", { detail: { source: "apply" } }));
    },

    clear() {
      erase();
      removeFrom(document);
      document.querySelectorAll("iframe").forEach((frame) => {
        try { removeFrom(frame.contentDocument); } catch { /* cross-origin */ }
      });
      renderBanner(null);
      document.dispatchEvent(new CustomEvent("loomling:tokens-changed", { detail: { source: "clear" } }));
    },

    isActive() { return !!read(); },

    /* Re-exported helper so other modules (e.g. tokens.js's Reset
       affordance) can render the same dev-banner-style toast. */
    showToast,

    async init() {
      // Proposal file wins over localStorage dev preview — a CC-written
      // proposal is more authoritative than a user's tinkering.
      const proposalCss = await fetchProposal();
      if (proposalCss) {
        injectInto(document, proposalCss);
        renderBanner("proposal");
        hookIframes(document.body, proposalCss);
        return;
      }
      const css = read();
      if (css) {
        injectInto(document, css);
        renderBanner("dev");
      }
      const onReady = () => hookIframes(document.body, read() || "");
      if (document.body) onReady();
      else document.addEventListener("DOMContentLoaded", onReady);
    }
  };

  // Expose for the Tokens Import flow to call.
  window.DevTokens = DevTokens;

  // Auto-init on every Loom page that loads this script.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => DevTokens.init());
  } else {
    DevTokens.init();
  }
})();
