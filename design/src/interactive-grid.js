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
       stretchFactor: 0,          // 0..1+; ellipse elongation at speed cap
       velocityTau: 0,            // ms; inertia in the stretch direction
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
      // Velocity-driven ellipse stretch (circle shape only). 0 = no stretch
      // (circle stays a circle). At speed cap the major axis grows by
      // (1 + stretchFactor)×, minor axis shrinks by 1/sqrt(1 + stretchFactor)×
      // so area is roughly preserved. The blob stays centered on the cursor —
      // no trail — so it reads as a compact deforming blob, not a worm.
      stretchFactor: opts.stretchFactor != null ? opts.stretchFactor : 0,
      // Cursor speed (pixels / second) at which the stretch caps out. Below
      // this the stretch ramps linearly with speed; above it the stretch
      // pins at (1 + stretchFactor)×.
      stretchSpeedScale: opts.stretchSpeedScale != null ? opts.stretchSpeedScale : 1500,
      // Inertia on the stretch DIRECTION. 0 = direction snaps to the
      // instantaneous velocity vector (rigid rotation — felt unnatural on
      // curves). > 0 = the velocity vector is exponentially smoothed over
      // this tau, so the ellipse's major axis lags actual cursor direction
      // through curves and reversals.
      velocityTau: opts.velocityTau != null ? opts.velocityTau : 0,
      // Damped-spring bounce on the stretch MAGNITUDE. 0 = no spring (the
      // stretch tracks its target directly via velocityTau-smoothed
      // velocity). > 0 = the stretch follows a 2nd-order damped oscillator
      // toward its target, so it overshoots and bounces. springPeriod is
      // the natural oscillation period in ms; springDamping is the damping
      // ratio (0 = no damping / oscillates forever, 1 = critical / fastest
      // settle, no overshoot). Values around 0.5-0.7 give a subtle bounce.
      // When motion stops, the wash overshoots its rest size (squashing
      // perpendicular to the last velocity), then bounces back to a circle.
      springPeriod:  opts.springPeriod  != null ? opts.springPeriod  : 0,
      springDamping: opts.springDamping != null ? opts.springDamping : 0.7,
    };

    // --- State --------------------------------------------------
    // mouse.seen flips true on the first mousemove and stays true so the
    // shading persists when the cursor leaves the viewport (it stops at its
    // last position and eases to the new spot on re-entry).
    // vx/vy is the smoothed velocity vector — direction and magnitude both
    // lag the instantaneous (raw - smooth) delta by velocityTau.
    // stretchCurrent/stretchVel are the spring state for the stretch
    // magnitude (used when springPeriod > 0); lastCos/lastSin remember the
    // last meaningful velocity direction so the spring's squash overshoot
    // is oriented correctly even after the cursor has stopped (when speed
    // → 0 there's no direction to compute).
    const mouse = {
      x: -9999, y: -9999,
      smoothX: -9999, smoothY: -9999,
      // lastRenderX/Y let render() compute per-frame cursor displacement
      // — drops to 0 the frame after the cursor stops, which is the step
      // change the spring needs in order to bounce.
      lastRenderX: -9999, lastRenderY: -9999,
      vx: 0, vy: 0,
      stretchCurrent: 1, stretchVel: 0,
      lastCos: 1, lastSin: 0,
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
      // Keep the loop running while the smoothed velocity vector still has
      // magnitude; otherwise the blob would freeze mid-collapse after the
      // cursor stops but before the ellipse has shrunk back to a circle.
      if (config.velocityTau > 0 &&
          (Math.abs(mouse.vx) > 0.5 || Math.abs(mouse.vy) > 0.5)) return true;
      // Keep the loop alive while the spring is still oscillating, so the
      // bounce plays out after the velocity-smoothing has converged.
      if (config.springPeriod > 0 &&
          (Math.abs(mouse.stretchCurrent - 1) > 0.005 ||
           Math.abs(mouse.stretchVel) > 0.05)) return true;
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
      // Exponential follow on the cursor (head position).
      const dt = lastFrame ? Math.min(50, now - lastFrame) : 16;
      lastFrame = now;
      const alpha = 1 - Math.exp(-dt / Math.max(1, config.smoothTau));
      mouse.smoothX += (mouse.x - mouse.smoothX) * alpha;
      mouse.smoothY += (mouse.y - mouse.smoothY) * alpha;
      // Smooth the velocity vector itself. Instantaneous proxy is
      // (raw - smooth); smoothing it adds rotation inertia (direction lags
      // on curves) and natural decay (magnitude eases back to 0 after the
      // cursor stops, so the blob shrinks gradually instead of snapping
      // back to a circle).
      const iVx = mouse.x - mouse.smoothX;
      const iVy = mouse.y - mouse.smoothY;
      if (config.velocityTau > 0) {
        const vAlpha = 1 - Math.exp(-dt / Math.max(1, config.velocityTau));
        mouse.vx += (iVx - mouse.vx) * vAlpha;
        mouse.vy += (iVy - mouse.vy) * vAlpha;
      } else {
        mouse.vx = iVx;
        mouse.vy = iVy;
      }
      dirty = false;

      // 1) Background.
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2) Shaded cells inside the hover region (binary fill — no gradient).
      // hoverOpacity ≤ 0 short-circuits the whole block: paused or fully-faded
      // frames cost only the bg fill + grid blit.
      if (mouse.seen && config.hoverOpacity > 0) {
        const mx = mouse.smoothX;
        const my = mouse.smoothY;
        const r = config.hoverRadius;
        const r2 = r * r;
        const shape = config.radiusShape;
        const cs = config.cellSize;

        // Ellipse deformation (circle shape only). The blob stays centered
        // on the cursor; the smoothed velocity vector (mouse.vx, mouse.vy)
        // sets BOTH the target stretch magnitude AND its orientation.
        const useStretch = shape === 'circle' && config.stretchFactor > 0;
        let stretch = 1, squash = 1;
        let cosA = mouse.lastCos;
        let sinA = mouse.lastSin;
        if (useStretch) {
          // Magnitude target tracks the per-frame cursor displacement (in
          // px/sec), NOT the smoothed velocity proxy. The frame velocity
          // drops to 0 the very next render after the cursor stops, which
          // gives the spring a real step change to bounce off — the
          // smoothing-based proxy decayed over ~smoothTau and the spring
          // just tracked it, never overshooting visibly.
          const frameDx = mouse.x - mouse.lastRenderX;
          const frameDy = mouse.y - mouse.lastRenderY;
          mouse.lastRenderX = mouse.x;
          mouse.lastRenderY = mouse.y;
          const framePxPerSec = Math.hypot(frameDx, frameDy) * 1000 / Math.max(1, dt);
          const t = Math.min(framePxPerSec / config.stretchSpeedScale, 1);
          const targetStretch = 1 + t * config.stretchFactor;

          // Update the persisted orientation only when the smoothed velocity
          // is meaningful; below the threshold the last known direction is
          // kept so the spring's post-stop overshoot squashes along the
          // right axis instead of randomly drifting.
          const smoothSpeed = Math.hypot(mouse.vx, mouse.vy);
          if (smoothSpeed > 0.5) {
            const inv = 1 / smoothSpeed;
            mouse.lastCos = mouse.vx * inv;
            mouse.lastSin = mouse.vy * inv;
            cosA = mouse.lastCos;
            sinA = mouse.lastSin;
          }

          if (config.springPeriod > 0) {
            // Damped harmonic oscillator on the stretch magnitude:
            //   x'' + 2ζω·x' + ω²·(x − target) = 0
            // ω = 2π / springPeriod (rad/s), ζ = springDamping.
            // ω·dt < 1 with the existing dt cap (50ms) and a springPeriod
            // ≥ ~100ms, so explicit Euler stays stable.
            const dts = dt / 1000;
            const omega = (2 * Math.PI) / (config.springPeriod / 1000);
            const zeta = config.springDamping;
            const accel = -2 * zeta * omega * mouse.stretchVel
                          - omega * omega * (mouse.stretchCurrent - targetStretch);
            mouse.stretchVel += accel * dts;
            mouse.stretchCurrent += mouse.stretchVel * dts;
            // Guard against numerical runaway: clamp to a sane stretch range.
            if (mouse.stretchCurrent < 0.5) mouse.stretchCurrent = 0.5;
            else if (mouse.stretchCurrent > 2.0) mouse.stretchCurrent = 2.0;
          } else {
            mouse.stretchCurrent = targetStretch;
            mouse.stretchVel = 0;
          }

          stretch = mouse.stretchCurrent;
          squash  = 1 / Math.sqrt(stretch);   // area ≈ preserved
        }

        // AABB has to cover both the elongation peak and the spring's
        // perpendicular squash (when stretch < 1 the minor axis grows
        // past r), so include both extents in the reach.
        const reach = r * Math.max(stretch, 1 / Math.sqrt(Math.max(stretch, 0.01)), 1);
        const minCx = Math.max(0, Math.floor((mx - reach) / cs));
        const maxCx = Math.min(cols - 1, Math.floor((mx + reach) / cs));
        const minCy = Math.max(0, Math.floor((my - reach) / cs));
        const maxCy = Math.min(rows - 1, Math.floor((my + reach) / cs));
        if (maxCx >= minCx && maxCy >= minCy) {
          ctx.fillStyle = config.hoverColor;
          ctx.globalAlpha = config.hoverOpacity;
          const rMajor2 = (r * stretch) * (r * stretch);
          const rMinor2 = (r * squash)  * (r * squash);
          for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
              const ccx = cx * cs + cs / 2;
              const ccy = cy * cs + cs / 2;
              const dx = ccx - mx;
              const dy = ccy - my;
              let inside;
              if (shape === 'square') {
                inside = Math.max(Math.abs(dx), Math.abs(dy)) <= r;
              } else if (shape === 'diamond') {
                inside = Math.abs(dx) + Math.abs(dy) <= r;
              } else if (useStretch) {
                // Rotate (dx, dy) into smoothed-velocity-aligned local space,
                // then ellipse inside check.
                const lx = dx * cosA + dy * sinA;
                const ly = -dx * sinA + dy * cosA;
                inside = (lx * lx) / rMajor2 + (ly * ly) / rMinor2 <= 1;
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
        mouse.lastRenderX = e.clientX;
        mouse.lastRenderY = e.clientY;
        mouse.vx = 0;
        mouse.vy = 0;
        mouse.stretchCurrent = 1;
        mouse.stretchVel = 0;
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
