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
     grid.update({ shape: 'star' });      // morph the blob into a rotating star
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

  // N-point star signed-distance (Inigo Quilez, generalized sdStar).
  // r = outer-point radius (pixels).
  // n = number of points (integer ≥ 3; we clamp ≥ 3 at call site).
  // m = spikiness, in [2, n]: 2 collapses to a regular n-gon ("no arms");
  // n is the sharpest possible (longest arms). The host typically computes
  // m as 2 + armLength01 * (n - 2). Star has one point pointing UP in the
  // local frame — the caller rotates (px, py) before passing in.
  function sdStarN(px, py, r, n, m) {
    const an = Math.PI / n;
    const en = Math.PI / m;
    const cosAn = Math.cos(an), sinAn = Math.sin(an);
    const cosEn = Math.cos(en), sinEn = Math.sin(en);
    // Fold the angle into one wedge. IQ uses atan(p.x, p.y) (angle from +Y);
    // in JS that's Math.atan2(px, py).
    const angle = Math.atan2(px, py);
    const wedge = 2 * an;
    let bn = ((angle % wedge) + wedge) % wedge - an;
    const len = Math.hypot(px, py);
    let x = len * Math.cos(bn);
    let y = len * Math.abs(Math.sin(bn));
    x -= r * cosAn; y -= r * sinAn;
    const tMax = r * sinAn / sinEn;
    let t = -(x * cosEn + y * sinEn);
    if (t < 0) t = 0; else if (t > tMax) t = tMax;
    x += cosEn * t; y += sinEn * t;
    return Math.hypot(x, y) * (x < 0 ? -1 : 1);
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
      // Optional Y half-extent. null = mirrors hoverRadius (the wash stays
      // axis-symmetric — circles/squares/diamonds stay square-bounded). Set
      // to a number to make `radiusShape: 'square'` a rectangle of half-
      // width hoverRadius × half-height hoverRadiusY (and `diamond` a
      // rhombus). Doesn't affect 'circle' or the star morph — both use
      // hoverRadius symmetrically by design.
      hoverRadiusY:opts.hoverRadiusY!= null ? opts.hoverRadiusY : null,
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
      // 'blob' = the existing wash (stretch + spring still apply).
      // 'star' = morph into a spinning 5-point star. The morph runs through
      // a damped-spring on morphCurrent (0→1); the star's outer points reach
      // the same r as the blob, so the footprint stays consistent.
      shape:          opts.shape          || 'blob',
      // Number of points on the star (integer ≥ 3). Clamped at call site.
      // Used when no shape cycle is active.
      starPoints:     opts.starPoints     != null ? opts.starPoints     : 5,
      // Arm length 0..1 — 0 = regular polygon (no arms); 1 = sharpest spikes.
      // Internally maps to IQ's m parameter as 2 + armLength * (n - 2).
      // Used when no shape cycle is active.
      starArmLength:  opts.starArmLength  != null ? opts.starArmLength  : 0.55,
      // Optional shape cycle. If set to an array of {points, armLength}
      // pairs with length ≥ 2 AND (starShapeHold + starShapeTransition) > 0,
      // the star morphs through them on a loop: each segment holds the
      // shape for `starShapeHold` ms, then morphs to the next over
      // `starShapeTransition` ms via smoothstep. Length 0/1/null falls
      // back to (starPoints, starArmLength).
      starShapeCycle:    opts.starShapeCycle    || null,
      // ms each shape stays at its target before morphing to the next.
      // 0 = no hold (segment is all transition).
      starShapeHold:     opts.starShapeHold     != null ? opts.starShapeHold     : 0,
      // ms of smoothstep morph from one shape to the next. 0 = snap.
      starShapeTransition:opts.starShapeTransition!=null? opts.starShapeTransition: 0,
      // Star outer radius as a multiple of hoverRadius. 1.0 keeps the star
      // points reaching the same pixel distance as the blob's edge; > 1 lets
      // the star extend past the blob without changing the wash falloff.
      starRadiusScale:opts.starRadiusScale!= null ? opts.starRadiusScale: 1.0,
      // Star spin in rad/s. Only accumulates while morphCurrent > 0 so the
      // rotation winds down with the morph instead of running forever.
      starSpinRate:   opts.starSpinRate   != null ? opts.starSpinRate   : 1.2,
      // Damped-spring on the morph parameter itself (same form as the stretch
      // spring). morphPeriod ms = natural period; morphDamping = ratio.
      morphPeriod:    opts.morphPeriod    != null ? opts.morphPeriod    : 600,
      morphDamping:   opts.morphDamping   != null ? opts.morphDamping   : 0.85,
      // Magnet mode: when magnetX/Y are set and magnetPull > 0, the wash's
      // EFFECTIVE TARGET is pulled toward (magnetX, magnetY) — specifically
      // target = magnet + (cursor - magnet) × (1 - pull). The cursor still
      // drives the wash (so smoothing, velocity, stretch, and spring all
      // play normally), but its offset from the magnet is reduced. Result:
      // the blob lives in a tight zone around the magnet and giggles with
      // every cursor twitch, but can't be yanked away. pull=0 disables;
      // pull=1 fully glues to the magnet center.
      magnetX:        opts.magnetX        != null ? opts.magnetX        : null,
      magnetY:        opts.magnetY        != null ? opts.magnetY        : null,
      magnetPull:     opts.magnetPull     != null ? opts.magnetPull     : 0,
      // Corner radius for the `square` shape (px). 0 = sharp corners
      // (original behavior); > 0 rounds the rect using the standard
      // rounded-rect distance (Minkowski sum of rect + disk). Internally
      // clamped to ≤ min(rX, rY) so it can't invert.
      cornerRadius:   opts.cornerRadius   != null ? opts.cornerRadius   : 0,
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
      // morphCurrent (0..1) is the blob→star blend; morphVel is its spring
      // velocity. starRotation accumulates radians while morphCurrent > 0.
      morphCurrent: 0, morphVel: 0,
      starRotation: 0,
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
      // Keep the loop alive while the shape is morphing OR the star is spun
      // up — a morphed-in star needs to keep spinning, and a half-morphed
      // shape needs to settle to its target (0 or 1).
      const morphTarget = config.shape === 'star' ? 1 : 0;
      if (Math.abs(mouse.morphCurrent - morphTarget) > 0.005 ||
          Math.abs(mouse.morphVel) > 0.05) return true;
      if (mouse.morphCurrent > 0.001) return true;
      // Magnet engaged → the pulled target drifts with cursor input; keep
      // ticking so smoothing + spring play out even after the visible
      // motion settles.
      if (config.magnetX != null && config.magnetY != null && config.magnetPull > 0) return true;
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
      // Exponential follow on the wash center. Target is the cursor by
      // default, or the magnet-pulled cursor when engaged. The pull is
      // applied to the TARGET (not the smoothing), so every downstream
      // signal — smoothing, velocity, stretch, spring — runs as if the
      // cursor itself were moving in a small zone around the magnet.
      // The blob's bouncy attributes carry over unchanged into engulf.
      const dt = lastFrame ? Math.min(50, now - lastFrame) : 16;
      lastFrame = now;
      const alpha = 1 - Math.exp(-dt / Math.max(1, config.smoothTau));
      const magneted = config.magnetX != null && config.magnetY != null && config.magnetPull > 0;
      let targetX, targetY;
      if (magneted) {
        const pull = Math.min(1, Math.max(0, config.magnetPull));
        const k = 1 - pull;
        targetX = config.magnetX + (mouse.x - config.magnetX) * k;
        targetY = config.magnetY + (mouse.y - config.magnetY) * k;
      } else {
        targetX = mouse.x;
        targetY = mouse.y;
      }
      mouse.smoothX += (targetX - mouse.smoothX) * alpha;
      mouse.smoothY += (targetY - mouse.smoothY) * alpha;

      // Smooth the velocity vector itself. Instantaneous proxy is
      // (target − smoothed); smoothing it adds rotation inertia (direction
      // lags on curves) and natural decay (magnitude eases back to 0 after
      // the target stops). Using `target` rather than raw cursor matters
      // when magneted — the wash is chasing the pulled point, so the
      // proxy needs to reflect THAT motion, not the cursor's full sweep
      // (which would feed phantom velocity into stretch).
      const iVx = targetX - mouse.smoothX;
      const iVy = targetY - mouse.smoothY;
      if (config.velocityTau > 0) {
        const vAlpha = 1 - Math.exp(-dt / Math.max(1, config.velocityTau));
        mouse.vx += (iVx - mouse.vx) * vAlpha;
        mouse.vy += (iVy - mouse.vy) * vAlpha;
      } else {
        mouse.vx = iVx;
        mouse.vy = iVy;
      }

      // Damped-spring on the blob→star morph parameter. Same form as the
      // stretch spring; the target is the discrete config.shape ('blob' = 0,
      // 'star' = 1). Clamp to [0, 1] guards numerical runaway.
      {
        const morphTarget = config.shape === 'star' ? 1 : 0;
        if (config.morphPeriod > 0) {
          const dts = dt / 1000;
          const omega = (2 * Math.PI) / (config.morphPeriod / 1000);
          const zeta = config.morphDamping;
          const accel = -2 * zeta * omega * mouse.morphVel
                        - omega * omega * (mouse.morphCurrent - morphTarget);
          mouse.morphVel += accel * dts;
          mouse.morphCurrent += mouse.morphVel * dts;
        } else {
          mouse.morphCurrent = morphTarget;
          mouse.morphVel = 0;
        }
        if (mouse.morphCurrent < 0) mouse.morphCurrent = 0;
        else if (mouse.morphCurrent > 1.2) mouse.morphCurrent = 1.2;
      }

      // Star rotation accumulates only while morphCurrent is non-trivial so
      // the spin winds down with the morph (instead of running forever even
      // after we've returned to blob).
      if (mouse.morphCurrent > 0.001) {
        mouse.starRotation += (dt / 1000) * config.starSpinRate * mouse.morphCurrent;
        // Wrap to keep the float bounded across long-running tabs.
        const TAU = Math.PI * 2;
        if (mouse.starRotation > TAU) mouse.starRotation -= TAU;
        else if (mouse.starRotation < -TAU) mouse.starRotation += TAU;
      } else {
        mouse.starRotation = 0;
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
        // rY only matters for square/diamond (rect / rhombus); circle, star,
        // and the ellipse-stretch path are symmetric and key off r alone.
        const rY = config.hoverRadiusY != null ? config.hoverRadiusY : r;
        const r2 = r * r;
        const shape = config.radiusShape;
        const cs = config.cellSize;

        // Stretch + spring physics. For 'circle' the wash deforms into a
        // rotated ellipse aligned to velocity; for 'square' the same
        // stretchCurrent scalar pulses both half-extents uniformly so the
        // rect breathes with the same bounce (no rotation — a rotating
        // rounded rect would look mechanical against the cell grid). Other
        // shapes opt out. Frame velocity is read from the TARGET (cursor
        // by default, magnet-pulled when engaged) so the spring bounces
        // off the wash's real motion, not the cursor's full sweep.
        const useStretch = config.stretchFactor > 0 && (shape === 'circle' || shape === 'square');
        let stretch = 1, squash = 1;
        let cosA = mouse.lastCos;
        let sinA = mouse.lastSin;
        if (useStretch) {
          const frameDx = targetX - mouse.lastRenderX;
          const frameDy = targetY - mouse.lastRenderY;
          mouse.lastRenderX = targetX;
          mouse.lastRenderY = targetY;
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
        // past r), so include both extents in the reach. When morph is
        // active and the star is scaled > 1, its points extend past r —
        // grow the reach to cover them too, otherwise corner cells get
        // clipped to the original AABB and the star's arms read truncated.
        // For rect/rhombus shapes (square/diamond with rY set) the Y reach
        // grows independently to cover the taller/shorter axis.
        const morphActive = mouse.morphCurrent > 0.001;
        const starExtra = morphActive ? config.starRadiusScale : 1;
        const symExtra = Math.max(stretch, 1 / Math.sqrt(Math.max(stretch, 0.01)), 1, starExtra);
        // Square pulses uniformly with the spring's stretch scalar (no
        // squash on the off-axis since the rect doesn't rotate), so the
        // AABB just multiplies in `stretch`. Diamond inherits the rect's
        // half-extents but doesn't stretch.
        const reachX = shape === 'square'
          ? r * Math.max(stretch, 1, starExtra)
          : shape === 'diamond'
            ? Math.max(r, r * starExtra)
            : r * symExtra;
        const reachY = shape === 'square'
          ? rY * Math.max(stretch, 1, starExtra)
          : shape === 'diamond'
            ? Math.max(rY, rY * starExtra)
            : r * symExtra;
        const minCx = Math.max(0, Math.floor((mx - reachX) / cs));
        const maxCx = Math.min(cols - 1, Math.floor((mx + reachX) / cs));
        const minCy = Math.max(0, Math.floor((my - reachY) / cs));
        const maxCy = Math.min(rows - 1, Math.floor((my + reachY) / cs));
        if (maxCx >= minCx && maxCy >= minCy) {
          ctx.fillStyle = config.hoverColor;
          ctx.globalAlpha = config.hoverOpacity;
          const rMajor2 = (r * stretch) * (r * stretch);
          const rMinor2 = (r * squash)  * (r * squash);
          // Star branch is only active when the morph spring is engaged.
          // morph = 0 → existing blob fast path (no extra ops per cell).
          const morph = mouse.morphCurrent;
          const useStar = morph > 0.001;
          const oneMinusMorph = 1 - morph;
          // Corner radius for the rounded-rect (square shape only). Clamp
          // ≤ min(rX, rY) so it can't invert when the rect shrinks below
          // the requested radius — but the rect ALSO pulses with stretch,
          // so factor that into the clamp using the same stretch scalar.
          const rectStretchedRX = r * (shape === 'square' ? stretch : 1);
          const rectStretchedRY = rY * (shape === 'square' ? stretch : 1);
          const cr = (shape === 'square')
            ? Math.min(config.cornerRadius, Math.min(rectStretchedRX, rectStretchedRY))
            : 0;
          // Generalized star params. n is clamped ≥ 3 (anything less collapses
          // the SDF); m = 2 + arm * (n - 2) maps 0..1 arm length to IQ's
          // [2, n] spikiness range. When a cycle is active we set up TWO
          // (n, m) targets — the current and next shape — and a smoothstep
          // blend factor `cycleBlend` per frame; the per-cell loop then
          // evaluates the star SDF twice and lerps. When no cycle is
          // active, n2/m2 mirror n1/m1 and cycleBlend = 0 → single eval.
          const cycle = config.starShapeCycle;
          const cycleCount = cycle && cycle.length || 0;
          const hold = Math.max(0, config.starShapeHold);
          const transition = Math.max(0, config.starShapeTransition);
          const segLenMs = hold + transition;
          const cycleActive = cycleCount >= 2 && segLenMs > 0;
          let starN1, starM1, starN2, starM2, cycleBlend;
          if (cycleActive) {
            const totalMs = cycleCount * segLenMs;
            const t = ((now % totalMs) + totalMs) % totalMs;     // wrap negatives
            const segIdx = Math.min(cycleCount - 1, Math.floor(t / segLenMs));
            const timeInSeg = t - segIdx * segLenMs;
            // Hold phase = full shape A, no blend. Transition phase = smoothstep.
            let segProg;
            if (timeInSeg < hold || transition <= 0) {
              segProg = 0;
            } else {
              segProg = (timeInSeg - hold) / transition;
              if (segProg > 1) segProg = 1;
            }
            cycleBlend = segProg * segProg * (3 - 2 * segProg);   // smoothstep
            const sA = cycle[segIdx];
            const sB = cycle[(segIdx + 1) % cycleCount];
            starN1 = Math.max(3, Math.round(sA.points));
            starM1 = 2 + Math.max(0, Math.min(1, sA.armLength)) * (starN1 - 2);
            starN2 = Math.max(3, Math.round(sB.points));
            starM2 = 2 + Math.max(0, Math.min(1, sB.armLength)) * (starN2 - 2);
          } else {
            starN1 = starN2 = Math.max(3, Math.round(config.starPoints));
            starM1 = starM2 = 2 + Math.max(0, Math.min(1, config.starArmLength)) * (starN1 - 2);
            cycleBlend = 0;
          }
          const starR = r * config.starRadiusScale;
          // Pre-trig the rotation: the star SDF is computed in a frame where
          // the shape is unrotated, so we rotate the pixel offset by -theta.
          let cosR = 1, sinR = 0;
          if (useStar) {
            cosR = Math.cos(mouse.starRotation);
            sinR = Math.sin(mouse.starRotation);
          }
          for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
              const ccx = cx * cs + cs / 2;
              const ccy = cy * cs + cs / 2;
              const dx = ccx - mx;
              const dy = ccy - my;
              let inside;
              if (useStar) {
                // Lerp normalized blob distance with the (rotated) star SDF.
                // Each metric: 0 = boundary, < 0 inside, > 0 outside.
                let blobDist;
                if (shape === 'square') {
                  blobDist = Math.max(Math.abs(dx) / r, Math.abs(dy) / rY) - 1;
                } else if (shape === 'diamond') {
                  blobDist = Math.abs(dx) / r + Math.abs(dy) / rY - 1;
                } else if (useStretch) {
                  const lx = dx * cosA + dy * sinA;
                  const ly = -dx * sinA + dy * cosA;
                  blobDist = Math.sqrt((lx * lx) / rMajor2 + (ly * ly) / rMinor2) - 1;
                } else {
                  blobDist = Math.sqrt(dx * dx + dy * dy) / r - 1;
                }
                const sx = dx * cosR + dy * sinR;
                const sy = -dx * sinR + dy * cosR;
                const starDistA = sdStarN(sx, sy, starR, starN1, starM1) / starR;
                const starDist = cycleBlend > 0
                  ? starDistA + (sdStarN(sx, sy, starR, starN2, starM2) / starR - starDistA) * cycleBlend
                  : starDistA;
                inside = (blobDist * oneMinusMorph + starDist * morph) <= 0;
              } else if (shape === 'square') {
                // Rounded-rect inside check. Both half-extents scale by the
                // spring's stretchCurrent so the rect breathes with the
                // same bounce as the circle — uniform, no rotation.
                const ax = Math.abs(dx);
                const ay = Math.abs(dy);
                const qx = Math.max(ax - (rectStretchedRX - cr), 0);
                const qy = Math.max(ay - (rectStretchedRY - cr), 0);
                inside = qx * qx + qy * qy <= cr * cr;
              } else if (shape === 'diamond') {
                inside = Math.abs(dx) / r + Math.abs(dy) / rY <= 1;
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
      // Snap the morph spring to its target (0 if shape='blob', 1 if 'star'),
      // bypassing the damped-spring decay. Used when a fresh interaction
      // starts (e.g. folder engulf) and any leftover morph from a previous
      // interaction (e.g. mid-decay name star) would otherwise leak in
      // through the per-cell lerp branch and distort the new shape.
      snapMorph() {
        const t = config.shape === 'star' ? 1 : 0;
        mouse.morphCurrent = t;
        mouse.morphVel = 0;
        if (t < 0.001) mouse.starRotation = 0;
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
