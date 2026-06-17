/* ============================================================
   interactive-grid.js — Blueprint interactive grid background
   ------------------------------------------------------------
   A canvas-rendered grid wash whose cells shade under the cursor.
   Drop the script in, call InteractiveGrid.mount() — the canvas
   creates itself, wires mouse + resize listeners, and runs a
   dirty-flag rAF loop that sleeps to 0 CPU when idle.

   Defaults read straight from the Blueprint tokens, so the grid
   matches the rest of the site without configuration AND auto-flips
   when the theme changes (data-theme attribute or OS preference):
     - cellSize   ← var(--space-6)        (32px = site grid)
     - bgColor    ← var(--background)
     - lineColor  ← var(--border)
     - hoverColor ← var(--surface1)       (raised; lighter than bg
                                           in both light + dark)
   Token-derived fields re-resolve on theme change; explicit values
   passed via opts stay locked (the lab's panel uses explicit hexes
   so its UI controls aren't fighting an auto-refresh).

   Usage:
     const grid = InteractiveGrid.mount();
     // or:
     const grid = InteractiveGrid.mount({
       hoverColor: '#F2EFE8',
       hoverRadius: 160,
       radiusShape: 'circle',     // 'circle' | 'square' | 'diamond'
       smoothTau: 240,            // ms
       hoverOpacity: 1,           // 0..1 — multiply into the hover wash alpha
       tailTau: 0,                // ms; > 0 = capsule trail (head→tail blob)
     });
     grid.update({ hoverRadius: 200 });   // tweak any field at runtime
     grid.pause();                         // freeze rAF; cursor still tracked
     grid.resume();                        // restart rAF, snap to current pos
     grid.destroy();                       // remove + detach
   ============================================================ */

