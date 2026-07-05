/* ============================================================
   prototype-frame.js — click-to-load embed for the prototype-frame module
   ------------------------------------------------------------
   The poster + play disc is a click target. On tap, we swap the poster
   for an <iframe> or <video> pointed at the module's data-embed-url.
   Composing templates set data-embed-url + data-embed-kind on the
   root element; without them, the click is a no-op.

   Iframes are sandboxed with allow-scripts + allow-same-origin so the
   prototype can run its own JS but can't navigate the top page or run
   plugin content. Video preload is metadata-only so the poster stays
   the perceived weight until the user consents to play.

   Document-level delegation means one listener handles every instance,
   including any that get re-rendered by the sandbox / builder via
   innerHTML resets. Idempotent across reloads.
   ============================================================ */

(function () {
  if (window.LoomPrototypeFrame) return;

  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function load(root) {
    const frame = root.querySelector(".proto__frame");
    const embed = root.querySelector(".proto__embed");
    if (!frame || !embed) return;
    if (frame.dataset.loaded === "true") return;

    const url  = root.dataset.embedUrl  || "";
    const kind = root.dataset.embedKind || "iframe";
    if (!url) return;

    if (kind === "video") {
      embed.innerHTML =
        `<video src="${escapeAttr(url)}" controls playsinline preload="metadata" autoplay muted loop></video>`;
    } else {
      embed.innerHTML =
        `<iframe src="${escapeAttr(url)}" title="Prototype" ` +
        `allow="autoplay; fullscreen" ` +
        `sandbox="allow-scripts allow-same-origin allow-forms allow-popups" ` +
        `loading="lazy"></iframe>`;
    }
    embed.hidden = false;
    frame.dataset.loaded = "true";
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-loom-module="prototype-frame"] .proto__play');
    if (!btn) return;
    const root = btn.closest('[data-loom-module="prototype-frame"]');
    if (root) load(root);
  });

  window.LoomPrototypeFrame = { load };
})();
