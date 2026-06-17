/* ============================================================
   home.js — interactive behavior for the portfolio homepage.

   Loaded explicitly by preview.html (loader.js only auto-loads
   module/component JS, not templates). GSAP-driven; durations come
   from the --motion-* token scale; reduced-motion is handled HERE
   because GSAP bypasses the CSS --motion-*→1ms collapse (ADR 0028).

   Exposes window.HomeTemplate.init(root):
     - playEntrance: the on-load reveal (status → name → bio → folder)
     - wireTakeover: click a project → "folder takeover" transition
   ============================================================ */
(function () {
  "use strict";

  // Captured at script-eval time so mountBgCanvas can later resolve its grid
  // dependency relative to home.js's own URL — works in preview.html, the
  // Loom sandbox iframe, and any future host without threading paths.
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || null;

  function reduce() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Peak alpha for the cursor wash, per mode. Light mode runs at the full
  // --surface1 lift (delta of ~6/channel against the cream bg — already
  // tasteful); dark mode dials down to 0.4 because the surface1↔background
  // delta is ~13/channel and full strength reads as more presence than the
  // home wants.
  const HOVER_PEAK_LIGHT = 1.0;
  const HOVER_PEAK_DARK  = 0.4;

  function isDarkTheme() {
    const explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "dark") return true;
    if (explicit === "light") return false;
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function currentHoverPeak() {
    return isDarkTheme() ? HOVER_PEAK_DARK : HOVER_PEAK_LIGHT;
  }

  // Read a --motion-* duration token (ms/s) as seconds.
  function sec(name, fallback) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    if (raw.endsWith("ms")) return parseFloat(raw) / 1000;
    if (raw.endsWith("s")) return parseFloat(raw);
    return fallback;
  }

  // Read a length token (rem/px) as px.
  function px(name, fallback) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    const v = parseFloat(raw);
    if (isNaN(v)) return fallback;
    return raw.endsWith("rem") ? v * 16 : v;
  }

  // ---- interactive grid background ------------------------------------
  // Mounts the canvas-rendered grid wash (src/interactive-grid.js) and binds
  // its hover wash to the home's open/close state: on takeover the wash fades
  // and the rAF loop pauses; on close it resumes and fades back in at the
  // current cursor position. Reduced-motion hides the interactive bg
  // entirely — the original ::before paper-wash stays visible as the fallback
  // because .home--bg-canvas (which kills both bg layers) is never added.

  function mountBgCanvas(root) {
    if (reduce()) return;
    if (root.dataset.bgMounted === "true") return;   // idempotent
    root.dataset.bgMounted = "true";
    root.classList.add("home--bg-canvas");

    function ready() {
      if (!window.InteractiveGrid) return;
      const grid = window.InteractiveGrid.mount({
        hoverOpacity: currentHoverPeak(),
        // Compact deforming blob — ellipse stays centered on the cursor and
        // stretches modestly along the smoothed velocity vector. Inertia in
        // the smoothing means rotation lags on curves (not rigid) and the
        // blob eases back to a circle when the cursor stops (not snaps).
        // Tuning this in-branch; commit to taste.
        stretchFactor: 0.2,
        velocityTau: 240,
      });
      wireGridToHomeState(grid, root);
    }
    if (window.InteractiveGrid) { ready(); return; }

    const s = document.createElement("script");
    s.src = SCRIPT_URL
      ? new URL("../../interactive-grid.js", SCRIPT_URL).href
      : "../../interactive-grid.js";
    s.onload = ready;
    document.head.appendChild(s);
  }

  // home.js flips root[data-home-state] between "resting" and "open" as a
  // project opens / closes (see the takeover / close paths below). On open
  // we fade the wash out and pause the rAF; on close we resume + fade back
  // in. restingMetrics() does a synchronous flip-and-restore on the same
  // attribute mid-animation — MutationObserver callbacks are microtasks, so
  // by the time we read the attribute the no-op cycle has settled; the
  // `lastSeen` guard discards it.
  function wireGridToHomeState(grid, root) {
    const gsap = window.gsap;
    const op = { v: currentHoverPeak() };
    let lastSeen = root.getAttribute("data-home-state") || "resting";

    function setOpacity(v) {
      op.v = v;
      grid.update({ hoverOpacity: v });
    }

    function fadeOutThenPause() {
      if (!gsap) { setOpacity(0); grid.pause(); return; }
      gsap.killTweensOf(op);
      gsap.to(op, {
        v: 0, duration: sec("--motion-fast", 0.12), ease: "power1.out",
        onUpdate: () => setOpacity(op.v),
        onComplete: () => grid.pause(),
      });
    }

    function resumeThenFadeIn() {
      grid.resume();
      const peak = currentHoverPeak();
      if (!gsap) { setOpacity(peak); return; }
      gsap.killTweensOf(op);
      gsap.fromTo(op, { v: 0 }, {
        v: peak, duration: sec("--motion-standard", 0.3), ease: "power1.out",
        onUpdate: () => setOpacity(op.v),
      });
    }

    // Theme flips while the wash is visible (resting): retarget the peak so
    // the wash matches the new mode's intent. While open/paused the wash
    // is at 0 and the next fade-in will read the right peak — no-op here.
    // A quick tween (rather than a hard set) keeps mid-cycle flips smooth.
    function onThemeChange() {
      if (lastSeen !== "resting") return;
      const peak = currentHoverPeak();
      if (!gsap) { setOpacity(peak); return; }
      gsap.killTweensOf(op);
      gsap.to(op, {
        v: peak, duration: sec("--motion-fast", 0.12), ease: "power1.out",
        onUpdate: () => setOpacity(op.v),
      });
    }
    const themeObs = new MutationObserver(onThemeChange);
    themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-theme"],
    });
    const colorMql = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)");
    if (colorMql && colorMql.addEventListener) {
      colorMql.addEventListener("change", onThemeChange);
    }

    const obs = new MutationObserver(() => {
      const cur = root.getAttribute("data-home-state");
      if (cur === lastSeen) return;
      lastSeen = cur;
      if (cur === "open") fadeOutThenPause();
      else if (cur === "resting") resumeThenFadeIn();
    });
    obs.observe(root, { attributes: true, attributeFilter: ["data-home-state"] });
  }

  // ---- on-load entrance ------------------------------------------------
  function playEntrance(root) {
    const gsap = window.gsap;
    if (!gsap || reduce()) return;
    const standard = sec("--motion-standard", 0.3);
    const slow = sec("--motion-slow", 0.5);
    gsap.timeline({ defaults: { ease: "power2.out" } })
      .from(root.querySelector(".home__status"), { autoAlpha: 0, y: -6, duration: standard })
      .from(root.querySelector(".home__name"), { autoAlpha: 0, y: 18, duration: standard }, "-=0.10")
      .from(root.querySelectorAll(".home__bio > *"), { autoAlpha: 0, y: 12, duration: standard, stagger: 0.08 }, "-=0.12")
      .from(root.querySelector(".home__folder"), { autoAlpha: 0, y: 24, scale: 0.96, transformOrigin: "50% 100%", duration: slow, ease: "back.out(1.5)" }, "-=0.18");
  }

  // ---- typewriter (no TextPlugin needed) -------------------------------
  function typeIn(el, text, dur) {
    const gsap = window.gsap;
    const o = { n: 0 };
    return gsap.to(o, {
      n: text.length, duration: dur, ease: "none",
      onStart() { el.classList.add("is-typing"); },
      onUpdate() { el.textContent = text.slice(0, Math.round(o.n)); },
      onComplete() { el.classList.remove("is-typing"); el.textContent = text; }
    });
  }

  // Reverse of typeIn: the text deletes back to empty (used on folder close).
  function typeOut(el, text, dur) {
    const gsap = window.gsap;
    const o = { n: text.length };
    return gsap.to(o, {
      n: 0, duration: dur, ease: "none",
      onStart() { el.classList.add("is-typing"); },
      onUpdate() { el.textContent = text.slice(0, Math.round(o.n)); },
      onComplete() { el.classList.remove("is-typing"); el.textContent = ""; }
    });
  }

  // ---- the folder takeover --------------------------------------------
  function wireTakeover(root) {
    const gsap = window.gsap;
    if (!gsap) return;

    const name = root.querySelector(".home__name");
    const bio = root.querySelector(".home__bio");
    const explorer = root.querySelector(".home__explorer");
    const folder = root.querySelector(".home__folder");
    const list = root.querySelector(".home__list");
    const title = root.querySelector(".home__folder-title");
    const logo = root.querySelector(".home__logo");
    const closeBtn = root.querySelector(".home__close");
    const status = root.querySelector(".home__status");
    const items = Array.prototype.slice.call(root.querySelectorAll(".home__item"));
    const tabs = Array.prototype.slice.call(root.querySelectorAll(".home__tab"));
    const panelEls = Array.prototype.slice.call(root.querySelectorAll(".home__panel"));
    const tabText = root.querySelectorAll(".home__tab-num, .home__tab-label");
    const tabsWrap = root.querySelector(".home__tabs");
    const artSvg = root.querySelector(".home__folder-art");
    const riseState = tabs.map(() => ({ v: 0 }));   // per-tab hover-lift (open state), px
    const RISE = px("--space-1", 4) * 1.5;          // ~6px — "a little bit"
    let open = false;
    let opening = false;   // true only while the open timeline is running (so a resize mid-open doesn't fight it)
    // The active tab normally renders OPEN (woven into the body). During a click it
    // renders as a LIFTED folder while it springs down, then snaps open on settle.
    let activeSettled = true;
    let mobileOpen = false;   // true while a project is open in the mobile full-screen view
    let mobileSolo = false;   // true while buildFolder should paint ONLY the active tab

    // Model-switch line: below --bp-md the open folder can't spread its tabs
    // horizontally, so opening a project DRILLS DOWN to a full-screen case study
    // (Option A) instead of the desktop takeover. Read from the root's OWN width
    // (container-aware, so it's correct inside the Loom sandbox iframe too) and tuned
    // by the --bp-md token rather than an eyeballed pixel value.
    function isMobile() { return root.clientWidth < px("--bp-md", 768); }

    // ---- the folder ART (fills + strokes, painted in z-order) -----------------
    // Everything visual is painted here as ordered <path>s so OVERLAPPING tabs
    // occlude correctly (a front tab's fill masks the one behind it) AND every
    // corner stays a real miter join. Paint order back-to-front:
    //   body fill → tabs (back→front: a front tab's fill covers the back one's
    //   stroke) → the woven body-perimeter + active-tab outline on top.
    // The active tab is filled like the others (to occlude) but its OUTLINE comes
    // from the woven path, where its slants are welded into the body perimeter so
    // it opens into the body with no seam. Coords are folder-local pixels from
    // offset* (transform-immune, so the entrance scale doesn't skew them).
    const NS = "http://www.w3.org/2000/svg";
    let art = null;
    function ensureArt() {
      if (art || !artSvg || !tabs.length) return;
      const mk = (cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); artSvg.appendChild(p); return p; };
      const bodyFill = mk("home__art-body");
      // Per tab, a FILL then a STROKE, appended back-to-front (reverse index) so the
      // leftmost/front tab paints last and its fill masks the ones behind it. Fill
      // before stroke within each tab so a front tab's fill covers the back tab's
      // stroke (the occlusion), and the front tab's own stroke still draws on top.
      const fills = [], strokes = [];
      tabs.map((_, i) => i).reverse().forEach((i) => {
        fills[i] = mk("home__art-fill");
        strokes[i] = mk("home__art-stroke");
      });
      const outline = mk("home__art-outline");
      art = { bodyFill, fills, strokes, outline };
    }

    function buildFolder() {
      ensureArt();
      if (!art) return;
      const FW = folder.clientWidth, FH = folder.clientHeight;
      if (!FW || !FH) return;
      const bx = tabsWrap.offsetLeft, by = tabsWrap.offsetTop;
      const g = tabs.map((t) => ({
        L: bx + t.offsetLeft,
        R: bx + t.offsetLeft + t.offsetWidth,
        top: by + t.offsetTop
      }));
      const ai = tabs.findIndex((t) => t.classList.contains("is-active"));
      // The active tab opens INTO the body (woven) only once settled; mid-click it
      // renders as a lifted folder like the others (so the spring is visible).
      const aOpen = ai >= 0 && activeSettled;
      // mobile full-screen renders a SINGLE tab — the active one; the others aren't drawn.
      const solo = mobileSolo;
      // Body-top baseline. Normally the front tab (tabs[0]) sets it. But in mobile SOLO
      // mode only the active tab is painted, and tabs[0] may still be at its SMALLER
      // resting height — so follow the ACTIVE tab instead. Otherwise every project except
      // the first (index 0) clips to tabs[0]'s height and renders a shorter tab.
      const baseTab = (solo && ai >= 0) ? tabs[ai] : tabs[0];
      const TH = by + baseTab.offsetTop + baseTab.offsetHeight;   // body-top baseline
      // slant run = half the tab's height ⇒ a CONSTANT ~26.6° angle even when the
      // compact cascade staggers tabs to different heights.
      const slant = (tp) => (TH - tp) / 2;

      // body interior fill
      art.bodyFill.setAttribute("d", "M0 " + TH + " L" + FW + " " + TH + " L" + FW + " " + FH + " L0 " + FH + " Z");

      // each tab: a FILL (extends EXT px below the baseline so a front tab fully
      // buries the slant tips of the one behind it) and a STROKE (slant/top/slant
      // exactly on the baseline — NO foot; the bottom edge comes from the woven
      // body-top line). The active tab draws no stroke: its outline is welded into
      // the woven perimeter so it opens seamlessly into the body.
      const EXT = 2;
      g.forEach((t, i) => {
        if (solo && i !== ai) { art.fills[i].setAttribute("d", ""); art.strokes[i].setAttribute("d", ""); return; }
        const sl = slant(t.top);                 // angle from the RESTING height — unchanged by rise
        const r = riseState[i].v;                // rise: + = lifted above the folder, − = pressed in
        const topR = t.top - r;                  // flat top (translated by the rise, no distortion)
        let fillD, strokeD;
        if (r >= 0) {
          // LIFT/REST: the tab translates up; straight VERTICAL sides drop back to the
          // body line (TH) so it reads as a folder whose body continues down behind the
          // open folder (the woven front edge, drawn last, crosses in front). At r=0 the
          // verticals are zero-length → plain trapezoid on the line. Fill closes at
          // TH+EXT (occlusion overhang for the compact cascade).
          const sideTop = TH - r;
          fillD = "M" + t.L + " " + (TH + EXT) + " L" + t.L + " " + sideTop +
                  " L" + (t.L + sl) + " " + topR + " L" + (t.R - sl) + " " + topR +
                  " L" + t.R + " " + sideTop + " L" + t.R + " " + (TH + EXT) + " Z";
          strokeD = "M" + t.L + " " + TH + " L" + t.L + " " + sideTop +
                    " L" + (t.L + sl) + " " + topR + " L" + (t.R - sl) + " " + topR +
                    " L" + t.R + " " + sideTop + " L" + t.R + " " + TH;
        } else if (topR >= TH) {
          // Fully sunk to/below the body line — the panel is always ON TOP, so it occludes
          // whatever is behind it: paint nothing. (The mobile-close pop-up parks the cascade
          // tabs here, hidden behind the panel, then rises them; they only begin to draw once
          // topR climbs back above TH, so they emerge from behind the panel edge.)
          fillD = "";
          strokeD = "";
        } else {
          // SINK (click plunge): the tab presses DOWN into the folder. Everything below
          // TH is hidden behind the front folder, so we CLIP at TH — the slants keep
          // their angle but the base narrows inward (ins = |r|/2 because slant = h/2) as
          // the tab sinks into the slot. No vertical sides.
          const ins = -r / 2;
          fillD = "M" + (t.L + ins) + " " + TH + " L" + (t.L + sl) + " " + topR +
                  " L" + (t.R - sl) + " " + topR + " L" + (t.R - ins) + " " + TH + " Z";
          strokeD = "M" + (t.L + ins) + " " + TH + " L" + (t.L + sl) + " " + topR +
                    " L" + (t.R - sl) + " " + topR + " L" + (t.R - ins) + " " + TH;
        }
        art.fills[i].setAttribute("d", fillD);
        art.fills[i].classList.toggle("is-active", i === ai);
        // active tab drops its own stroke only once settled open (woven draws it)
        art.strokes[i].setAttribute("d", (i === ai && aOpen) ? "" : strokeD);
      });

      // woven perimeter: top line straight under inactive tabs, up-and-over the
      // active tab (so it opens into the body), then sides + bottom.
      let d;
      if (ai >= 0 && aOpen) {
        // settled: weave UP over the active tab so it opens into the body.
        const a = g[ai], sl = slant(a.top);
        d = "M0 " + TH +
            " L" + a.L + " " + TH +
            " L" + (a.L + sl) + " " + a.top +
            " L" + (a.R - sl) + " " + a.top +
            " L" + a.R + " " + TH +
            " L" + FW + " " + TH + " L" + FW + " " + FH + " L0 " + FH + " Z";
      } else if (ai >= 0) {
        // mid-click (plunging/springing): leave a flat GAP under the active tab so the
        // newly-selected tab has NO bottom border — it reads as opening into the body
        // even while it bounces. The perimeter is one open subpath from the opening's
        // right edge around to its left edge; the gap matches the tab's base, which
        // narrows by |r|/2 when it's sunk into the slot.
        const a = g[ai], ar = riseState[ai].v;
        const ins = ar < 0 ? -ar / 2 : 0;
        const baseL = a.L + ins, baseR = a.R - ins;
        d = "M" + baseR + " " + TH +
            " L" + FW + " " + TH +
            " L" + FW + " " + FH +
            " L0 " + FH +
            " L0 " + TH +
            " L" + baseL + " " + TH;
      } else {
        d = "M0 " + TH + " L" + FW + " " + TH + " L" + FW + " " + FH + " L0 " + FH + " Z";
      }
      art.outline.setAttribute("d", d);
    }

    function setActive(i) {
      tabs.forEach((t, j) => t.classList.toggle("is-active", j === i));
      // Swap which case-study panel is shown (display via .is-active; the hidden
      // attribute keeps inactive panels out of the a11y tree).
      panelEls.forEach((p, j) => {
        const on = j === i;
        p.classList.toggle("is-active", on);
        p.toggleAttribute("hidden", !on);
        if (on) p.scrollTop = 0;   // always open a case study at the top
      });
      hydrateMedia(i);             // ensure the now-active project's media is in the DOM
      buildFolder();
    }

    // Fade the active project panel in (open state only). Reduced motion: no-op —
    // setActive already display-swaps it, so it just appears.
    function revealPanel(i) {
      const p = panelEls[i];
      if (!p || reduce()) return;
      gsap.fromTo(p, { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: sec("--motion-standard", 0.3), ease: "power2.out", overwrite: true });
    }

    // Lazy media hydration. Each panel's heavy media (shots + prototype) lives in an
    // inert <template class="home__panel-media"> — its content never loads or renders
    // until cloned, so an unopened project costs nothing. We clone it in on INTENT:
    // activating the project (open / tab-switch) OR hovering/focusing its tab or list
    // item. That hover/focus call is the "load in the background immediately" hook —
    // once the frames are real <img loading="lazy"> / prototype embeds, the fetch
    // starts the instant the user signals interest, so the click feels instant.
    function hydrateMedia(i) {
      const panel = panelEls[i];
      if (!panel || panel.dataset.hydrated) return;
      const tpl = panel.querySelector("template.home__panel-media");
      if (tpl && tpl.content) panel.appendChild(tpl.content.cloneNode(true));
      panel.dataset.hydrated = "1";
    }

    // Rebuild on any geometry change: initial layout, the takeover tweens, and
    // window resizes. offset*-based, so it's correct at every animation frame.
    if (window.ResizeObserver) {
      new ResizeObserver(buildFolder).observe(folder);
    }
    requestAnimationFrame(buildFolder);

    // Keep the EXPANDED folder responsive: the open layout pins the folder to fixed
    // pixels (geometry() at open time), so without this a window resize would leave
    // it stranded at the old size. Re-fit to the current viewport (instant, no tween)
    // whenever the window changes while open. The compact/resting state is a normal
    // grid item and reflows on its own — this only re-fits the pinned open folder.
    function fitOpenFolder() {
      const g = geometry();
      gsap.set(folder, { left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
      buildFolder();
    }
    let resizeRAF = 0;
    window.addEventListener("resize", () => {
      if (!open || opening || resizeRAF) return;
      resizeRAF = requestAnimationFrame(() => {
        resizeRAF = 0;
        if (!open || opening) return;
        const targetMobile = isMobile();
        const ai = Math.max(0, tabs.findIndex((t) => t.classList.contains("is-active")));
        // Adapt the OPEN layout to the new size. Same mode → re-fit in place (keeps
        // scroll). Crossed --bp-md → switch between the desktop spread and the mobile
        // full-screen rendering, so there's no hard distinction at the breakpoint.
        if (targetMobile === mobileOpen) {
          if (mobileOpen) refitMobile(ai); else fitOpenFolder();
        } else if (targetMobile) {
          applyMobileOpenLayout(ai);
        } else {
          applyDesktopOpenLayout(ai);
        }
      });
    });

    // Snap straight to the desktop OPEN layout (no animation) — used to re-fit across
    // the breakpoint on resize. Clears any mobile state it might be coming from.
    function applyDesktopOpenLayout(activeIndex) {
      unlockScroll();
      mobileOpen = false;
      mobileSolo = false;
      open = true;
      root.removeAttribute("data-home-view");
      root.setAttribute("data-home-state", "open");
      setActive(activeIndex);
      const g = geometry();
      gsap.set(explorer, { position: "static" });
      gsap.set(folder, { position: "absolute", margin: 0, zIndex: 3, x: 0, y: 0, scale: 1,
        left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
      const gap = px("--space-2", 8);
      const tabH = px("--space-6", 32) + px("--space-2", 8);
      const SL = tabH / 2;
      const innerPad = px("--space-2", 8);
      const labelW = (t) => { const l = t.querySelector(".home__tab-label"); return l ? l.scrollWidth : 40; };
      const tabW = tabs.map((t) => labelW(t) + 2 * innerPad + 2 * SL);
      let cx = 0; const tabLeftArr = [];
      tabW.forEach((w, i) => { tabLeftArr[i] = cx; cx += w + gap; });
      gsap.set([name, bio], { autoAlpha: 0 });
      gsap.set([list, title], { autoAlpha: 0 });
      tabs.forEach((t, i) => gsap.set(t, { left: tabLeftArr[i], top: 0, width: tabW[i], height: tabH }));
      if (art) tabs.forEach((_, i) => gsap.set([art.fills[i], art.strokes[i]], { clearProps: "opacity" }));
      gsap.set(tabsWrap, { height: tabH });
      gsap.set(tabText, { opacity: 1 });
      if (panelEls[activeIndex]) gsap.set(panelEls[activeIndex], { autoAlpha: 1 });
      logo.textContent = "Blake Henson";
      gsap.set(logo, { autoAlpha: 1 });   // clear any leftover mobile-initials fade on resize-up
      buildFolder();
    }

    // Snap straight to the mobile full-screen OPEN layout (no animation).
    function applyMobileOpenLayout(activeIndex) {
      lockScroll();
      mobileOpen = true;
      mobileSolo = true;
      open = true;
      root.setAttribute("data-home-state", "open");
      root.setAttribute("data-home-view", "mobile");
      setActive(activeIndex);
      const g = mobileGeometry();
      const st = soloTabBox(activeIndex, initialsRowShift());
      const activeTab = tabs[activeIndex];
      const activeLabel = activeTab.querySelector(".home__tab-label");
      gsap.set(explorer, { position: "static" });
      gsap.set(folder, { position: "fixed", margin: 0, zIndex: 3, x: 0, y: 0, scale: 1,
        left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
      gsap.set([name, bio, status], { autoAlpha: 0 });
      gsap.set([list, title], { autoAlpha: 0 });
      // reset the OTHER tabs to their resting cascade + hide every label (when coming
      // from the desktop spread they'd otherwise stay spread + labelled behind the solo)
      tabs.forEach((t, i) => { if (i !== activeIndex) gsap.set(t, { clearProps: "left,top,width,height" }); });
      gsap.set(tabText, { opacity: 0 });
      gsap.set(activeTab, { left: st.left, top: st.top, width: st.width, height: st.height });
      gsap.set(tabsWrap, { height: st.tabH });
      if (art) tabs.forEach((_, i) => gsap.set([art.fills[i], art.strokes[i]], { clearProps: "opacity" }));
      if (activeLabel) gsap.set(activeLabel, { opacity: 1 });
      if (panelEls[activeIndex]) gsap.set(panelEls[activeIndex], { autoAlpha: 1 });
      if (closeBtn) gsap.set(closeBtn, { autoAlpha: 1 });
      logo.textContent = "BH";
      gsap.set(logo, { autoAlpha: 1 });   // initials shown instantly (no fade in the snap path)
      buildFolder();
    }

    // Re-fit the pinned mobile folder to the current viewport (no setActive → keeps scroll).
    function refitMobile(activeIndex) {
      const g = mobileGeometry();
      const st = soloTabBox(activeIndex, initialsRowShift());
      gsap.set(folder, { left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
      gsap.set(tabs[activeIndex], { left: st.left, top: st.top, width: st.width, height: st.height });
      gsap.set(tabsWrap, { height: st.tabH });
      buildFolder();
    }

    // Folder's current position within the root + the full-canvas target.
    function geometry() {
      const rb = root.getBoundingClientRect();
      const fb = folder.getBoundingClientRect();
      const cs = getComputedStyle(root);
      const pL = parseFloat(cs.paddingLeft), pR = parseFloat(cs.paddingRight);
      const pT = parseFloat(cs.paddingTop), pB = parseFloat(cs.paddingBottom);
      // Reserve a top strip for the "nav" (the availability badge + the typed-in
      // "Blake Henson" logo) so the expanded folder sits clearly BELOW it with
      // breathing room, instead of butting right up against it. The strip holds
      // the nav content (~24px) plus its bottom padding.
      const navH = px("--space-8", 64);
      // Clamp the open folder's height to the VIEWPORT (not the root, which can be taller
      // than the screen when the identity is tall on a short viewport) so the expanded
      // folder always fits on screen instead of overflowing below the fold.
      const availH = Math.min(root.clientHeight, window.innerHeight);
      return {
        startLeft: fb.left - rb.left, startTop: fb.top - rb.top,
        startW: fb.width, startH: fb.height,
        targetLeft: pL, targetTop: pT + navH,
        targetW: root.clientWidth - pL - pR,
        targetH: availH - pT - pB - navH
      };
    }

    function openFolder(activeIndex) {
      if (open || opening) return;
      if (isMobile()) { openFolderMobile(activeIndex); return; }   // Option A drill-down
      open = true;
      // Capture the folder's TRUE resting box (root-relative) BEFORE flipping to the open
      // state. The open-state CSS sends the resting nav to position:absolute, which collapses
      // the folder's height — measuring/pinning after that starts the takeover from a squashed
      // box (the folder visibly flattens on click). Grow from the pre-collapse box instead.
      const rbPre = root.getBoundingClientRect();
      const fbPre = folder.getBoundingClientRect();
      const startRect = {
        left: fbPre.left - rbPre.left, top: fbPre.top - rbPre.top,
        width: fbPre.width, height: fbPre.height
      };
      root.setAttribute("data-home-state", "open");
      setActive(activeIndex);
      const g = geometry();   // for the TARGETS only; its start values are now the collapsed box

      // Neutralize the explorer's positioning so the pinned folder anchors to the
      // ROOT (position:relative), not the explorer column — otherwise left/top
      // resolve against the wrong box and the folder overshoots. z-index on the
      // explorer still holds (it's a grid item).
      gsap.set(explorer, { position: "static" });

      // Pin the folder out of the grid so it can be animated freely, at its true resting box
      // (captured pre-collapse) so it grows continuously from where it sat — no squash.
      gsap.set(folder, {
        position: "absolute", margin: 0, zIndex: 3,
        x: 0, y: 0, scale: 1,
        left: startRect.left, top: startRect.top, width: startRect.width, height: startRect.height
      });
      // Repaint the SVG art NOW at the pinned (full resting) height. setActive() above ran
      // buildFolder while the folder was still collapsed in-flow, so without this synchronous
      // repaint the first painted frame can flash the squashed art before the timeline ticks.
      buildFolder();

      // Open targets: each tab is only as WIDE AS ITS LABEL (+ the two slants +
      // a little breathing room), then they sit left-to-right from the folder's
      // left edge. tabW = label + 2·innerPad + 2·slant; the rail's padding (=slant
      // + innerPad) keeps the label centred in the flat top, clear of the caps.
      const gap = px("--space-2", 8);
      const tabH = px("--space-6", 32) + px("--space-2", 8);  // open tabs a touch bigger (~40)
      const SL = tabH / 2;                                    // slant scales with height (matches buildFolder)
      const innerPad = px("--space-2", 8);
      const labelW = (t) => { const l = t.querySelector(".home__tab-label"); return l ? l.scrollWidth : 40; };
      const tabW = tabs.map((t) => labelW(t) + 2 * innerPad + 2 * SL);
      const tabLeftArr = [];
      let cx = 0;
      tabW.forEach((w, i) => { tabLeftArr[i] = cx; cx += w + gap; });
      const tabLeft = (i) => tabLeftArr[i];

      // Reduced motion: jump straight to the open layout, no animation. Note the
      // status badge is NOT hidden — it stays as part of the nav.
      if (reduce()) {
        gsap.set(folder, { left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
        gsap.set([name, bio], { autoAlpha: 0 });
        gsap.set([list, title], { autoAlpha: 0 });   // autoAlpha (not display:none) so the close measures the nav's resting space consistently
        tabs.forEach((t, i) => gsap.set(t, { left: tabLeft(i), top: 0, width: tabW[i], height: tabH }));
        // grow the tab strip to the open tab height so the folder body begins at the
        // woven folder-top line (otherwise the body — and its scroll-clip — sits ~8px
        // too high and content rides up over the tabs)
        gsap.set(tabsWrap, { height: tabH });
        gsap.set(tabText, { opacity: 1 });
        logo.textContent = "Blake Henson";
        buildFolder();
        return;
      }

      const fade = sec("--motion-slow", 0.5);
      const beat = sec("--motion-slower", 0.8);
      const standard = sec("--motion-standard", 0.3);

      // Hold the active panel hidden until the folder has grown to full size, then
      // fade it in (scheduled below) so the content doesn't flash at small size.
      if (panelEls[activeIndex]) gsap.set(panelEls[activeIndex], { autoAlpha: 0 });

      // onUpdate redraws the single outline every frame as the folder + tabs move.
      // opening guards the resize re-fit so it doesn't fight the timeline mid-open.
      opening = true;
      const tl = gsap.timeline({ onUpdate: buildFolder, onComplete: () => { opening = false; } });
      // (1·edit) only the name + bio leave to the left; the status stays (nav).
      // Snappy, front-loaded exit (power2.out drops opacity fast) on ~half the width
      // beat so the identity is gone by the time the folder has filled the width —
      // it shouldn't still be sitting there while the folder is already full-width.
      tl.to([name, bio], { autoAlpha: 0, x: -60, duration: beat * 0.45, ease: "power2.out" }, 0)
        .to([list, title], { autoAlpha: 0, duration: standard * 0.5, ease: "power2.out" }, 0)
        // (2) BEAT 1 — folder stretches to full width
        .to(folder, { left: g.targetLeft, width: g.targetW, duration: beat, ease: "expo.out" }, 0);
      // (2·edit) tabs spread from the cascade to label-width, in sync with the width beat
      tabs.forEach((t, i) => {
        tl.to(t, { left: tabLeft(i), top: 0, width: tabW[i], height: tabH, duration: beat, ease: "expo.out" }, 0);
      });
      // grow the tab strip in sync so the folder body starts at the woven folder-top
      // line — keeps panel content (and its scroll-clip) from riding up over the tabs
      tl.to(tabsWrap, { height: tabH, duration: beat, ease: "expo.out" }, 0);
      // (2) tab labels fade in as the tabs widen
      tl.to(tabText, { opacity: 1, duration: standard, ease: "power1.out" }, beat * 0.35)
        // (3) BEAT 2 — folder grows to fill the height, just after the width settles
        .to(folder, { top: g.targetTop, height: g.targetH, duration: beat, ease: "power3.inOut" }, beat * 0.8)
        // (4) the active project's case study fades in once the folder is full-size
        .add(() => revealPanel(activeIndex), beat * 1.1)
        // (5) "Blake Henson" types in at the top
        .add(typeIn(logo, "Blake Henson", fade), beat * 1.2);
    }

    // ---- the folder CLOSE (reverse of the takeover) ---------------------
    // Measure the resting folder box + tab cascade by briefly neutralizing the open
    // pin (so the grid re-flows), reading the layout, then restoring the open inline
    // styles. Synchronous — one reflow, no paint between, so nothing flashes. This is
    // how close knows where to animate BACK to at the CURRENT viewport (the open-time
    // geometry() snapshot can be stale after a resize).
    function restingMetrics() {
      const fCss = folder.style.cssText;
      const eCss = explorer.style.cssText;
      const wCss = tabsWrap.style.cssText;
      const tCss = tabs.map((t) => t.style.cssText);
      // Measure against the RESTING layout, not the open one: the open state takes the
      // resting nav OUT of flow (position:absolute) + min-height:0 on the body, so the
      // folder-body would measure ~0-tall here and the collapse would land short, then
      // jump taller at settle. Flip to resting for the read so the nav is back in flow.
      const stateAttr = root.getAttribute("data-home-state");
      root.setAttribute("data-home-state", "resting");
      ["position", "left", "top", "width", "height", "margin", "transform", "zIndex"]
        .forEach((p) => { folder.style[p] = ""; });
      explorer.style.position = "";
      tabsWrap.style.height = "";
      tabs.forEach((t) => { t.style.left = t.style.top = t.style.width = t.style.height = ""; });
      const rb = root.getBoundingClientRect();
      const fb = folder.getBoundingClientRect();
      const folderBox = { left: fb.left - rb.left, top: fb.top - rb.top, width: fb.width, height: fb.height };
      const tabBoxes = tabs.map((t) => ({ left: t.offsetLeft, top: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight }));
      const wrapH = tabsWrap.offsetHeight;
      folder.style.cssText = fCss;
      explorer.style.cssText = eCss;
      tabsWrap.style.cssText = wCss;
      tabs.forEach((t, i) => { t.style.cssText = tCss[i]; });
      if (stateAttr !== null) root.setAttribute("data-home-state", stateAttr);
      return { folderBox, tabBoxes, wrapH };
    }

    // Strip every open-state inline style so the resting CSS fully owns the layout
    // again, flip the state attribute, and reconcile the selection back to the first
    // project (setActive(0) also repaints the art at resting geometry). The end state
    // of both the animated and reduced-motion close.
    function settleResting(activePanel) {
      gsap.set(folder, { clearProps: "all" });
      gsap.set(explorer, { clearProps: "position" });
      gsap.set(tabsWrap, { clearProps: "height" });
      tabs.forEach((t) => gsap.set(t, { clearProps: "left,top,width,height" }));
      gsap.set([name, bio], { clearProps: "opacity,visibility,transform" });
      gsap.set([list, title], { clearProps: "opacity,visibility,display" });
      gsap.set(tabText, { clearProps: "opacity" });
      gsap.set(status, { clearProps: "opacity,visibility" });
      if (activePanel) gsap.set(activePanel, { clearProps: "opacity,visibility,transform" });
      root.setAttribute("data-home-state", "resting");
      logo.textContent = "";
      open = false;
      opening = false;
      setActive(0);
    }

    function closeFolder() {
      if (opening || !open) return;
      open = false;       // close the resize listener's window immediately…
      opening = true;     // …and mark the box owned by the close timeline
      // cancel any in-flight hover-lift / plunge so the collapse geometry is clean
      tabs.forEach((_, i) => { gsap.killTweensOf(riseState[i]); riseState[i].v = 0; });
      activeSettled = true;

      // The panel that's visible right now fades out; capture it BEFORE re-selecting.
      const activePanel = panelEls.find((p) => p.classList.contains("is-active")) || null;
      // Return the woven/front tab to the FIRST project for the collapse so the pile
      // re-stacks left-top → right-bottom (leftmost on top), instead of leaving the
      // last-opened tab woven in front. The outgoing panel keeps its is-active class so
      // it can still fade; settleResting()'s setActive(0) reconciles the panels after.
      tabs.forEach((t, j) => t.classList.toggle("is-active", j === 0));
      const m = restingMetrics();

      // Reduced motion: jump straight back to resting, no animation.
      if (reduce()) { settleResting(activePanel); return; }

      const fade = sec("--motion-slow", 0.5);
      const beat = sec("--motion-slower", 0.8);
      const standard = sec("--motion-standard", 0.3);
      const tCollapseH = standard * 0.5;
      const tCollapseW = standard * 0.5 + beat * 0.45;
      const tIdentity = tCollapseW + beat * 0.55;

      const tl = gsap.timeline({ onUpdate: buildFolder, onComplete: () => settleResting(activePanel) });

      // (1) the case study leaves, the logo un-types, the tab labels drop
      if (activePanel) tl.to(activePanel, { autoAlpha: 0, y: 12, duration: standard, ease: "power2.in" }, 0);
      tl.add(typeOut(logo, "Blake Henson", standard), 0);
      tl.to(tabText, { opacity: 0, duration: standard, ease: "power1.in" }, 0);

      // (2) BEAT 1 — the folder collapses its height back toward the resting box
      tl.to(folder, { top: m.folderBox.top, height: m.folderBox.height, duration: beat, ease: "power3.inOut" }, tCollapseH);

      // (3) BEAT 2 — width shrinks and the tabs gather back into the manila cascade
      tl.to(folder, { left: m.folderBox.left, width: m.folderBox.width, duration: beat, ease: "expo.inOut" }, tCollapseW);
      tabs.forEach((t, i) => {
        tl.to(t, { left: m.tabBoxes[i].left, top: m.tabBoxes[i].top, width: m.tabBoxes[i].width, height: m.tabBoxes[i].height, duration: beat, ease: "expo.inOut" }, tCollapseW);
      });
      tl.to(tabsWrap, { height: m.wrapH, duration: beat, ease: "expo.inOut" }, tCollapseW);

      // (4) the identity returns from the left as the folder settles
      tl.to([name, bio], { autoAlpha: 1, x: 0, duration: fade, ease: "power2.out" }, tIdentity)
        .to([list, title], { autoAlpha: 1, duration: standard, ease: "power1.out" }, tIdentity + standard * 0.4);

      // (5) crossfade the availability badge across the open→resting flip so its
      //     corner→eyebrow reposition (narrow widths) reads as a fade, not a snap
      tl.to(status, { autoAlpha: 0, duration: standard * 0.4, ease: "power1.in" }, tIdentity)
        .add(() => root.setAttribute("data-home-state", "resting"), ">")
        .to(status, { autoAlpha: 1, duration: standard * 0.4, ease: "power1.out" }, ">");
    }

    // ---- MOBILE: folder grows FULL-SCREEN (one tab + Back) ---------------
    // Below --bp-md a project opens by growing the FOLDER to fill the viewport (minus a
    // top nav strip), showing only the ACTIVE project's tab + a Back logo, then collapses
    // back to the compact cascade on Back. The folder is pinned position:FIXED because
    // the stacked mobile page is taller than the screen — we grow to the VIEWPORT, not
    // the page — and page scroll is locked while open. buildFolder() paints only the
    // active tab in this mode (its "solo" branch), so the full-screen folder reads as a
    // file with one labelled tab.
    function lockScroll() { document.documentElement.style.overflow = "hidden"; }
    function unlockScroll() { document.documentElement.style.overflow = ""; }

    // Folder's current box + the full-viewport target, in VIEWPORT coords (position:fixed).
    // On XS/S (mobile mode) the open folder is EDGE-TO-EDGE — no side/bottom padding — and a
    // small top strip. The name now rides the tab row (inside the folder), so the strip is
    // just the folder's top margin, not a separate nav band — keep it tight (no dead space).
    // NOTE: kept in sync with the close + logo `top` calc in home.css (navH + half tab height).
    function mobileGeometry() {
      const fb = folder.getBoundingClientRect();
      const navH = px("--space-5", 24);   // top margin above the open folder
      // An XS margin around the open folder (left/right/bottom) — not flush to the edge
      // (which clipped the centered 2px border), just a small breathing gap.
      const edge = px("--space-4", 16);
      return {
        startLeft: fb.left, startTop: fb.top, startW: fb.width, startH: fb.height,
        targetLeft: edge, targetTop: navH,
        targetW: window.innerWidth - edge * 2,
        targetH: window.innerHeight - navH - edge
      };
    }

    // The active tab as the SINGLE top-left tab (sized to its label + slants).
    // Mobile solo runs a touch bigger than the desktop open tab (more height +
    // breathing room around the label) — the font is unchanged; just a larger shape.
    // leftOffset slides the tab right so the "BH" initials clear it on the open row.
    function soloTabBox(activeIndex, leftOffset) {
      const innerPad = px("--space-3", 12);
      const tabH = px("--space-6", 32) + px("--space-4", 16);   // ~48 (was ~40)
      const SL = tabH / 2;
      const labelEl = tabs[activeIndex].querySelector(".home__tab-label");
      const labelW = labelEl ? labelEl.scrollWidth : 60;
      return { left: leftOffset || 0, top: 0, width: labelW + 2 * innerPad + 2 * SL, height: tabH, tabH };
    }

    // How far the solo tab slides right on the mobile open row to clear the "BH" initials
    // (which sit at the folder's left edge): the rendered width of "BH" + a gap. Measured so
    // it tracks the font; restores the prior logo text so the typewriter still starts clean.
    function initialsRowShift() {
      const prev = logo.textContent;
      logo.textContent = "BH";
      const w = logo.offsetWidth;
      logo.textContent = prev;
      return w + px("--space-4", 16);
    }

    function openFolderMobile(activeIndex) {
      open = true;
      mobileOpen = true;
      mobileSolo = true;
      // Capture the folder's TRUE resting box BEFORE flipping to the open state. The open-state
      // CSS sends the resting nav to position:absolute, which collapses the folder's height and
      // drops its top — measuring after that pins the collapsed box and the takeover JUMPS from
      // it. Growing from this pre-collapse box keeps the start continuous (no jump).
      const startRect = folder.getBoundingClientRect();
      root.setAttribute("data-home-state", "open");
      root.setAttribute("data-home-view", "mobile");
      const st = soloTabBox(activeIndex, initialsRowShift());
      // MOBILE ONLY: open every project from the front of the lineup — but START the tab at
      // its FINAL open x (st.left, the shifted slot) so it grows in PLACE. Earlier it started
      // flush-left (x:0) and slid right to st.left during the open, layering a horizontal tab
      // slide on top of the folder's own horizontal expand → read as jumpy. Start size = the
      // compact cascade tab so it still grows from small → solo. Only the active tab is painted
      // in solo mode, so this shows no reshuffle. Set BEFORE setActive (first frame in place).
      gsap.set(tabs[activeIndex], {
        left: st.left, top: 0,
        width: tabs[0].offsetWidth, height: tabs[0].offsetHeight
      });
      setActive(activeIndex);
      lockScroll();

      const g = mobileGeometry();
      const activeTab = tabs[activeIndex];
      const activeLabel = activeTab.querySelector(".home__tab-label");

      // pin the folder OUT of the grid, FIXED to the viewport, at its true resting box
      // (captured pre-collapse above) so the takeover grows continuously from where it sat
      gsap.set(explorer, { position: "static" });
      gsap.set(folder, {
        position: "fixed", margin: 0, zIndex: 3, x: 0, y: 0, scale: 1,
        left: startRect.left, top: startRect.top, width: startRect.width, height: startRect.height
      });
      // Repaint the SVG art NOW at the pinned (full resting) height. setActive() above ran
      // buildFolder while the folder was still collapsed in-flow, so its art is short; without
      // this synchronous repaint the first painted frame can flash that collapsed art (the
      // folder briefly looks like it has no height) before the timeline's first tick fixes it.
      buildFolder();

      if (reduce()) { applyMobileOpenLayout(activeIndex); return; }

      const fade = sec("--motion-slow", 0.5);
      const beat = sec("--motion-slower", 0.8);
      const standard = sec("--motion-standard", 0.3);

      if (panelEls[activeIndex]) gsap.set(panelEls[activeIndex], { autoAlpha: 0 });
      opening = true;
      const tl = gsap.timeline({ onUpdate: buildFolder, onComplete: () => { opening = false; } });
      // identity leaves to the left (badge just fades, in place); the folder grows
      tl.to([name, bio], { autoAlpha: 0, x: -60, duration: beat * 0.45, ease: "power2.out" }, 0)
        .to(status, { autoAlpha: 0, duration: beat * 0.45, ease: "power2.out" }, 0)
        .to([list, title], { autoAlpha: 0, duration: standard * 0.5, ease: "power2.out" }, 0)
        .to(folder, { left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH, duration: beat, ease: "expo.out" }, 0);
      // the active project's tab grows to the single top-left tab; its label fades in
      tl.to(activeTab, { left: st.left, top: st.top, width: st.width, height: st.height, duration: beat, ease: "expo.out" }, 0)
        .to(tabsWrap, { height: st.tabH, duration: beat, ease: "expo.out" }, 0);
      if (activeLabel) tl.to(activeLabel, { opacity: 1, duration: standard, ease: "power1.out" }, beat * 0.35);
      // the case study fades in; the initials + close fade in together on the tab row.
      // MOBILE: the initials do NOT type — they fade in like the close ("BH" is too short to
      // read as a typewriter). The typewriter stays on larger breakpoints (openFolder).
      logo.textContent = "BH";
      tl.add(() => revealPanel(activeIndex), beat * 0.6)
        .fromTo(logo, { autoAlpha: 0 }, { autoAlpha: 1, duration: standard, ease: "power1.out" }, beat * 0.5);
      if (closeBtn) tl.fromTo(closeBtn, { autoAlpha: 0 }, { autoAlpha: 1, duration: standard, ease: "power1.out" }, beat * 0.5);
    }

    function settleMobile(activePanel) {
      gsap.set(folder, { clearProps: "all" });
      gsap.set(explorer, { clearProps: "position" });
      gsap.set(tabsWrap, { clearProps: "height" });
      tabs.forEach((t) => gsap.set(t, { clearProps: "left,top,width,height" }));
      gsap.set([name, bio], { clearProps: "opacity,visibility,transform" });
      gsap.set(status, { clearProps: "opacity,visibility" });
      gsap.set([list, title], { clearProps: "opacity,visibility,display" });
      gsap.set(tabText, { clearProps: "opacity" });
      if (closeBtn) gsap.set(closeBtn, { clearProps: "opacity,visibility" });
      gsap.set(logo, { clearProps: "opacity,visibility" });   // reset the initials' fade
      if (art) tabs.forEach((_, i) => gsap.set([art.fills[i], art.strokes[i]], { clearProps: "opacity" }));
      if (activePanel) gsap.set(activePanel, { clearProps: "opacity,visibility,transform" });
      unlockScroll();
      mobileSolo = false;
      mobileOpen = false;
      root.removeAttribute("data-home-view");
      root.setAttribute("data-home-state", "resting");
      logo.textContent = "";
      open = false;
      opening = false;
      setActive(0);   // resting cascade always lands cleanly leftmost-woven
    }

    function closeFolderMobile() {
      if (opening || !open) return;
      open = false;
      opening = true;
      tabs.forEach((_, i) => { gsap.killTweensOf(riseState[i]); riseState[i].v = 0; });
      activeSettled = true;

      const viewed = tabs.findIndex((t) => t.classList.contains("is-active"));
      const activePanel = viewed >= 0 ? panelEls[viewed] : null;
      // the current full-screen single-tab box — idx0 takes this over on the way back so
      // the woven tab is always the LEFTMOST. Only the frontmost tab can be woven without
      // the tabs in front of it covering its opening (a middle-woven tab is what broke the
      // cascade hierarchy), so the resting cascade must always settle leftmost-open.
      const solo = viewed >= 0
        ? { left: tabs[viewed].offsetLeft, top: tabs[viewed].offsetTop, width: tabs[viewed].offsetWidth, height: tabs[viewed].offsetHeight }
        : null;

      // resting target in VIEWPORT coords (fixed folder) + ALL tab cascade boxes. Measure
      // against the RESTING layout (flip the state attr): the open state takes the nav out
      // of flow + min-height:0 on the body, so it'd measure ~0-tall and the collapse would
      // land short then jump taller at settle (the iOS Safari "miscalc then snap" bug).
      const stateAttr = root.getAttribute("data-home-state");
      root.setAttribute("data-home-state", "resting");
      const fCss = folder.style.cssText, eCss = explorer.style.cssText, wCss = tabsWrap.style.cssText;
      const tCss = tabs.map((t) => t.style.cssText);
      ["position", "left", "top", "width", "height", "margin", "transform", "zIndex"].forEach((p) => { folder.style[p] = ""; });
      explorer.style.position = ""; tabsWrap.style.height = "";
      tabs.forEach((t) => { t.style.left = t.style.top = t.style.width = t.style.height = ""; });
      const fb = folder.getBoundingClientRect();
      const folderBox = { left: fb.left, top: fb.top, width: fb.width, height: fb.height };
      const tabBoxes = tabs.map((t) => ({ left: t.offsetLeft, top: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight }));
      const wrapH = tabsWrap.offsetHeight;
      folder.style.cssText = fCss; explorer.style.cssText = eCss; tabsWrap.style.cssText = wCss;
      tabs.forEach((t, i) => { t.style.cssText = tCss[i]; });
      if (stateAttr !== null) root.setAttribute("data-home-state", stateAttr);

      // Hand the woven single tab to idx0, drop the viewed tab to its cascade slot, hide
      // every label, and stop soloing — from here every frame paints a clean leftmost-woven
      // cascade (no middle-woven occlusion artifact at any point).
      tabs.forEach((t, j) => t.classList.toggle("is-active", j === 0));
      mobileSolo = false;
      if (solo) gsap.set(tabs[0], { left: solo.left, top: solo.top, width: solo.width, height: solo.height });
      if (viewed > 0) gsap.set(tabs[viewed], { left: tabBoxes[viewed].left, top: tabBoxes[viewed].top, width: tabBoxes[viewed].width, height: tabBoxes[viewed].height });
      gsap.set(tabText, { opacity: 0 });

      if (reduce()) { settleMobile(activePanel); return; }

      // idx0 is the woven anchor (drawn via the outline, always opaque). The OTHER cascade
      // tabs POP UP from behind the folder body instead of fading in — a fade reads as
      // see-through. They start sunk past the body line (hidden behind the panel while the
      // folder is still tall), then rise to their cascade slots, fully opaque. riseState is
      // the signed vertical offset buildFolder already uses for the hover-lift / click-plunge.
      const popIdx = [];
      tabs.forEach((_, j) => { if (j !== 0) popIdx.push(j); });
      const soloH = solo ? solo.height : tabBoxes[0].height;   // tallest the body line gets mid-collapse
      popIdx.forEach((j) => { riseState[j].v = tabBoxes[j].top - soloH - px("--space-1", 4); });
      buildFolder();   // paint the hidden start frame before the timeline's first tick

      const fade = sec("--motion-slow", 0.5);
      const beat = sec("--motion-slower", 0.8);
      const standard = sec("--motion-standard", 0.3);
      const tl = gsap.timeline({ onUpdate: buildFolder, onComplete: () => settleMobile(activePanel) });
      // case study leaves, Back un-types
      if (activePanel) tl.to(activePanel, { autoAlpha: 0, y: 12, duration: standard, ease: "power2.in" }, 0);
      // MOBILE: the initials fade out fast (no un-typing), leaving with the close control
      tl.to(logo, { autoAlpha: 0, duration: sec("--motion-fast", 0.18), ease: "power2.in" }, 0);
      // the close control leaves fast, right as the collapse begins (no lingering fade)
      if (closeBtn) tl.to(closeBtn, { autoAlpha: 0, duration: sec("--motion-fast", 0.18), ease: "power2.in" }, 0);
      // idx0 (the single tab) collapses to its cascade slot as the folder collapses with it
      tl.to(tabs[0], { left: tabBoxes[0].left, top: tabBoxes[0].top, width: tabBoxes[0].width, height: tabBoxes[0].height, duration: beat, ease: "expo.inOut" }, standard * 0.4);
      tl.to(folder, { left: folderBox.left, top: folderBox.top, width: folderBox.width, height: folderBox.height, duration: beat, ease: "expo.inOut" }, standard * 0.4);
      tl.to(tabsWrap, { height: wrapH, duration: beat, ease: "expo.inOut" }, standard * 0.4);
      // each cascade tab pops UP from behind the panel as the folder nears its compact size
      popIdx.forEach((j) => {
        tl.to(riseState[j], { v: 0, duration: beat * 0.55, ease: "power3.out" }, standard * 0.4 + beat * 0.5);
      });
      // identity returns from the left as the folder settles (badge fades in, in place,
      // in its always-reserved eyebrow slot → no layout shift)
      tl.to([name, bio], { autoAlpha: 1, x: 0, duration: fade, ease: "power2.out" }, standard * 0.4 + beat * 0.55)
        .to(status, { autoAlpha: 1, duration: fade, ease: "power2.out" }, standard * 0.4 + beat * 0.55)
        .to([list, title], { autoAlpha: 1, duration: standard, ease: "power1.out" }, standard * 0.4 + beat * 0.7);
    }

    items.forEach((btn, i) => {
      btn.addEventListener("click", () => openFolder(i));
      // hovering/focusing a project in the resting index is strong intent → prefetch
      // its media so it's already loaded by the time the folder opens
      btn.addEventListener("pointerenter", () => hydrateMedia(i));
      btn.addEventListener("focus", () => hydrateMedia(i));
    });

    // In the OPEN folder, inactive tabs LIFT on hover (a rigid rise — the trapezoid
    // translates up, top + base together, so it never distorts) and SPRING back down
    // on click as they become active. Hover/lift is open-state only.
    const fast = () => sec("--motion-fast", 0.18);
    // Tabs whose click animation is in flight. A committed click OWNS riseState[i] until it
    // settles — hover in/out must NOT fire its own overwrite:true tween, or it would kill the
    // click timeline mid-flight and the plunge's onComplete (→ setActive) would never run. That
    // is the "click really fast and it doesn't navigate" bug: a quick click is enter→click→leave
    // in one motion, and the leave aborted the commit.
    const committing = new Set();
    tabs.forEach((tab, i) => {
      const liftable = () => open && !reduce() && !tab.classList.contains("is-active") && !committing.has(i);
      // prefetch on intent — hovering/focusing another tab while open means a switch
      // is likely; get its media ready before the click lands
      tab.addEventListener("pointerenter", () => hydrateMedia(i));
      tab.addEventListener("focus", () => hydrateMedia(i));
      tab.addEventListener("mouseenter", () => {
        if (!liftable()) return;
        gsap.to(riseState[i], { v: RISE, duration: fast(), ease: "power2.out", overwrite: true, onUpdate: buildFolder });
      });
      tab.addEventListener("mouseleave", () => {
        if (!liftable()) return;
        gsap.to(riseState[i], { v: 0, duration: fast(), ease: "power2.out", overwrite: true, onUpdate: buildFolder });
      });
      tab.addEventListener("click", () => {
        if (!open || tab.classList.contains("is-active")) return;
        // Is a hover-lift in play? Catch it even at v≈0 — an early click can land before
        // the rise tween's first tick, when v is still 0 but the lift IS coming. Read this
        // BEFORE killing, since killTweensOf would erase the in-flight signal.
        const lifting = gsap.isTweening(riseState[i]) || riseState[i].v > 0;
        gsap.killTweensOf(riseState[i]);            // stop the hover tween so it can't re-lift the now-active tab
        // No hover lift (touch / keyboard) or reduced motion → open immediately, no spring.
        if (reduce() || !lifting) {
          activeSettled = true; riseState[i].v = 0; setActive(i); revealPanel(i); return;
        }
        // Hover user — even if they clicked before the lift finished, FIRST complete the
        // rise to its peak, THEN run the click animation: the tab PLUNGES down past rest
        // ("too far"); at that LOWEST point the page commits to the new tab; then it SPRINGS
        // back up to rest + opens. An early click gets the same full motion as a late one.
        const OVER = px("--space-2", 8);            // how far past rest it plunges
        const fastDur = sec("--motion-fast", 0.18);
        const finishRise = fastDur * Math.max(0, RISE - riseState[i].v) / RISE;  // only the rise that's left
        committing.add(i);                          // own riseState[i] — hover in/out can't abort this now
        const tl = gsap.timeline({ onComplete: () => committing.delete(i) });
        if (finishRise > 0.001) {
          tl.to(riseState[i], { v: RISE, duration: finishRise, ease: "power2.out", onUpdate: buildFolder });
        }
        tl.to(riseState[i], {
            v: -OVER, duration: fastDur * 0.75, ease: "power2.in",
            onUpdate: buildFolder,
            onComplete: () => { activeSettled = false; setActive(i); revealPanel(i); }   // ← page updates at the lowest point
          })
          .to(riseState[i], {
            v: 0, duration: sec("--motion-standard", 0.3), ease: "back.out(1.7)",
            onUpdate: buildFolder,
            onComplete: () => { activeSettled = true; buildFolder(); }
          });
      });
    });
    // logo returns home — desktop collapses the folder, mobile reverses the drill-down.
    // On mobile the name AND the dedicated close control both run the reverse animation.
    if (logo) logo.addEventListener("click", (e) => { e.preventDefault(); (mobileOpen ? closeFolderMobile : closeFolder)(); });
    // mobile close control (level with the tab, folder's top-right) — reverses the drill-down.
    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); closeFolderMobile(); });
  }

  window.HomeTemplate = {
    init(root) { mountBgCanvas(root); playEntrance(root); wireTakeover(root); }
  };
})();
