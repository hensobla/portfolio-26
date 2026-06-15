/* ============================================================
   interactive-grid.js — Blueprint interactive grid background
   ------------------------------------------------------------
   A canvas-rendered grid wash whose cells shade under the cursor.
   Drop the script in, call InteractiveGrid.mount() — the canvas
   creates itself, wires mouse + resize listeners, and runs a
   dirty-flag rAF loop that sleeps to 0 CPU when idle.

   Defaults read straight from the Blueprint tokens, so the grid
   matches the rest of the site without configuration:
     - cellSize  ← var(--space-6)        (32px = site grid)
     - bgColor   ← var(--background)
     - lineColor ← var(--border)

   Usage:
     const grid = InteractiveGrid.mount();
     // or:
     const grid = InteractiveGrid.mount({
       hoverColor: '#F2EFE8',
       hoverRadius: 160,
       radiusShape: 'circle',     // 'circle' | 'square' | 'diamond'
       smoothTau: 240,            // ms
     });
     grid.update({ hoverRadius: 200 });   // tweak any field at runtime
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
    const config = {
      cellSize:   opts.cellSize   != null ? opts.cellSize   : readSpaceToken('--space-6', container),
      bgColor:    opts.bgColor    || resolveToken('--background', container, '#F7F4EE'),
      lineColor:  opts.lineColor  || resolveToken('--border', container, 'rgba(0, 0, 0, 0.15)'),
      hoverColor: opts.hoverColor || '#F2EFE8',
      hoverRadius: opts.hoverRadius != null ? opts.hoverRadius : 160,
      radiusShape: opts.radiusShape || 'circle',
      smoothTau:   opts.smoothTau   != null ? opts.smoothTau   : 240,
    };

    // --- State --------------------------------------------------
    // mouse.seen flips true on the first mousemove and stays true so the
    // shading persists when the cursor leaves the viewport (it stops at its
    // last position and eases to the new spot on re-entry).
    const mouse = {
      x: -9999, y: -9999,
      smoothX: -9999, smoothY: -9999,
      seen: false,
    };
    let cols = 0, rows = 0, viewW = 0, viewH = 0;
    let lastFrame = 0;

    // --- Render loop (dirty-flag; rAF only when work to do) -----
    let rafScheduled = false;
    let dirty = false;

    function markDirty() {
      dirty = true;
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(tick);
      }
    }

    function smoothingActive() {
      return Math.abs(mouse.smoothX - mouse.x) > 0.5
          || Math.abs(mouse.smoothY - mouse.y) > 0.5;
    }

    function tick(now) {
      rafScheduled = false;
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
      // Exponential follow on the cursor.
      const dt = lastFrame ? Math.min(50, now - lastFrame) : 16;
      lastFrame = now;
      const alpha = 1 - Math.exp(-dt / Math.max(1, config.smoothTau));
      mouse.smoothX += (mouse.x - mouse.smoothX) * alpha;
      mouse.smoothY += (mouse.y - mouse.smoothY) * alpha;
      dirty = false;

      // 1) Background.
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2) Shaded cells inside the hover region (binary fill — no gradient).
      if (mouse.seen) {
        const mx = mouse.smoothX;
        const my = mouse.smoothY;
        const r = config.hoverRadius;
        const shape = config.radiusShape;
        const cs = config.cellSize;
        const minCx = Math.max(0, Math.floor((mx - r) / cs));
        const maxCx = Math.min(cols - 1, Math.floor((mx + r) / cs));
        const minCy = Math.max(0, Math.floor((my - r) / cs));
        const maxCy = Math.min(rows - 1, Math.floor((my + r) / cs));
        if (maxCx >= minCx && maxCy >= minCy) {
          ctx.fillStyle = config.hoverColor;
          const r2 = r * r;
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
              } else {
                inside = (dx * dx + dy * dy) <= r2;
              }
              if (inside) ctx.fillRect(cx * cs, cy * cs, cs, cs);
            }
          }
        }
      }

      // 3) Grid lines on top (blit the cached pass).
      ctx.drawImage(gridCache, 0, 0, viewW, viewH);
    }

    // --- Listeners ----------------------------------------------
    const onMouseMove = (e) => {
      if (!mouse.seen) {
        mouse.smoothX = e.clientX;
        mouse.smoothY = e.clientY;
        mouse.seen = true;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      markDirty();
    };
    document.addEventListener('mousemove', onMouseMove);

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; resizeGrid(); });
    });
    ro.observe(document.documentElement);

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
      destroy() {
        document.removeEventListener('mousemove', onMouseMove);
        ro.disconnect();
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        canvas.remove();
      },
      // Read-only accessor for debugging / lab wiring.
      get config() { return Object.assign({}, config); },
    };
  }

  window.InteractiveGrid = { mount };
})();