(() => {
  function readSpaceToken(name, rootEl) {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:var(${name});`;
    (rootEl || document.body).appendChild(probe);
    const px = probe.offsetWidth;
    probe.remove();
    return px > 0 ? px : 32;
  }

  function resolveToken(name, rootEl, fallback) {
    const val = getComputedStyle(rootEl || document.documentElement)
      .getPropertyValue(name).trim();
    return val || fallback;
  }

  function mount(opts) {
    opts = opts || {};
    const container = opts.container || document.body;

    // --- Canvas (the visible layer) -----------------------------
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;display:block;pointer-events:none;';
    canvas.style.zIndex = String(opts.zIndex != null ? opts.zIndex : 0);
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });

    // --- Grid-line cache (offscreen) ----------------------------
    const gridCache = document.createElement('canvas');
    const gridCtx = gridCache.getContext('2d');

    // --- Config (token-driven defaults; everything overridable) -
    // Resolvers for the token-driven defaults — also re-called on theme
    // changes so the bg flips automatically with light/dark.
    function autoBg()    { return resolveToken('--background', container, '#F7F4EE'); }
    function autoLine()  { return resolveToken('--border',     container, 'rgba(0, 0, 0, 0.15)'); }
    function autoHover() { return resolveToken('--surface1',   container, '#F2EFE8'); }

    // Track which color fields were derived from tokens (vs. explicit opts).
    // Only token-derived fields re-resolve when the theme flips; explicit
    // hexes from the host (e.g. the lab's panel) stay locked.
    const tokenDerived = {
      bgColor:    opts.bgColor    == null,
      lineColor:  opts.lineColor  == null,
      hoverColor: opts.hoverColor == null,
    };

    const config = {
      cellSize:   opts.cellSize   != null ? opts.cellSize   : readSpaceToken('--space-6', container),
      bgColor:    tokenDerived.bgColor    ? autoBg()    : opts.bgColor,
      lineColor:  tokenDerived.lineColor  ? autoLine()  : opts.lineColor,
      // --surface1 is the canonical hover surface per system/color.md — it's
      // slightly LIGHTER than --background in both modes (cream-raised on
      // light, charcoal-raised on dark), so the wash reads as "cells lift
      // toward the cursor" in either theme.
      hoverColor: tokenDerived.hoverColor ? autoHover() : opts.hoverColor,
      hoverRadius: opts.hoverRadius != null ? opts.hoverRadius : 160,
      radiusShape: opts.radiusShape || 'circle',
      smoothTau:   opts.smoothTau   != null ? opts.smoothTau   : 240,
      // 0..1 multiplier on the hover wash. The host fades this 1→0 to dim
      // the wash before a takeover, then 0→1 on close. 0 short-circuits the
      // inner cell loop so paused frames cost only a bg + grid blit.
      hoverOpacity: opts.hoverOpacity != null ? opts.hoverOpacity : 1,
      // Capsule trail (circle shape only). 0 = no trail, the wash stays a
      // circle (original behavior). > 0 renders the wash as a capsule from a
      // fast-follow "head" point at (smoothX, smoothY) — the standard cursor
      // smoothing, tau = smoothTau — to a slow-follow "tail" point with this
      // tau. On a curve, head and tail trace different parts of the path so
      // the capsule naturally bends along it and its rotation lags the
      // instantaneous velocity — feels like a dragged blob with inertia
      // instead of a rigid ellipse aimed at the velocity vector.
      tailTau: opts.tailTau != null ? opts.tailTau : 0,
    };

    // --- State --------------------------------------------------
    // mouse.seen flips true on the first mousemove and stays true so the
    // shading persists when the cursor leaves the viewport (it stops at its
    // last position and eases to the new spot on re-entry).
    // tailX/Y is a second smoothed position with tau = config.tailTau (when
    // > 0); it lags smoothX/Y and forms the trailing endpoint of the capsule.
    const mouse = {
      x: -9999, y: -9999,
      smoothX: -9999, smoothY: -9999,
      tailX: -9999, tailY: -9999,
      seen: false,
    };
    let cols = 0, rows = 0, viewW = 0, viewH = 0;
    let lastFrame = 0;

    // --- Render loop (dirty-flag; rAF only when work to do) -----
    let rafScheduled = false;
    let dirty = false;
    // When paused, the rAF tick early-returns and mousemove stops markDirty'ing.
    // Position is still tracked in mouse.x/y so resume() can snap to the
    // current cursor instead of swinging back through the pre-pause spot.
    let paused = false;

    function markDirty() {
      dirty = true;
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(tick);
      }
    }

    function smoothingActive() {
      if (Math.abs(mouse.smoothX - mouse.x) > 0.5) return true;
      if (Math.abs(mouse.smoothY - mouse.y) > 0.5) return true;
      // Keep the rAF loop running until the tail has also caught up; otherwise
      // the capsule would freeze mid-collapse when smooth reaches raw but
      // tail hasn't yet caught up to smooth.
      if (config.tailTau > 0) {
        if (Math.abs(mouse.tailX - mouse.smoothX) > 0.5) return true;
        if (Math.abs(mouse.tailY - mouse.smoothY) > 0.5) return true;
      }
      return false;
    }

    function tick(now) {
      rafScheduled = false;
      if (paused) return;
      render(now);
      if (smoothingActive() || dirty) {
        rafScheduled = true;
        requestAnimationFrame(tick);
      }
    }

    // --- Drawing -------------------------------------------------
    function paintGridCache() {
      const dpr = window.devicePixelRatio || 1;
      gridCache.width = Math.floor(viewW * dpr);
      gridCache.height = Math.floor(viewH * dpr);
      gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridCtx.clearRect(0, 0, viewW, viewH);
      gridCtx.strokeStyle = config.lineColor;
      gridCtx.lineWidth = 1;
      gridCtx.beginPath();
      const cs = config.cellSize;
      for (let cx = 0; cx <= cols; cx++) {
        const x = Math.round(cx * cs) + 0.5;
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, rows * cs);
      }
      for (let cy = 0; cy <= rows; cy++) {
        const y = Math.round(cy * cs) + 0.5;
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(cols * cs, y);
      }
      gridCtx.stroke();
    }

    function resizeGrid() {
      const dpr = window.devicePixelRatio || 1;
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.style.width = viewW + 'px';
      canvas.style.height = viewH + 'px';
      canvas.width = Math.floor(viewW * dpr);
      canvas.height = Math.floor(viewH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(viewW / config.cellSize);
      rows = Math.ceil(viewH / config.cellSize);
      paintGridCache();
      // Paint synchronously: setting canvas.width clears the backing store
      // (to opaque black with alpha:false); waiting for the next rAF leaves a
      // one-frame flash visible during a resize drag.
      render(performance.now());
      markDirty();
    }

    function render(now) {
      // Exponential follow on the cursor. Head follows raw with smoothTau;
      // when tailTau > 0, the tail follows head with that slower tau so the
      // segment from (smoothX, smoothY) → (tailX, tailY) traces the cursor's
      // recent path.
      const dt = lastFrame ? Math.min(50, now - lastFrame) : 16;
      lastFrame = now;
      const alpha = 1 - Math.exp(-dt / Math.max(1, config.smoothTau));
      mouse.smoothX += (mouse.x - mouse.smoothX) * alpha;
      mouse.smoothY += (mouse.y - mouse.smoothY) * alpha;
      if (config.tailTau > 0) {
        const tAlpha = 1 - Math.exp(-dt / Math.max(1, config.tailTau));
        mouse.tailX += (mouse.smoothX - mouse.tailX) * tAlpha;
        mouse.tailY += (mouse.smoothY - mouse.tailY) * tAlpha;
      } else {
        mouse.tailX = mouse.smoothX;
        mouse.tailY = mouse.smoothY;
      }
      dirty = false;

      // 1) Background.
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2) Shaded cells inside the hover region (binary fill — no gradient).
      // hoverOpacity ≤ 0 short-circuits the whole block: paused or fully-faded
      // frames cost only the bg fill + grid blit.
      if (mouse.seen && config.hoverOpacity > 0) {
        const hx = mouse.smoothX;
        const hy = mouse.smoothY;
        const tx = mouse.tailX;
        const ty = mouse.tailY;
        const r = config.hoverRadius;
        const r2 = r * r;
        const shape = config.radiusShape;
        const cs = config.cellSize;

        // Capsule mode = circle shape AND tailTau > 0. Squares/diamonds keep
        // their technical inside-checks; when tailTau == 0, head and tail
        // are pinned together and the capsule collapses to the original circle.
        const useCapsule = shape === 'circle' && config.tailTau > 0;

        // Segment vector (head → tail). At rest this is zero and the capsule
        // degenerates to a single circle centered at head.
        const segX = tx - hx;
        const segY = ty - hy;
        const segLenSq = segX * segX + segY * segY;

        // AABB = union of two r-radius circles at head and tail.
        const minX = Math.min(hx, tx) - r;
        const maxX = Math.max(hx, tx) + r;
        const minY = Math.min(hy, ty) - r;
        const maxY = Math.max(hy, ty) + r;
        const minCx = Math.max(0, Math.floor(minX / cs));
        const maxCx = Math.min(cols - 1, Math.floor(maxX / cs));
        const minCy = Math.max(0, Math.floor(minY / cs));
        const maxCy = Math.min(rows - 1, Math.floor(maxY / cs));
        if (maxCx >= minCx && maxCy >= minCy) {
          ctx.fillStyle = config.hoverColor;
          ctx.globalAlpha = config.hoverOpacity;
          for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
              const ccx = cx * cs + cs / 2;
              const ccy = cy * cs + cs / 2;
              const dx = ccx - hx;
              const dy = ccy - hy;
              let inside;
              if (shape === 'square') {
                inside = Math.max(Math.abs(dx), Math.abs(dy)) <= r;
              } else if (shape === 'diamond') {
                inside = Math.abs(dx) + Math.abs(dy) <= r;
              } else if (useCapsule && segLenSq > 0.25) {
                // Capsule inside-check: distance from cell center to the
                // segment from (hx, hy) → (tx, ty) ≤ r. Project the cell's
                // offset-from-head onto the segment, clamp t to [0, 1] so the
                // projection lives within the segment, then measure the
                // perpendicular distance to the closest point on the segment.
                let t = (dx * segX + dy * segY) / segLenSq;
                if (t < 0) t = 0; else if (t > 1) t = 1;
                const px = t * segX;
                const py = t * segY;
                const ex = dx - px;
                const ey = dy - py;
                inside = ex * ex + ey * ey <= r2;
              } else {
                inside = dx * dx + dy * dy <= r2;
              }
              if (inside) ctx.fillRect(cx * cs, cy * cs, cs, cs);
            }
          }
          ctx.globalAlpha = 1;
        }
      }

      // 3) Grid lines on top (blit the cached pass).
      ctx.drawImage(gridCache, 0, 0, viewW, viewH);
    }

    // --- Listeners ----------------------------------------------
    // Cursor position is tracked unconditionally — pause only suppresses
    // re-render, so resume() can snap to the cursor's current spot rather than
    // re-animating from the pre-pause location.
    const onMouseMove = (e) => {
      if (!mouse.seen) {
        mouse.smoothX = e.clientX;
        mouse.smoothY = e.clientY;
        // Snap the tail to the same point on first move so the capsule starts
        // as a single circle and grows naturally from there rather than
        // sweeping in from offscreen (-9999, -9999).
        mouse.tailX = e.clientX;
        mouse.tailY = e.clientY;
        mouse.seen = true;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!paused) markDirty();
    };
    document.addEventListener('mousemove', onMouseMove);

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; resizeGrid(); });
    });
    ro.observe(document.documentElement);

    // --- Theme responsiveness ---------------------------------------
    // Re-resolve any token-derived colors when the theme flips — both the
    // Loom's explicit toggle (sets <html data-theme="dark">) and OS-level
    // preference changes (the @media block in tokens.css). Explicit colors
    // passed via opts stay locked.
    function refreshTokens() {
      const patch = {};
      if (tokenDerived.bgColor)    patch.bgColor    = autoBg();
      if (tokenDerived.lineColor)  patch.lineColor  = autoLine();
      if (tokenDerived.hoverColor) patch.hoverColor = autoHover();
      if (!Object.keys(patch).length) return;
      Object.assign(config, patch);
      if ('lineColor' in patch) paintGridCache();
      markDirty();
    }
    const themeObserver = new MutationObserver(refreshTokens);
    themeObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
    const colorSchemeMql = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)');
    if (colorSchemeMql && colorSchemeMql.addEventListener) {
      colorSchemeMql.addEventListener('change', refreshTokens);
    }

    // --- Boot ---------------------------------------------------
    resizeGrid();

    // --- Public surface -----------------------------------------
    return {
      update(patch) {
        if (!patch) return;
        Object.assign(config, patch);
        // Line color / cell size affect the cached grid; repaint it.
        if ('lineColor' in patch || 'cellSize' in patch) {
          cols = Math.ceil(viewW / config.cellSize);
          rows = Math.ceil(viewH / config.cellSize);
          paintGridCache();
        }
        markDirty();
      },
      // Freeze the rAF loop. Cursor tracking continues so a later resume()
      // can snap to the current position.
      pause() {
        paused = true;
      },
      // Restart the rAF loop. Snap the smoothed cursor to the current cursor
      // so the wash doesn't swing back through the pre-pause spot; mouse.seen
      // false (no mousemove yet) is left alone — the next move will seed it.
      resume() {
        if (!paused) return;
        paused = false;
        if (mouse.seen) {
          mouse.smoothX = mouse.x;
          mouse.smoothY = mouse.y;
        }
        markDirty();
      },
      get paused() { return paused; },
      destroy() {
        document.removeEventListener('mousemove', onMouseMove);
        ro.disconnect();
        themeObserver.disconnect();
        if (colorSchemeMql && colorSchemeMql.removeEventListener) {
          colorSchemeMql.removeEventListener('change', refreshTokens);
        }
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        canvas.remove();
      },
      // Read-only accessor for debugging / lab wiring.
      get config() { return Object.assign({}, config); },
    };
  }

  window.InteractiveGrid = { mount };
})();
