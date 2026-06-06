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
    const tabText = root.querySelectorAll(".home__tab-num, .home__tab-label");
    let open = false;

    function setActive(i) {
      tabs.forEach((t, j) => t.classList.toggle("is-active", j === i));
    }

    // Folder's current position within the root + the full-canvas target.
    function geometry() {
      const rb = root.getBoundingClientRect();
      const fb = folder.getBoundingClientRect();
      const cs = getComputedStyle(root);
      const pL = parseFloat(cs.paddingLeft), pR = parseFloat(cs.paddingRight);
      const pT = parseFloat(cs.paddingTop), pB = parseFloat(cs.paddingBottom);
      // Reserve a top strip for the nav logo ("Blake Henson") so the folder
      // sits below it instead of colliding with the first tab.
      const navH = px("--space-6", 32);
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

      // Spread targets for the tabs: 4 equal tabs across the full-width folder.
      const gap = px("--space-2", 8);
      const tabH = px("--space-6", 32);
      const tw = (g.targetW - gap * 3) / 4;
      const tabLeft = (i) => i * (tw + gap);

      // Reduced motion: jump straight to the open layout, no animation. Note the
      // status badge is NOT hidden — it stays as part of the nav.
      if (reduce()) {
        gsap.set(folder, { left: g.targetLeft, top: g.targetTop, width: g.targetW, height: g.targetH });
        gsap.set([name, bio], { autoAlpha: 0 });
        gsap.set([list, title], { display: "none" });
        tabs.forEach((t, i) => gsap.set(t, { left: tabLeft(i), top: 0, width: tw, height: tabH }));
        gsap.set(tabText, { opacity: 1 });
        logo.textContent = "Blake Henson";
        return;
      }

      const fade = sec("--motion-slow", 0.5);
      const beat = sec("--motion-slower", 0.8);
      const standard = sec("--motion-standard", 0.3);

      const tl = gsap.timeline();
      // (1·edit) only the name + bio leave to the left; the status stays (nav)
      tl.to([name, bio], { autoAlpha: 0, x: -60, duration: fade, ease: "power2.in" }, 0)
        .to([list, title], { autoAlpha: 0, duration: standard, ease: "power1.out" }, 0)
        // (2) BEAT 1 — folder stretches to full width
        .to(folder, { left: g.targetLeft, width: g.targetW, duration: beat, ease: "expo.out" }, 0);
      // (2·edit) tabs spread from the cascade to even, in sync with the width beat
      tabs.forEach((t, i) => {
        tl.to(t, { left: tabLeft(i), top: 0, width: tw, height: tabH, duration: beat, ease: "expo.out" }, 0);
      });
      // (2) tab labels fade in as the tabs widen
      tl.to(tabText, { opacity: 1, duration: standard, ease: "power1.out" }, beat * 0.35)
        // (3) BEAT 2 — folder grows to fill the height, just after the width settles
        .to(folder, { top: g.targetTop, height: g.targetH, duration: beat, ease: "power3.inOut" }, beat * 0.8)
        // (4) "Blake Henson" types in at the top
        .add(typeIn(logo, "Blake Henson", fade), beat * 1.2);
    }

    items.forEach((btn, i) => btn.addEventListener("click", () => openFolder(i)));
    tabs.forEach((tab, i) => tab.addEventListener("click", () => { if (open) setActive(i); }));
    // logo returns home — stubbed as a reload so the takeover is easy to replay.
    if (logo) logo.addEventListener("click", (e) => { e.preventDefault(); location.reload(); });
  }

  window.HomeTemplate = {
    init(root) { playEntrance(root); wireTakeover(root); }
  };
})();
