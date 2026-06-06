/* ============================================================
   motion.js — Loomling reveal-on-scroll helper
   ------------------------------------------------------------
   Wires the [data-loom-reveal] attribute (defined in motion.css)
   to an IntersectionObserver. When an element enters the
   viewport, .loom-revealed is added to it, which fires the
   matching CSS animation.

   Exposes a global API:
     window.LoomMotion.init(scope?)    — scan and observe new elements
     window.LoomMotion.replay(scope?)  — strip .loom-revealed, reflow,
                                          re-observe (for "Replay" buttons)

   Auto-inits on DOMContentLoaded (or immediately if the script
   loads after the document is ready). Idempotent — re-calling
   init() won't re-attach observers to already-wired elements
   thanks to the dataset.loomMotionInit guard.

   No external dependencies. Graceful fallback if
   IntersectionObserver isn't supported (rare): elements are
   revealed immediately so content isn't permanently hidden.
   ============================================================ */

(() => {
  const REVEAL_ATTR = 'data-loom-reveal';
  const REVEALED_CLASS = 'loom-revealed';
  let observer = null;

  function ensureObserver() {
    if (observer) return observer;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return null;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(REVEALED_CLASS);
          observer.unobserve(entry.target);
        }
      });
    }, {
      // Reveal a touch before the element fully enters the viewport.
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    });
    return observer;
  }

  function init(scope) {
    const root = scope || document;
    const els = root.querySelectorAll('[' + REVEAL_ATTR + ']');
    const obs = ensureObserver();
    els.forEach((el) => {
      if (el.dataset.loomMotionInit === 'true') return;
      // Manual mode: an ancestor with [data-loom-reveal-mode="manual"]
      // opts out of auto-observation. Used by the System page Motion
      // demos, which drive reveals via hover + a replay button instead
      // of scroll position. Site code can use the same attribute when
      // it wants to trigger reveals on its own events (button click,
      // route transition, etc).
      if (el.closest('[data-loom-reveal-mode="manual"]')) return;
      el.dataset.loomMotionInit = 'true';
      if (!obs) {
        // IntersectionObserver unavailable — reveal immediately so
        // content isn't permanently invisible.
        el.classList.add(REVEALED_CLASS);
        return;
      }
      obs.observe(el);
    });
  }

  function replay(scope) {
    const root = scope || document;
    const els = root.querySelectorAll('[' + REVEAL_ATTR + ']');
    els.forEach((el) => {
      el.classList.remove(REVEALED_CLASS);
      el.dataset.loomMotionInit = '';
      // Force a reflow so the next animation cycle restarts cleanly.
      void el.offsetWidth;
    });
    init(root);
  }

  window.LoomMotion = { init, replay };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
