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

  function reduce() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      const TH = by + tabs[0].offsetTop + tabs[0].offsetHeight;   // body-top baseline
      const ai = tabs.findIndex((t) => t.classList.contains("is-active"));
      // The active tab opens INTO the body (woven) only once settled; mid-click it
      // renders as a lifted folder like the others (so the spring is visible).
      const aOpen = ai >= 0 && activeSettled;
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
      if (!open || opening || resizeRAF) return;   // skip mid-open; the timeline owns the box then
      resizeRAF = requestAnimationFrame(() => { resizeRAF = 0; fitOpenFolder(); });
    });

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
      return {
        startLeft: fb.left - rb.left, startTop: fb.top - rb.top,
        startW: fb.width, startH: fb.height,
        targetLeft: pL, targetTop: pT + navH,
        targetW: root.clientWidth - pL - pR,
        targetH: root.clientHeight - pT - pB - navH
      };
    }

    function openFolder(activeIndex) {
      if (open) return;
      open = true;
      root.setAttribute("data-home-state", "open");
      setActive(activeIndex);
      const g = geometry();

      // Neutralize the explorer's positioning so the pinned folder anchors to the
      // ROOT (position:relative), not the explorer column — otherwise left/top
      // resolve against the wrong box and the folder overshoots. z-index on the
      // explorer still holds (it's a grid item).
      gsap.set(explorer, { position: "static" });

      // Pin the folder out of the grid so it can be animated freely. Clear any
      // leftover entrance transform so left/top read true.
      gsap.set(folder, {
        position: "absolute", margin: 0, zIndex: 3,
        x: 0, y: 0, scale: 1,
        left: g.startLeft, top: g.startTop, width: g.startW, height: g.startH
      });

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
        gsap.set([list, title], { display: "none" });
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
      // (1·edit) only the name + bio leave to the left; the status stays (nav)
      tl.to([name, bio], { autoAlpha: 0, x: -60, duration: fade, ease: "power2.in" }, 0)
        .to([list, title], { autoAlpha: 0, duration: standard, ease: "power1.out" }, 0)
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
    tabs.forEach((tab, i) => {
      const liftable = () => open && !reduce() && !tab.classList.contains("is-active");
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
        // not lifted (touch / no hover) or reduced motion → open immediately, no spring
        if (reduce() || riseState[i].v < 0.5) {
          activeSettled = true; riseState[i].v = 0; setActive(i); revealPanel(i); return;
        }
        // From its hover-lift the tab PLUNGES down past rest ("too far"); at that LOWEST
        // point the page commits to the new tab; then it SPRINGS back up to rest + opens.
        const OVER = px("--space-2", 8);            // how far past rest it plunges
        gsap.killTweensOf(riseState[i]);
        gsap.timeline()
          .to(riseState[i], {
            v: -OVER, duration: sec("--motion-fast", 0.18) * 0.75, ease: "power2.in",
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
    // logo returns home — stubbed as a reload so the takeover is easy to replay.
    if (logo) logo.addEventListener("click", (e) => { e.preventDefault(); location.reload(); });
  }

  window.HomeTemplate = {
    init(root) { playEntrance(root); wireTakeover(root); }
  };
})();
