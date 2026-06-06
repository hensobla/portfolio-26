/* ============================================================
   tokens.js — visual view of project tokens
   ------------------------------------------------------------
   Reads computed styles from `src/tokens.css` (loaded into the
   page) and renders swatches, type specimens, spacing rulers,
   and a breakpoint table.
   ============================================================ */

// Grid-section module state. Declared ABOVE the IIFE so the synchronous
// renderGrid() call inside the IIFE can read `hoveredGridBp` — function
// declarations are hoisted, but `let` is not, so a declaration after the
// IIFE would put these in the Temporal Dead Zone on the first render.
let hoveredGridBp = null;
const GRID_BREAKPOINTS = [
  { id: "xs",  label: "xs",  bp: "--bp-xs"  },
  { id: "sm",  label: "sm",  bp: "--bp-sm"  },
  { id: "md",  label: "md",  bp: "--bp-md"  },
  { id: "lg",  label: "lg",  bp: "--bp-lg"  },
  { id: "xl",  label: "xl",  bp: "--bp-xl"  },
  { id: "2xl", label: "2xl", bp: "--bp-2xl" }
];

// Bootstrap IIFE lives at the END of this file (see "// ---- Bootstrap" near
// the bottom). It depends on top-level `const` declarations like
// `TokensImport`, which are in the TDZ until their declaration line runs —
// so the IIFE has to be the last thing in the file. Don't move it back to
// the top without also re-ordering everything it touches.

async function setProjectName() {
  const el = document.querySelector("[data-project-name]");
  if (!el) return;
  try {
    const res = await fetch("manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error();
    const manifest = await res.json();
    el.textContent = manifest.project?.name ?? "(unnamed)";
  } catch {
    el.textContent = "(unnamed)";
  }
}

function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderSemantic() {
  const tokens = [
    "--background", "--surface1", "--surface2", "--surface3",
    "--text1", "--text2", "--text3", "--text4",
    "--accent", "--border", "--border-visible",
    "--success", "--warning", "--error"
  ];
  const root = document.getElementById("ds-semantic");
  root.innerHTML = "";

  // Capture both light + dark values when the user's DS declares a dark block.
  // The temp data-theme flip is synchronous; no paint fires between mutations.
  const html = document.documentElement;
  const activeMode = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const dualMode = !!(window.Theme && window.Theme.userDsHasDark);

  let opposite = null;
  if (dualMode) {
    const activeValues = {};
    for (const token of tokens) activeValues[token] = getVar(token);
    if (activeMode === "dark") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", "dark");
    const oppositeValues = {};
    for (const token of tokens) oppositeValues[token] = getVar(token);
    if (activeMode === "dark") html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
    opposite = { activeValues, oppositeValues };
  }

  for (const token of tokens) {
    const value = dualMode ? opposite.activeValues[token] : getVar(token);
    if (!value) continue;
    if (dualMode) {
      root.appendChild(swatch(token, value, {
        oppositeValue: opposite.oppositeValues[token],
        activeMode
      }));
    } else {
      root.appendChild(swatch(token, value));
    }
  }
}

function renderPrimitives() {
  const hues = collectHues();
  const root = document.getElementById("ds-primitives");
  root.innerHTML = "";

  if (hues.size === 0) {
    root.innerHTML = `<div class="ds-note">No primitive color tokens detected. Tokens should follow <code>--color-{hue}-{step}</code>.</div>`;
    return;
  }

  // The neutral ramp reads as a vertical stepper; every chromatic ramp reads as
  // a single tile filled with its main step, carrying a mini ramp strip with a
  // dot on the main step. The hue the semantic --accent anchors to is the
  // "Main" hue — it gets a badge and renders double-height, like Neutrals.
  const accentHex = (valueToHex(getVar("--accent")) || "").toUpperCase();

  const grid = document.createElement("div");
  grid.className = "ds-palette";

  if (hues.has("neutral")) {
    grid.appendChild(neutralStepper("neutral", hues.get("neutral")));
  }
  for (const [hue, steps] of hues) {
    if (hue === "neutral") continue;
    grid.appendChild(hueTile(hue, steps, accentHex));
  }
  root.appendChild(grid);
}

/* Sort ramp steps ascending (50 → 950). */
function sortSteps(steps) {
  return steps.slice().sort((a, b) => +a.step - +b.step);
}

/* The base/main step of a ramp — 500 by convention (the semantic anchor),
   falling back to the median when a ramp lacks a 500. */
function mainStep(steps) {
  const sorted = sortSteps(steps);
  return sorted.find((s) => s.step === "500") || sorted[Math.floor((sorted.length - 1) / 2)];
}

/* "accent" → "Accent", "sea-green" → "Sea Green". */
function hueLabel(hue) {
  return hue.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Pick the tile text/icon color that MAXIMIZES contrast against the fill, so
   every tile clears WCAG AA (4.5:1) for its 14–16px bold labels — not the
   aesthetic "white on saturated color" default, which fails on mid-tone fills
   like amber. White wins exactly when the fill's relative luminance is below
   the 0.179 crossover (where contrast-with-white === contrast-with-black);
   above it, dark text contrasts more. Returns true → use light text. */
function isDarkColor(value) {
  const hex = valueToHex(value);
  if (!hex) return false;
  const h = hex.replace("#", "");
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(parseInt(h.slice(0, 2), 16) / 255);
  const g = lin(parseInt(h.slice(2, 4), 16) / 255);
  const b = lin(parseInt(h.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179;
}

/* The neutral ramp as a vertical stepper card: a header label over stacked,
   click-to-copy bands (light at top → dark at bottom). Each band reveals its
   hex + a copy icon on hover/focus, tone-matched to the band's own color. */
function neutralStepper(hue, steps) {
  const card = document.createElement("div");
  card.className = "ds-palette__neutrals";
  const bands = sortSteps(steps)
    .map((s) => {
      const hex = (valueToHex(s.value) || s.value).toUpperCase();
      const tone = isDarkColor(s.value) ? "ds-palette__band--ondark" : "ds-palette__band--onlight";
      return `<button type="button" class="ds-palette__band ${tone}" data-hex="${escape(hex)}"
        style="background: ${escape(s.value)};"
        title="Copy ${escape(hex)} · ${escape(s.token)}" aria-label="Copy ${escape(s.token)} (${escape(hex)})">
        <span class="ds-palette__band-hex">${escape(hex.replace(/^#/, ""))}</span>
        <span class="ds-palette__band-copy" aria-hidden="true"><i class="ph ph-copy"></i></span>
      </button>`;
    })
    .join("");
  card.innerHTML = `
    <span class="ds-palette__neutrals-head">${escape(hueLabel(hue))}</span>
    <span class="ds-palette__bands">${bands}</span>`;
  card.querySelector(".ds-palette__bands").addEventListener("click", (e) => {
    const band = e.target.closest(".ds-palette__band");
    if (band) copyTileHex(band, band.dataset.hex);
  });
  return card;
}

/* One chromatic ramp as a single filled tile. The tile shows ONE step at a
   time — its fill, hex, and copy target. Clicking a ramp segment selects that
   step (repaint + new copy value); the upper area is a copy button for the
   currently-shown hex. The dot always marks the ramp's primary step regardless
   of selection, and the brand ramp's "Main" badge shows only while the primary
   step is the one on display — so the headline color is never mislabelled. */
function hueTile(hue, steps, accentHex) {
  const sorted = sortSteps(steps);
  const main = mainStep(steps);
  const mainHex = (valueToHex(main.value) || main.value).toUpperCase();
  const isMainRamp = !!accentHex && mainHex === accentHex;

  const tile = document.createElement("div");
  tile.className = "ds-tile" + (isMainRamp ? " ds-tile--feature" : "");

  const segs = sorted
    .map((s) => {
      const hex = (valueToHex(s.value) || s.value).toUpperCase();
      const isMainStep = s.step === main.step;
      return `<button type="button" class="ds-tile__seg" style="background: ${escape(s.value)};"
        data-value="${escape(s.value)}" data-hex="${escape(hex)}" data-step="${escape(s.step)}"
        title="${escape(s.token)} · ${escape(hex)}" aria-label="Show ${escape(s.token)} (${escape(hex)})"
        aria-pressed="false">${isMainStep ? `<span class="ds-tile__dot"></span>` : ""}</button>`;
    })
    .join("");

  tile.innerHTML = `
    <button type="button" class="ds-tile__main">
      <span class="ds-tile__copy" aria-hidden="true"><i class="ph ph-copy"></i></span>
      <span class="ds-tile__name">${escape(hueLabel(hue))}</span>
      <span class="ds-tile__foot">
        <span class="ds-tile__hex"></span>
        <span class="ds-tile__badge" hidden>Main</span>
      </span>
    </button>
    <span class="ds-tile__ramp">${segs}</span>`;

  const mainBtn = tile.querySelector(".ds-tile__main");
  const hexEl = tile.querySelector(".ds-tile__hex");
  const badge = tile.querySelector(".ds-tile__badge");
  const ramp = tile.querySelector(".ds-tile__ramp");

  // Paint the tile to a given step: repaint the fill, flip text tone for
  // contrast, update the hex + copy target, mark the selected segment, and
  // show the "Main" badge only on the brand ramp's primary step.
  function select(seg) {
    const { value, hex, step } = seg.dataset;
    tile.style.background = value;
    const dark = isDarkColor(value);
    tile.classList.toggle("ds-tile--ondark", dark);
    tile.classList.toggle("ds-tile--onlight", !dark);
    hexEl.textContent = hex.replace(/^#/, "");
    mainBtn.dataset.hex = hex;
    mainBtn.title = `Copy ${hex}`;
    mainBtn.setAttribute("aria-label", `Copy ${hex}`);
    badge.hidden = !(isMainRamp && step === main.step);
    ramp.querySelectorAll(".ds-tile__seg").forEach((s) => {
      const on = s === seg;
      s.classList.toggle("is-selected", on);
      s.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  const primarySeg = ramp.querySelector(`.ds-tile__seg[data-step="${main.step}"]`);

  ramp.addEventListener("click", (e) => {
    const seg = e.target.closest(".ds-tile__seg");
    if (seg) select(seg);
  });
  mainBtn.addEventListener("click", () => copyTileHex(mainBtn, mainBtn.dataset.hex));

  // Selecting a non-primary step is a transient preview — snap back to the
  // primary hue when the pointer leaves the tile (or keyboard focus moves out),
  // so the palette's resting state always shows each ramp's main color.
  // Track whether the pointer is over the tile: clicking the copy button blurs
  // the selected segment (focusout with a null relatedTarget in some browsers),
  // and we must NOT revert then — the user is mid-interaction with the mouse.
  // Mouse users revert on mouseleave; keyboard users revert on focus-out only
  // while the pointer is elsewhere.
  let pointerInside = false;
  tile.addEventListener("mouseenter", () => { pointerInside = true; });
  tile.addEventListener("mouseleave", () => { pointerInside = false; select(primarySeg); });
  tile.addEventListener("focusout", (e) => {
    if (!pointerInside && !tile.contains(e.relatedTarget)) select(primarySeg);
  });

  // Open on the primary step.
  select(primarySeg);
  return tile;
}

/* Copy an element's hex and flash a check on its copy icon (tile copy button
   or neutral band — whichever icon is present). */
async function copyTileHex(el, hex) {
  if (el.classList.contains("is-copied")) return;
  if (!(await writeClipboard(hex))) return;
  el.classList.add("is-copied");
  const icon = el.querySelector(".ds-tile__copy i, .ds-palette__band-copy i");
  const prev = icon ? icon.className : null;
  if (icon) icon.className = "ph ph-check";
  setTimeout(() => {
    el.classList.remove("is-copied");
    if (icon && prev) icon.className = prev;
  }, 1200);
}

function collectHues() {
  // Walk every stylesheet to discover the set of token NAMES. Then read each
  // token's cascade-resolved value via getComputedStyle(:root) so the dev
  // override and proposal-file override both shadow the on-disk values
  // correctly. Without this dedupe, a `--color-brand-50` defined in both
  // src/tokens.css AND the injected override would appear twice on the page.
  const sheets = Array.from(document.styleSheets);
  const byToken = new Map(); // token -> { hue, step }
  for (const sheet of sheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const style = rule.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        const match = prop.match(/^--color-([a-z][a-z0-9-]*?)-(\d+)$/);
        if (!match) continue;
        const [, hue, step] = match;
        byToken.set(prop, { hue, step });
      }
    }
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const hues = new Map();
  for (const [token, info] of byToken) {
    const value = rootStyle.getPropertyValue(token).trim();
    if (!value) continue;
    if (!hues.has(info.hue)) hues.set(info.hue, []);
    hues.get(info.hue).push({ token, step: info.step, value });
  }
  return hues;
}

function swatch(token, value, opts) {
  const hex = valueToHex(value) || value;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.hex = hex;
  btn.title = `Copy ${hex}`;
  btn.setAttribute("aria-label", `Copy ${hex}`);

  let oppHex = null;
  if (opts && opts.oppositeValue && opts.activeMode) {
    oppHex = valueToHex(opts.oppositeValue) || opts.oppositeValue;
    const activeLabel   = opts.activeMode === "dark" ? "Dark"  : "Light";
    const oppositeLabel = opts.activeMode === "dark" ? "Light" : "Dark";
    btn.className = "ds-swatch ds-swatch--dual";
    btn.innerHTML = `
      <div class="ds-swatch__chip" style="background: ${escape(value)};">
        <span class="ds-swatch__copy" aria-hidden="true"><i class="ph ph-copy"></i></span>
      </div>
      <div class="ds-swatch__body">
        <span class="ds-swatch__token">${escape(token)}</span>
        <span class="ds-swatch__mode-row ds-swatch__mode-row--active">
          <span class="ds-swatch__mode-tag">${activeLabel}</span>${escape(hex)}
        </span>
        <span class="ds-swatch__mode-row ds-swatch__mode-row--opposite" title="Copy ${escape(oppHex)}">
          <span class="ds-swatch__mode-tag">${oppositeLabel}</span>${escape(oppHex)}
          <span class="ds-swatch__mode-copy" aria-hidden="true"><i class="ph ph-copy"></i></span>
        </span>
      </div>
    `;
  } else {
    btn.className = "ds-swatch";
    btn.innerHTML = `
      <div class="ds-swatch__chip" style="background: ${escape(value)};">
        <span class="ds-swatch__copy" aria-hidden="true"><i class="ph ph-copy"></i></span>
      </div>
      <div class="ds-swatch__body">
        <span class="ds-swatch__token">${escape(token)}</span>
        <span class="ds-swatch__value">${escape(hex)}</span>
      </div>
    `;
  }

  // The card is a single button split into two click zones: clicking the
  // opposite-mode row (the bottom zone, at-and-below the divider) copies the
  // opposite hex; clicking anywhere above (chip, token, active row) copies the
  // active hex. Detected by target — no nested button.
  btn.addEventListener("click", (e) => {
    if (oppHex) {
      const oppRow = e.target.closest(".ds-swatch__mode-row--opposite");
      if (oppRow) {
        copyModeValue(oppRow, oppHex);
        return;
      }
    }
    copySwatchValue(btn, hex);
  });
  return btn;
}

/* Resolve a CSS color value (oklch / rgb / hsl / hex / var()) to an uppercase
   hex string by round-tripping through the browser's parser. Using `color`
   keeps it side-effect-free and avoids triggering a paint.

   The probe element is created once and reused — renderers call this in tight
   loops (one per swatch, easily 60+ on the System page), and the old
   create/append/remove dance forced a layout boundary every call. The probe
   is position:absolute + visibility:hidden + pointer-events:none, so the
   persistent attachment has no visual effect. The probe is stashed on the
   function itself (rather than a top-level `let`) so it survives the TDZ:
   the IIFE that drives initial render calls this transitively before script
   parsing reaches a top-level declaration. */
function valueToHex(value) {
  if (!value) return null;
  let probe = valueToHex._probe;
  if (!probe) {
    probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    valueToHex._probe = probe;
  }
  probe.style.color = value;
  const computed = getComputedStyle(probe).color;
  const m = computed.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
  if (!m) return null;
  const toHex = (n) => Math.round(+n).toString(16).padStart(2, "0");
  const r = toHex(m[1]), g = toHex(m[2]), b = toHex(m[3]);
  const a = m[4] != null ? Math.round(+m[4] * 255).toString(16).padStart(2, "0") : "";
  return ("#" + r + g + b + (a && a !== "ff" ? a : "")).toUpperCase();
}

/* Write text to the clipboard, falling back to execCommand for older
   browsers / insecure contexts. Returns whether the write succeeded. */
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove();
    return ok;
  }
}

/* Copy a swatch's active hex to clipboard and flash a check icon on the chip
   for ~1s of feedback. */
async function copySwatchValue(btn, hex) {
  if (btn.classList.contains("is-copied")) return;
  if (!(await writeClipboard(hex))) return;
  btn.classList.add("is-copied");
  const icon = btn.querySelector(".ds-swatch__copy i");
  const prev = icon?.className;
  if (icon) icon.className = "ph ph-check";
  setTimeout(() => {
    btn.classList.remove("is-copied");
    if (icon && prev) icon.className = prev;
  }, 1200);
}

/* Copy the opposite-mode hex from a dual swatch's bottom zone (the whole
   opposite row, clickable at-and-below the divider). Flashes the row and its
   copy icon. Independent of the card's active-value copy. */
async function copyModeValue(rowEl, hex) {
  if (rowEl.classList.contains("is-copied")) return;
  if (!(await writeClipboard(hex))) return;
  rowEl.classList.add("is-copied");
  const icon = rowEl.querySelector(".ds-swatch__mode-copy i");
  const prev = icon?.className;
  if (icon) icon.className = "ph ph-check";
  setTimeout(() => {
    rowEl.classList.remove("is-copied");
    if (icon && prev) icon.className = prev;
  }, 1200);
}

function renderType() {
  const scale = [
    { token: "--type-display-xl", label: "Display XL", sample: "Display XL" },
    { token: "--type-display-l",  label: "Display L",  sample: "Display L" },
    { token: "--type-display-m",  label: "Display M",  sample: "Display M" },
    { token: "--type-display-s",  label: "Display S",  sample: "Display S" },
    { token: "--type-body-l",     label: "Body L",     sample: "The quick brown fox jumps over the lazy dog." },
    { token: "--type-body",       label: "Body",       sample: "The quick brown fox jumps over the lazy dog." },
    { token: "--type-body-s",     label: "Body S",     sample: "The quick brown fox jumps over the lazy dog." },
    { token: "--type-mono",       label: "Mono",       sample: "const fox = 'quick';" }
  ];

  const root = document.getElementById("ds-type");
  root.innerHTML = "";

  for (const step of scale) {
    const value = getVar(step.token);
    if (!value) continue;
    const row = document.createElement("div");
    row.className = "ds-type-row";
    const family = step.token === "--type-mono"
      ? "var(--font-mono)"
      : step.token.startsWith("--type-display") ? "var(--font-display)" : "var(--font-body)";
    row.innerHTML = `
      <div class="ds-type-meta">
        <span class="ds-type-meta__token">${escape(step.label)}</span>
        <span class="ds-type-meta__value">${escape(step.token)}</span>
        <span class="ds-type-meta__value">${escape(value)}</span>
      </div>
      <div class="ds-type-sample" style="font-family: ${family}; font-size: ${value};">${escape(step.sample)}</div>
    `;
    root.appendChild(row);
  }
}

function renderSpace() {
  const steps = [
    "--space-0", "--space-1", "--space-2", "--space-3", "--space-4",
    "--space-5", "--space-6", "--space-7", "--space-8", "--space-9", "--space-10"
  ];
  const root = document.getElementById("ds-space");
  root.innerHTML = "";

  // Find max for bar scaling
  const values = steps.map((t) => ({ token: t, value: getVar(t) })).filter((s) => s.value);
  const maxPx = Math.max(...values.map((s) => toPx(s.value)));

  for (const step of values) {
    const px = toPx(step.value);
    const width = maxPx > 0 ? Math.max(2, (px / maxPx) * 100) + "%" : "0";
    const row = document.createElement("div");
    row.className = "ds-space-row";
    row.innerHTML = `
      <span class="ds-space-row__token">${escape(step.token)}</span>
      <span class="ds-space-row__value">${escape(step.value)}</span>
      <span class="ds-space-row__bar" style="width: ${width};"></span>
    `;
    root.appendChild(row);
  }
}

function toPx(value) {
  if (!value) return 0;
  const num = parseFloat(value);
  if (value.endsWith("rem")) return num * 16;
  if (value.endsWith("em"))  return num * 16;
  if (value.endsWith("px"))  return num;
  return num;
}

// `hoveredGridBp` + `GRID_BREAKPOINTS` are declared at the top of the file
// so they're initialized before the IIFE's synchronous call into renderGrid().
function renderGrid() {
  // --- Active values (from media-query-resolved custom properties) -------
  const activeCols   = getVar("--grid-cols")   || "—";
  const activeGap    = getVar("--grid-gap")    || "—";
  const activeMargin = getVar("--grid-margin") || "—";
  const activeBp     = activeBreakpointName();

  const metaEl = document.getElementById("grid-active");
  if (metaEl) {
    metaEl.textContent =
      `Active: ${activeBp} · ${activeCols} cols · ${activeGap} gap · ${activeMargin} margin`;
  }

  // --- Visual: re-render under the current hover (falls back to active) -
  applyGridViz(hoveredGridBp);

  // --- Per-breakpoint table ----------------------------------------------
  const tableEl = document.getElementById("ds-grid-table");
  if (!tableEl) return;

  tableEl.innerHTML = "";
  const header = document.createElement("div");
  header.className = "ds-grid-table__row ds-grid-table__row--head";
  header.innerHTML = `
    <span>Breakpoint</span>
    <span>Min width</span>
    <span>Columns</span>
    <span>Gap</span>
    <span>Margin</span>
  `;
  tableEl.appendChild(header);

  for (const b of GRID_BREAKPOINTS) {
    const bpValue = getVar(b.bp) || "—";
    const cols    = getVar(`--grid-cols-${b.id}`)   || "—";
    const gap     = getVar(`--grid-gap-${b.id}`)    || "—";
    const margin  = getVar(`--grid-margin-${b.id}`) || "—";
    const isActive = b.id === activeBp;
    const row = document.createElement("div");
    row.className = "ds-grid-table__row" + (isActive ? " ds-grid-table__row--active" : "");
    row.innerHTML = `
      <span><code>${escape(b.label)}</code></span>
      <span>${escape(bpValue)}</span>
      <span>${escape(cols)}</span>
      <span>${escape(gap)}</span>
      <span>${escape(margin)}</span>
    `;
    row.addEventListener("mouseenter", () => {
      hoveredGridBp = b;
      applyGridViz(b);
    });
    tableEl.appendChild(row);
  }

  // Leaving the table reverts the viz to the live-active breakpoint.
  // Wired once; survives subsequent renderGrid() calls because the listener
  // sits on the parent and we re-use it across rebuilds of the rows.
  if (!tableEl.dataset.hoverWired) {
    tableEl.addEventListener("mouseleave", () => {
      hoveredGridBp = null;
      applyGridViz(null);
    });
    tableEl.dataset.hoverWired = "true";
  }
}

/* Render the grid visualization at `bp`'s tokens, or at the live-active tokens
   if `bp` is null.

   Approach matches the Sandbox's "fixed breakpoint" scaler: the inner is
   laid out at the breakpoint's intrinsic design width with its intrinsic gap
   and margin, then `transform: scale()` shrinks the whole thing
   proportionally (cells included) to fit when the design width exceeds the
   container. So hovering a bigger breakpoint looks like zooming out on a
   real viewport — every dimension shrinks together.

   The outer (.ds-grid-viz) is a fixed-height flex container that vertically
   centers the inner, so the reserved layout height never changes across
   hovers — only the visible gray panel inside resizes. */
function applyGridViz(bp) {
  const viz = document.getElementById("ds-grid-viz");
  if (!viz) return;

  let inner = viz.querySelector(".ds-grid-viz__inner");
  if (!inner) {
    viz.innerHTML = "";
    inner = document.createElement("div");
    inner.className = "ds-grid-viz__inner";
    viz.appendChild(inner);
  }

  const cols   = parseInt(bp ? getVar(`--grid-cols-${bp.id}`) : getVar("--grid-cols"), 10) || 12;
  const gap    = (bp ? getVar(`--grid-gap-${bp.id}`)    : getVar("--grid-gap"))    || "16px";
  const margin = (bp ? getVar(`--grid-margin-${bp.id}`) : getVar("--grid-margin")) || "32px";

  const containerW = viz.clientWidth;
  let designWidth;
  let scale = 1;
  if (bp) {
    const bpPx = parseInt(getVar(bp.bp), 10) || containerW;
    designWidth = bpPx;
    if (bpPx > containerW) scale = containerW / bpPx;
  } else {
    // Active state: render at the container's width, no scale.
    designWidth = containerW;
  }

  inner.style.display             = "grid";
  inner.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  inner.style.gap                 = gap;
  inner.style.paddingInline       = margin;
  inner.style.paddingBlock        = "16px";
  inner.style.background          = "var(--lib-panel)";
  inner.style.borderRadius        = "var(--lib-radius)";
  inner.style.width               = `${designWidth}px`;
  inner.style.transform           = scale < 1 ? `scale(${scale})` : "";
  // Anchor scaling at left-middle so the panel grows/shrinks from its
  // top-left corner horizontally while staying vertically centered in the
  // outer's fixed height.
  inner.style.transformOrigin     = "left center";

  inner.innerHTML = "";
  for (let i = 0; i < cols; i++) {
    const cell = document.createElement("div");
    cell.textContent = String(i + 1);
    cell.style.background     = "var(--lib-accent)";
    cell.style.color          = "white";
    cell.style.fontFamily     = "var(--lib-mono)";
    cell.style.fontSize       = "var(--lib-fs-5)";
    cell.style.padding        = "10px 0";
    cell.style.textAlign      = "center";
    cell.style.borderRadius   = "4px";
    cell.style.opacity        = "0.85";
    inner.appendChild(cell);
  }

  // Outer has a fixed CSS height; no JS adjustment needed.
}

function activeBreakpointName() {
  // Use matchMedia so JS sees the exact same thresholds the CSS @media
  // blocks evaluate. window.innerWidth can disagree with CSS min-width by
  // the scrollbar width on platforms with classic (non-overlay) scrollbars,
  // which makes the "Active" label and table-row highlight desync from the
  // live `--grid-*` values right around a threshold.
  if (matchMedia("(min-width: 1536px)").matches) return "2xl";
  if (matchMedia("(min-width: 1280px)").matches) return "xl";
  if (matchMedia("(min-width: 1024px)").matches) return "lg";
  if (matchMedia("(min-width: 768px)").matches)  return "md";
  if (matchMedia("(min-width: 480px)").matches)  return "sm";
  return "xs";
}

function renderRadii() {
  const root = document.getElementById("ds-radii");
  if (!root) return;
  const rows = [
    { token: "--radius-button", use: "Buttons, inputs, controls" },
    { token: "--radius-card",   use: "Cards, panels, modals"     }
  ];
  root.innerHTML = "";
  for (const r of rows) {
    const value = getVar(r.token);
    if (!value) continue;
    const row = document.createElement("div");
    row.className = "ds-radii-row";
    row.innerHTML = `
      <div class="ds-radii-row__sample" style="border-radius: ${escape(value)};"></div>
      <div class="ds-radii-row__meta">
        <span class="ds-radii-row__token">${escape(r.token)}</span>
        <span class="ds-radii-row__value">${escape(value)}</span>
        <span class="ds-radii-row__use">${escape(r.use)}</span>
      </div>
    `;
    root.appendChild(row);
  }
}

function renderElevation() {
  const root = document.getElementById("ds-elev");
  if (!root) return;
  const rows = [
    { name: "Flat (default)",   modifier: "",                   use: "Default surfaces, cards in the catalog" },
    { name: "Border-visible",   modifier: "--border-visible",   use: "Hover state, intentional separation" },
    { name: "Surface 2",        modifier: "--surface2",         use: "Inset / nested surfaces, table headers" },
    { name: "Shadow",           modifier: "--shadow",           use: "Floating cards (--shadow-card), modals" }
  ];
  root.innerHTML = "";
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "ds-elev-row";
    const mod = r.modifier ? ` ds-elev-row__sample--${r.modifier.replace(/^--/, "")}` : "";
    row.innerHTML = `
      <div class="ds-elev-row__sample${mod}"></div>
      <div class="ds-elev-row__meta">
        <span class="ds-elev-row__name">${escape(r.name)}</span>
        <span class="ds-elev-row__use">${escape(r.use)}</span>
      </div>
    `;
    root.appendChild(row);
  }
}

function renderIconography() {
  const root = document.getElementById("ds-icons");
  if (!root) return;
  // Representative sample — the kit ships thousands. This is the
  // taste-test, not the catalog. See https://phosphoricons.com/.
  const icons = [
    "ph-squares-four", "ph-briefcase", "ph-film-strip", "ph-palette",
    "ph-monitor", "ph-text-aa", "ph-circles-three", "ph-cursor-click",
    "ph-table", "ph-compass", "ph-bell", "ph-stack",
    "ph-arrow-right", "ph-check-circle", "ph-warning", "ph-info",
    "ph-magnifying-glass", "ph-plus", "ph-pencil", "ph-trash",
    "ph-caret-down", "ph-caret-right", "ph-link", "ph-x"
  ];
  root.innerHTML = "";
  for (const name of icons) {
    const cell = document.createElement("div");
    cell.className = "ds-icon-cell";
    cell.title = name;
    cell.innerHTML = `<i class="ph ${escape(name)}" aria-hidden="true"></i>`;
    root.appendChild(cell);
  }
}

function renderBreakpoints() {
  const bps = [
    { token: "--bp-xs",  use: "Smallest supported (mobile)" },
    { token: "--bp-sm",  use: "Large phones" },
    { token: "--bp-md",  use: "Tablets" },
    { token: "--bp-lg",  use: "Small laptops" },
    { token: "--bp-xl",  use: "Standard desktop" },
    { token: "--bp-2xl", use: "Wide desktop" }
  ];
  const root = document.getElementById("ds-bp");
  root.innerHTML = "";
  for (const bp of bps) {
    const value = getVar(bp.token);
    if (!value) continue;
    const row = document.createElement("div");
    row.className = "ds-bp-row";
    row.innerHTML = `
      <span class="ds-bp-row__name">${escape(bp.token)}</span>
      <span class="ds-bp-row__value">${escape(value)}</span>
      <span class="ds-bp-row__use">${escape(bp.use)}</span>
    `;
    root.appendChild(row);
  }
}

function escape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

/* ------------------------------------------------------------------
   Side-nav scroll-spy + mobile toggle wiring
   ------------------------------------------------------------------
   Same shape as library.js but the Tokens page sections are static
   (#color, #typography, #space, #grid, #breakpoints) instead of being
   generated from the manifest. Both copies of wireSideToggle must
   stay in sync.
*/
function wireScrollSpy(sideToggle) {
  const links = [...document.querySelectorAll(".lib-side__link[href^='#']")];
  if (!links.length) return;

  const linkByHash = new Map(links.map((a) => [a.getAttribute("href"), a]));

  /* Suspend window during a programmatic smooth scroll.
     Without this, the IntersectionObserver fires for every section
     the smooth scroll passes through, flickering `.is-active`
     across 5+ links before landing. */
  let spySuspendedUntil = 0;
  const SUSPEND_MS = 900;

  function setActive(link) {
    links.forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");
    if (sideToggle) sideToggle.setLabel(link.textContent.trim());
  }

  // On click, scroll to the section explicitly, set it active, and gate the
  // observer until the scroll settles.
  //
  // We can't rely on the browser's native fragment scroll (the default action
  // of an in-page #anchor). After SPA navigation + async section fills, that
  // native smooth scroll gets canceled mid-flight and lands a few pixels down
  // instead of at the target — so the sidebar appeared to "do nothing".
  // Programmatic scrollIntoView is deterministic and honors each section's
  // scroll-margin-top, so we preventDefault and drive the scroll ourselves,
  // then sync the URL hash without re-triggering the native jump.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  for (const link of links) {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      const target = document.getElementById(hash.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
        try { history.replaceState(null, "", hash); } catch (_) {}
      }
      setActive(link);
      spySuspendedUntil = Date.now() + SUSPEND_MS;
    });
  }

  // Refresh the suspend deadline if the user scrolls again mid-flight
  // (rapid clicks, wheel during scroll). After the window expires and
  // the user is idle, the observer takes over.
  const observer = new IntersectionObserver(
    (entries) => {
      if (Date.now() < spySuspendedUntil) return;
      for (const e of entries) {
        if (e.isIntersecting) {
          const hash = "#" + e.target.id;
          const match = linkByHash.get(hash);
          if (!match) continue;
          setActive(match);
        }
      }
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
  );

  for (const a of links) {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

function wireSideToggle() {
  const side = document.querySelector(".lib-side");
  const toggle = document.getElementById("lib-side-toggle");
  const label = document.getElementById("lib-side-toggle-label");
  const nav = document.getElementById("lib-side-nav");
  if (!side || !toggle || !nav) return null;

  const open  = () => { side.dataset.open = "true";  toggle.setAttribute("aria-expanded", "true");  };
  const close = () => { delete side.dataset.open;    toggle.setAttribute("aria-expanded", "false"); };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (side.dataset.open === "true") close(); else open();
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest(".lib-side__link")) close();
  });

  document.addEventListener("click", (e) => {
    if (side.dataset.open !== "true") return;
    if (!side.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && side.dataset.open === "true") {
      close();
      toggle.focus();
    }
  });

  return {
    setLabel: (text) => { if (label && text) label.textContent = text; }
  };
}

/* ============================================================
   Tokens import — modal wiring, OKLCH ramp generation, live
   overlay, payload + CC prompt emission.
   See system/tokens-import.md for the contract.
   ============================================================ */

const TokensImport = (() => {
  /* ---------- Constants ---------- */

  const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  // Target lightness per step. Tuned for OKLCH so the perceptual
  // distance between stops feels even. The base color's actual L
  // is preserved at the step nearest to it (closest match wins).
  const RAMP_L = {
    50:  0.97,
    100: 0.94,
    200: 0.88,
    300: 0.80,
    400: 0.70,
    500: 0.58,
    600: 0.50,
    700: 0.42,
    800: 0.32,
    900: 0.22,
    950: 0.16
  };

  // Chroma scaling: lighter and darker ends taper to avoid muddy
  // tints and oversaturated shades.
  const RAMP_C_SCALE = {
    50:  0.30,
    100: 0.45,
    200: 0.65,
    300: 0.82,
    400: 0.95,
    500: 1.00,
    600: 1.00,
    700: 0.92,
    800: 0.78,
    900: 0.66,
    950: 0.58
  };

  // Default semantic mappings (point at ramp steps by index).
  // Token vocabulary migrated 2026-05-22 to hue-style names.
  const DEFAULT_SEMANTIC = {
    background: 50,
    surface1:   100,
    border:     200,
    text2:      600,
    text1:      900,
    accent:     500
  };

  const HARMONY_OFFSETS = {
    mono:           [],
    analogous:      [-30, 30],
    complementary:  [180],
    triadic:        [120, 240]
  };

  /* ---------- State ---------- */

  const state = {
    open: false,
    activeTab: "vibe",
    vibe: {
      prompt: "",
      hexes: [],          // user-supplied anchor hexes, e.g. ["#0b6e4f"]
      harmony: "mono",
      font: {
        mode: "google",   // "google" | "generic" | "auto"
        google: "",
        generic: "sans-serif"
      },
      ramps: [],          // computed: [{ name, hex, ramp: [{step, hex, oklch}] }]
      companions: [],     // computed: companion ramps when hexes.length === 1
      semantic: { ...DEFAULT_SEMANTIC }
    },
    paste: { format: "auto", raw: "" },
    url:   { url: "", hint: "" },
    image: { dataUrl: "", filename: "", mimeType: "", hint: "" },
    scope: "merge",
    scopeTarget: "color.accent",
    livePreview: true,
    brandSource: null
  };

  /* ---------- Color math (sRGB <-> OKLCH) ---------- */

  // sRGB hex -> linear RGB -> OKLab -> OKLCH and back.
  // Reference: https://bottosson.github.io/posts/oklab/

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255
    };
  }

  function rgbToHex({ r, g, b }) {
    const cl = (v) => Math.max(0, Math.min(1, v));
    const to2 = (v) => Math.round(cl(v) * 255).toString(16).padStart(2, "0");
    return "#" + to2(r) + to2(g) + to2(b);
  }

  const srgbToLinear = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const linearToSrgb = (v) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  function rgbToOklab({ r, g, b }) {
    const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
    const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
    const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
    const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
    const lc = Math.cbrt(l), mc = Math.cbrt(m), sc = Math.cbrt(s);
    return {
      L: 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc,
      a: 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc,
      b: 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc
    };
  }

  function oklabToRgb({ L, a, b }) {
    const lc = L + 0.3963377774 * a + 0.2158037573 * b;
    const mc = L - 0.1055613458 * a - 0.0638541728 * b;
    const sc = L - 0.0894841775 * a - 1.2914855480 * b;
    const ll = lc * lc * lc, mm = mc * mc * mc, ss = sc * sc * sc;
    return {
      r: linearToSrgb(+4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss),
      g: linearToSrgb(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss),
      b: linearToSrgb(-0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss)
    };
  }

  function oklabToOklch({ L, a, b }) {
    const C = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a) * 180 / Math.PI;
    if (h < 0) h += 360;
    return { L, C, h };
  }

  function oklchToOklab({ L, C, h }) {
    const rad = h * Math.PI / 180;
    return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
  }

  function hexToOklch(hex) { return oklabToOklch(rgbToOklab(hexToRgb(hex))); }
  function oklchToHex(oklch) { return rgbToHex(oklabToRgb(oklchToOklab(oklch))); }

  function oklchToCss({ L, C, h }) {
    const Ls = +L.toFixed(3), Cs = +C.toFixed(3), hs = +h.toFixed(1);
    return `oklch(${Ls} ${Cs} ${hs})`;
  }

  /* ---------- Ramp + harmony ---------- */

  function generateRamp(hex) {
    const baseOklch = hexToOklch(hex);
    const baseC = baseOklch.C;
    const h = baseOklch.h;
    return RAMP_STEPS.map((step) => {
      const L = RAMP_L[step];
      const C = baseC * RAMP_C_SCALE[step];
      const hexOut = oklchToHex({ L, C, h });
      return { step, hex: hexOut, oklch: oklchToCss({ L, C, h }) };
    });
  }

  function generateCompanions(hex, harmony) {
    const offsets = HARMONY_OFFSETS[harmony] || [];
    const baseOklch = hexToOklch(hex);
    return offsets.map((offset, i) => {
      const h = ((baseOklch.h + offset) % 360 + 360) % 360;
      const ramp = RAMP_STEPS.map((step) => {
        const L = RAMP_L[step];
        const C = baseOklch.C * RAMP_C_SCALE[step];
        return { step, hex: oklchToHex({ L, C, h }), oklch: oklchToCss({ L, C, h }) };
      });
      const name = harmony === "analogous"
        ? `accent-${i === 0 ? "warm" : "cool"}`
        : harmony === "complementary"
        ? "accent-complement"
        : `accent-${i + 2}`;
      return { name, hueShift: offset, ramp };
    });
  }

  /* ---------- Live overlay ---------- */

  /* Default names for anchor ramps when the user supplies multiple hexes
     without naming them. First anchor backs the semantic mappings. */
  const ANCHOR_NAMES = ["brand", "accent-2", "accent-3", "support", "warn", "info"];

  function buildOverrideCss() {
    const v = state.vibe;
    if (!v.ramps.length) return "";
    const lines = [":root {"];

    for (const r of v.ramps) {
      for (const stop of r.ramp) {
        lines.push(`  --color-${r.name}-${stop.step}: ${stop.oklch};`);
      }
    }

    // Companion ramps (only when one anchor + non-mono harmony).
    for (const comp of v.companions) {
      for (const stop of comp.ramp) {
        lines.push(`  --color-${comp.name}-${stop.step}: ${stop.oklch};`);
      }
    }

    // First anchor drives the semantic mappings — that's the "brand".
    const primary = v.ramps[0];
    if (primary) {
      for (const [role, step] of Object.entries(v.semantic)) {
        lines.push(`  --${role}: var(--color-${primary.name}-${step});`);
      }
    }

    lines.push("}");
    return lines.join("\n");
  }

  function applyLiveOverride() {
    if (!state.livePreview || state.activeTab !== "vibe") {
      removeLiveOverride();
      return;
    }
    let el = document.getElementById("ds-pending-override");
    if (!el) {
      el = document.createElement("style");
      el.id = "ds-pending-override";
      document.head.appendChild(el);
    }
    el.textContent = buildOverrideCss();
    // Re-render token swatches so the page reflects the override.
    if (typeof renderSemantic === "function") renderSemantic();
    if (typeof renderPrimitives === "function") renderPrimitives();
  }

  function removeLiveOverride() {
    const el = document.getElementById("ds-pending-override");
    if (el) el.remove();
    if (typeof renderSemantic === "function") renderSemantic();
    if (typeof renderPrimitives === "function") renderPrimitives();
  }

  /* ---------- Renderers ---------- */

  /* Renders one row per anchor ramp. The first anchor is full-width
     with step labels; additional anchors are compact rows. */
  function renderRamp() {
    const root = document.getElementById("ds-visual-ramp");
    if (!root) return;
    root.innerHTML = "";
    if (!state.vibe.ramps.length) return;
    state.vibe.ramps.forEach((r, i) => {
      const wrap = document.createElement("div");
      wrap.className = i === 0 ? "ds-ramp-row ds-ramp-row--primary" : "ds-ramp-row";
      if (state.vibe.ramps.length > 1) {
        const label = document.createElement("div");
        label.className = "ds-ramp-row__label";
        label.textContent = r.name;
        wrap.appendChild(label);
      }
      const ramp = document.createElement("div");
      ramp.className = "ds-ramp";
      for (const stop of r.ramp) {
        const cell = document.createElement("div");
        cell.className = "ds-ramp__stop";
        const chip = document.createElement("div");
        chip.className = "ds-ramp__chip";
        chip.style.background = stop.hex;
        chip.title = `${r.name} ${stop.step} · ${stop.oklch}`;
        const lbl = document.createElement("span");
        lbl.textContent = stop.step;
        cell.append(chip, lbl);
        ramp.appendChild(cell);
      }
      wrap.appendChild(ramp);
      root.appendChild(wrap);
    });
  }

  function renderCompanions() {
    const root = document.getElementById("ds-visual-companions");
    if (!root) return;
    if (!state.vibe.companions.length) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }
    root.hidden = false;
    root.innerHTML = "";
    for (const comp of state.vibe.companions) {
      const row = document.createElement("div");
      row.className = "ds-companions__row";
      const label = document.createElement("div");
      label.className = "ds-companions__label";
      label.textContent = comp.name;
      const chips = document.createElement("div");
      chips.className = "ds-companions__chips";
      for (const stop of comp.ramp) {
        const chip = document.createElement("div");
        chip.className = "ds-companions__chip";
        chip.style.background = stop.hex;
        chip.title = `${comp.name} ${stop.step}`;
        chips.appendChild(chip);
      }
      row.append(label, chips);
      root.appendChild(row);
    }
  }

  /* ---------- Vibe tab orchestration ---------- */

  /* Recompute ramps from state.vibe.hexes. Each hex becomes one anchor
     ramp; if only one hex is present, harmony adds companion ramps.
     Empty hexes → no ramps, no overlay. */
  function regenerate() {
    const v = state.vibe;
    v.ramps = v.hexes.map((hex, i) => ({
      name: ANCHOR_NAMES[i] || `anchor-${i + 1}`,
      hex,
      ramp: generateRamp(hex)
    }));
    v.companions = (v.hexes.length === 1)
      ? generateCompanions(v.hexes[0], v.harmony)
      : [];
    renderRamp();
    renderCompanions();
    // Show the output block only when there's something to show.
    const output = document.getElementById("ds-vibe-output");
    if (output) output.hidden = (v.ramps.length === 0);
    // Harmony field only meaningful with exactly one anchor.
    const harmonyField = document.getElementById("ds-vibe-harmony-field");
    if (harmonyField) harmonyField.hidden = (v.hexes.length !== 1);
    applyLiveOverride();
  }

  /* ---------- Tab switching ---------- */

  function switchTab(name) {
    state.activeTab = name;
    document.querySelectorAll(".ds-tab").forEach((btn) => {
      const active = btn.dataset.tab === name;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".ds-tabpanel").forEach((panel) => {
      panel.hidden = panel.dataset.tabpanel !== name;
    });
    applyLiveOverride(); // removes overlay when leaving Visual
  }

  /* ---------- Payload + prompt ---------- */

  function currentInputForMode() {
    const mode = state.activeTab;
    if (mode === "vibe") {
      const v = state.vibe;
      const out = {
        prompt: v.prompt.trim() || undefined,
        anchors: v.hexes.length ? v.ramps.map((r) => ({
          name: r.name,
          hex: r.hex,
          baseOklch: oklchToCss(hexToOklch(r.hex)),
          ramp: r.ramp.map(({ step, oklch }) => ({ step, value: oklch }))
        })) : undefined,
        harmony: (v.hexes.length === 1) ? v.harmony : undefined,
        companions: v.companions.length ? v.companions.map((c) => ({
          name: c.name,
          hueShift: c.hueShift,
          ramp: c.ramp.map(({ step, oklch }) => ({ step, value: oklch }))
        })) : undefined,
        font: { mode: v.font.mode }
      };
      if (v.font.mode === "google" && v.font.google.trim()) {
        out.font.google = v.font.google.trim();
      } else if (v.font.mode === "generic") {
        out.font.generic = v.font.generic;
      }
      return out;
    }
    if (mode === "paste") {
      return { format: state.paste.format, raw: state.paste.raw };
    }
    if (mode === "url") {
      return { url: state.url.url, hint: state.url.hint || undefined };
    }
    if (mode === "image") {
      return {
        mimeType: state.image.mimeType,
        dataUrl: state.image.dataUrl,
        filename: state.image.filename,
        hint: state.image.hint || undefined
      };
    }
    return {};
  }

  function buildScope() {
    if (state.scope === "replace-target") {
      return { type: "replace-target", target: state.scopeTarget };
    }
    return state.scope;
  }

  function buildPayload() {
    return {
      schema: "loomling.tokens-import/v1",
      mode: state.activeTab,
      scope: buildScope(),
      input: currentInputForMode(),
      generatedAt: new Date().toISOString()
    };
  }

  function buildPrompt(payload) {
    if (payload.mode === "vibe") return buildVibePrompt(payload);
    const lines = [];
    lines.push("Process this Tokens Import payload following `system/tokens-import.md`. Update `src/tokens.css` and the relevant `system/*.md` docs per the Finalize protocol.");
    lines.push("");
    lines.push("Concretely:");
    lines.push("1. **Parse + validate.** Reject if `schema` ≠ `loomling.tokens-import/v1`. Validate `mode` and `scope`.");
    lines.push(`2. **Ingest the input** per \`mode: "${payload.mode}"\`. For \`paste\`, auto-detect format unless one is given. For \`url\`, \`WebFetch\` and extract palette + typography. For \`image\`, read the embedded data URL and extract the palette.`);
    lines.push("3. **Map onto Loomling structure.** Every primitive on a 50–950 OKLCH scale. Semantic mappings (`--background`, `--surface1`, `--text1`, `--text2`, `--accent`, `--border`) point at primitives, never raw values. Typography goes to `--font-display`, `--font-body`, `--font-mono` with fallback stacks.");
    lines.push(`4. **Apply scope: \`${JSON.stringify(payload.scope)}\`.** Replace-all wipes the affected category and re-seeds. Merge appends new primitives. Replace-target replaces one named group only.`);
    lines.push("5. **Check contrast.** WCAG AA for body-on-paper (4.5:1) and 3:1 for accent-on-paper. If a mapping fails, surface the failure and propose adjusted steps before writing — accessibility is the gate (`system/accessibility.md`, `CLAUDE.md §5` exception).");
    lines.push("6. **Update `system/*.md` docs.** `system/color.md` Palette + Surface map for color changes. `system/typography.md` family declarations for type changes.");
    lines.push("7. **Update `project.json`** if mode is `url` and `brandSource` is unset.");
    lines.push("8. **Report back.** Which tokens were written / skipped / why, which `system/*.md` updates were made, any drift or accessibility issues surfaced.");
    lines.push("");
    lines.push("Payload:");
    lines.push("```json");
    lines.push(JSON.stringify(payload, null, 2));
    lines.push("```");
    return lines.join("\n");
  }

  /* Vibe mode is the most interpretive import — the user hands Loomling
     intent (a prompt, anchors, font direction) and CC translates brand
     DNA into a working design system. The prompt references the
     heuristics in `system/tokens-import.md § Vibe extraction heuristics`
     for the analysis, then runs Loomling's Preview-and-commit machinery
     for the write. */
  function buildVibePrompt(payload) {
    const lines = [];
    lines.push("Process this Vibe Tokens Import payload following `system/tokens-import.md`. Run the **brand-analysis heuristics** in § Vibe extraction heuristics (signal hierarchy → color hierarchy → typography pairing → feel classification → confidence) BEFORE mapping to Loomling structure. This is a PREVIEW import — write the proposal to `.loomling/tokens.proposed.css`, NOT to `src/tokens.css`.");
    lines.push("");
    lines.push("**Brand analysis (do this work explicitly):**");
    lines.push("");
    lines.push("1. **Signal interpretation** (§ Vibe extraction heuristics A). Identify which signal source you're working from — prompt-only, anchors-only, anchors+prompt — and treat each accordingly. When anchors are present their OKLCH ramps are authoritative for *values*; the prompt drives *meaning* (role assignment, typography, philosophy). When only the prompt is present, derive 3–6 OKLCH ramps that match the stated feel.");
    lines.push("2. **Color hierarchy** (§ B). Assign every color a functional role — primary accent, secondary accent (only if signal supports it), neutrals (temperature-matched to the brand — warm brands get warm-tinted grays, cool brands get cool), semantic statuses (only if needed). Drop colors that wouldn't be referenced anywhere.");
    lines.push("3. **Typography** (§ C). Pick `--font-display` / `--font-body` / `--font-mono` with a stated reason for the pairing (e.g., \"editorial serif display + humanist sans body — magazine character with everyday readability\"). Build a fallback stack for any proprietary or non-free font; note the substitution in `system/typography.md` § Observed at commit time.");
    lines.push("4. **Feel classification** (§ D). Locate the brand on the type axis (UI-rich vs content-rich) and the tension axes (industrial↔warm, minimal↔dense, precision↔playful, monochrome↔colorful, flat↔dimensional). What's *absent* is signal too — no gradients = flat stance; no shadows = depth rejected. Write a one-to-two-sentence **Philosophy** statement capturing the intersection.");
    lines.push("5. **Confidence flag** (§ F). Lead the response with `**Signal confidence: high | medium | low**`. Low-confidence responses must invite the user to refine before committing.");
    lines.push("");
    lines.push("**Mapping to Loomling (after the analysis):**");
    lines.push("");
    lines.push("6. **OKLCH ramps.** Every primitive on a 50–950 scale. Perceptually-uniform lightness, chroma tapered at extremes. Use anchor values verbatim where supplied; derive cleanly where not.");
    lines.push("7. **Semantic mappings.** `--background / --surface1 / --text1 / --text2 / --accent / --border` backed by primitives. Primary anchor → `--accent` (typically step 500). If the analysis turned up a distinct secondary accent, propose adding a new semantic token rather than stuffing it into the primary slot — document the new role in `system/color.md` § Surface map at commit time.");
    lines.push("8. **Fonts** per `input.font`:");
    lines.push("   - `mode: \"google\"` — `input.font.google` is comma-separated families. Distribute across display/body using the pairing rationale from step 3. Add Google Fonts `<link>` recipe to `system/typography.md` at commit time.");
    lines.push("   - `mode: \"generic\"` — `input.font.generic` is `serif` / `sans-serif` / `monospace`. Use system-stack fonts in that family.");
    lines.push("   - `mode: \"auto\"` — pick families that fit the feel classification from step 4. Distinctive Google Fonts when the philosophy calls for character; system stacks when it calls for restraint.");
    lines.push("9. **Contrast** (WCAG AA: body-on-paper ≥ 4.5:1; accent-on-paper ≥ 3:1). Plus the **squint test** (§ G): if hierarchy would blur at low resolution, adjust the accent or lightness spread before writing.");
    lines.push(`10. **Apply scope: \`${JSON.stringify(payload.scope)}\`** when assembling the proposal CSS — but write to \`.loomling/tokens.proposed.css\`, NOT \`src/tokens.css\`.`);
    lines.push("11. **Do NOT** update `src/tokens.css`, `system/color.md`, `system/typography.md`, or `project.json` during the propose step. Those happen at Commit time. The proposal file is the only write here.");
    lines.push("12. **Dark mode** (§ E + `system/dark-mode.md`). Emit `[data-theme=\"dark\"]` overrides when the brand signals support — either explicitly (prompt mentions \"dark mode\", \"supports dark\", \"works on dark backgrounds\") or strongly (type-led editorial, photography-led, tech/dev tooling, moody / nocturnal feel). When emitting:");
    lines.push("    - Wrap in a single `[data-theme=\"dark\"]` selector in the same proposal file. Loomling reads this selector to detect support — the chrome's sun/moon toggle gates content-flip behind it.");
    lines.push("    - **Transpose, don't invert.** Warm light gray → warm dark gray; cool light blue → cool dark blue. Preserve hue + temperature; invert lightness.");
    lines.push("    - **Slight chroma bump on accents.** brand-500 in light may become brand-400 in dark to keep perceived saturation against the darker surround.");
    lines.push("    - **Re-run contrast for dark.** body-on-paper ≥ 4.5:1, accent-on-paper ≥ 3:1 with the dark semantic mappings.");
    lines.push("    - Override the SEMANTIC tokens (`--background / --surface1 / --text1 / --text2 / --accent / --border`) — not the primitives. Primitives stay constant; the semantic mappings get repointed.");
    lines.push("    - If the signal is mixed or weak, default to NOT emitting and call it out in Notes: *\"Dark-mode tokens not generated — signal is ambiguous. Add a follow-up prompt if dark is required.\"*");
    lines.push("");
    lines.push("**Response structure:**");
    lines.push("");
    lines.push("- Line 1: `**Signal confidence: <level>**`");
    lines.push("- **Philosophy** — the 1–2 sentence statement from step 4.");
    lines.push("- **Palette** — the proposed ramps with one-line traceable reasons (§ G) for non-obvious choices.");
    lines.push("- **Typography** — display/body/mono picks with the pairing rationale.");
    lines.push("- **Dark mode** — \"emitted\" with a 1-sentence transposition rationale, OR \"skipped\" with the reason. (The Loom uses this paragraph to confirm to the user whether the sun/moon toggle will propagate to their design system.)");
    lines.push("- **Notes** — any deferred items (secondary accent? proprietary fonts substituted?), confidence caveats, contrast concerns.");
    lines.push("- Closing: remind the user the proposal is live on the Loom — review and **Commit** in the banner to finalize, or **Discard**. To refine, re-run Vibe with a sharper prompt or new anchors.");
    lines.push("");
    lines.push("Payload:");
    lines.push("```json");
    lines.push(JSON.stringify(payload, null, 2));
    lines.push("```");
    return lines.join("\n");
  }

  /* ---------- Submit flow ---------- */

  function openImport() {
    state.open = true;
    document.getElementById("ds-import-modal").hidden = false;
    regenerate();
    applyLiveOverride();
  }

  function closeImport() {
    state.open = false;
    document.getElementById("ds-import-modal").hidden = true;
    removeLiveOverride();
  }

  function showPrompt(prompt) {
    document.getElementById("ds-prompt-text").textContent = prompt;
    document.getElementById("ds-import-modal").hidden = true;
    document.getElementById("ds-prompt-modal").hidden = false;
  }

  function closePrompt() {
    document.getElementById("ds-prompt-modal").hidden = true;
    removeLiveOverride();
    state.open = false;
  }

  async function copyPrompt() {
    const text = document.getElementById("ds-prompt-text").textContent;
    const btn = document.getElementById("ds-prompt-copy");
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied ✓";
      setTimeout(() => { btn.textContent = original; }, 1400);
    } catch {
      btn.textContent = "Copy failed";
      setTimeout(() => { btn.textContent = original; }, 1400);
    }
  }

  function submit() {
    // Light per-mode validation.
    if (state.activeTab === "paste" && !state.paste.raw.trim()) {
      alert("Paste some content first.");
      return;
    }
    if (state.activeTab === "url" && !state.url.url.trim()) {
      alert("Enter a brand URL first.");
      return;
    }
    if (state.activeTab === "image" && !state.image.dataUrl) {
      alert("Drop an image first.");
      return;
    }
    if (state.activeTab === "vibe" && !state.vibe.prompt.trim() && !state.vibe.hexes.length) {
      alert("Describe the vibe or add at least one anchor color.");
      return;
    }

    const payload = buildPayload();
    const prompt = buildPrompt(payload);
    showPrompt(prompt);
  }

  /* ---------- Dev preview (no CC paste) ---------- */

  function devCssForVibe() {
    // Reuse the live-overlay builder. Empty when no anchor hexes.
    return buildOverrideCss();
  }

  function devCssForPasteHexList(raw) {
    const hexes = (raw.match(/#[0-9a-fA-F]{6}\b/g) || [])
      .map((h) => h.toLowerCase())
      .filter((h, i, arr) => arr.indexOf(h) === i)
      .slice(0, 6); // soft cap so the override stays sane
    if (!hexes.length) return null;

    const lines = [":root {"];
    const families = ["brand", "accent-2", "accent-3", "neutral", "support", "warn"];
    let semanticHueIndex = 0;

    hexes.forEach((hex, i) => {
      const name = families[i] || `family-${i}`;
      const ramp = generateRamp(hex);
      for (const stop of ramp) {
        lines.push(`  --color-${name}-${stop.step}: ${stop.oklch};`);
      }
      // First hex drives the semantic mappings.
      if (i === 0) {
        semanticHueIndex = i;
        const sem = state.vibe.semantic;
        for (const [role, step] of Object.entries(sem)) {
          lines.push(`  --${role}: var(--color-${name}-${step});`);
        }
      }
    });

    lines.push("}");
    return lines.join("\n");
  }

  function applyDevPreview() {
    if (typeof window.DevTokens === "undefined") {
      alert("Dev preview module not loaded.");
      return;
    }

    let css = null;
    if (state.activeTab === "vibe") {
      if (!state.vibe.hexes.length) {
        alert("Dev preview needs at least one anchor color. Add a hex above, or use Build CC prompt to let Claude Code derive a palette from the vibe prompt.");
        return;
      }
      regenerate();
      css = devCssForVibe();
    } else if (state.activeTab === "paste") {
      css = devCssForPasteHexList(state.paste.raw);
      if (!css) {
        alert("Dev preview supports hex-list pastes (e.g. #0b6e4f #2554f7). For other formats, use Build CC prompt.");
        return;
      }
    } else {
      alert("Dev preview supports Vibe (with anchor hexes) and hex-list pastes. URL and Image modes require Build CC prompt.");
      return;
    }

    if (!css) {
      alert("Nothing to preview yet — adjust the input first.");
      return;
    }

    window.DevTokens.apply(css);
    closeImport();
  }

  /* ---------- Reset tokens (dev affordance) ---------- */

  const RESET_PROMPT = `Reset Loomling's tokens to the pre-import baseline.

Concretely:
1. Copy \`.loomling/tokens.original.css\` over \`src/tokens.css\` verbatim — wipes any imported ramps (brand / accent-2 / accent-3 / custom hues) and repoints all semantic tokens at the placeholder neutrals + the placeholder blue accent.
2. If \`.loomling/tokens.proposed.css\` exists, delete it (any pending Vibe proposal is being discarded as part of the reset).
3. Revert \`system/color.md\` to its pre-import state — Status line back to "Awaiting init", Palette + Surface map sections back to "Filled by the init interview. Stays empty until then." (and the equivalent for the Surface map).
4. Revert \`system/typography.md\` to its pre-import state if it was modified during any import.
5. If any \`var(--<old>)\` → \`var(--<new>)\` migration was done during a prior import that introduced a foreign semantic vocabulary, walk \`src/{components,modules,templates}/**/*.css\` and rewrite back to the original Loomling vocabulary (\`--background / --surface1 / --surface2 / --surface3 / --text1 / --text2 / --text3 / --text4 / --accent / --border / --border-visible\`).
6. Report what was reset: files restored, files reverted, any migrations rolled back.

This is a dev/testing affordance — the user clicked Reset tokens on the Tokens page. Treat it as authoritative; the user has agreed to wipe the import work.

Note: dev preview overrides (\`localStorage.loomling:dev-tokens:v1\`) are browser-side and CC cannot clear them. After the reset lands, remind the user to click "Clear" on the dev banner if it's still showing.`;

  /* Reset is one-click: applies the OG token snapshot as a dev override
     IMMEDIATELY so the visual reset lands across the Loom + iframes
     without round-tripping through CC. Simultaneously copies the
     RESET_PROMPT to the clipboard so the user can paste it into CC
     whenever they want the change written to disk (system/*.md reverts,
     module CSS migration rollback, etc.). Clear on the dev banner
     undoes the visual reset; pasting into CC commits it. */
  async function performReset() {
    let css = null;
    try {
      const res = await fetch("../.loomling/tokens.original.css", { cache: "no-store" });
      if (res.ok) css = await res.text();
    } catch { /* fall through */ }

    if (!css) {
      alert("Couldn't load .loomling/tokens.original.css — verify the snapshot file exists.");
      return;
    }

    if (window.DevTokens?.apply) {
      window.DevTokens.apply(css);
      // apply() dispatches loomling:tokens-changed which the listener in
      // wire() handles to re-render the Tokens page swatches.
    }

    let clipboardOk = true;
    try { await navigator.clipboard.writeText(RESET_PROMPT); }
    catch { clipboardOk = false; }

    const msg = clipboardOk
      ? "Tokens reset to original (preview). Reset prompt copied — paste into Claude Code to commit to disk."
      : "Tokens reset to original (preview). Couldn't copy the disk-commit prompt — paste from system/tokens-import.md manually if you want it permanent.";

    if (window.DevTokens?.showToast) {
      window.DevTokens.showToast(msg);
    }
  }

  /* ---------- Prefill brandSource from project.json ---------- */

  async function loadProjectJson() {
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (!res.ok) return;
      const proj = await res.json();
      state.brandSource = proj.brandSource || null;
      const urlInput = document.getElementById("ds-url-input");
      if (urlInput && state.brandSource && !urlInput.value) {
        urlInput.value = state.brandSource;
        state.url.url = state.brandSource;
      }
    } catch { /* no-op */ }
  }

  /* ---------- Hex chip input ---------- */

  function renderHexChips() {
    const container = document.getElementById("ds-vibe-chips");
    if (!container) return;
    // Wipe existing chips (everything except the input).
    container.querySelectorAll(".ds-chip").forEach((c) => c.remove());
    const input = container.querySelector("input");
    state.vibe.hexes.forEach((hex, i) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ds-chip";
      chip.innerHTML = `
        <span class="ds-chip__swatch" style="background: ${hex};"></span>
        <span>${hex}</span>
        <span class="ds-chip__remove" aria-label="Remove ${hex}">×</span>
      `;
      chip.addEventListener("click", () => {
        state.vibe.hexes.splice(i, 1);
        renderHexChips();
        regenerate();
      });
      container.insertBefore(chip, input);
    });
  }

  function tryAddHex(raw) {
    const text = raw.trim().replace(/[,;\s]+$/g, "");
    if (!text) return false;
    let hex = text.startsWith("#") ? text : ("#" + text);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
    hex = hex.toLowerCase();
    if (state.vibe.hexes.includes(hex)) return true; // de-dupe silently
    state.vibe.hexes.push(hex);
    renderHexChips();
    regenerate();
    return true;
  }

  function wireHexChips() {
    const input = document.getElementById("ds-vibe-hex-input");
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (tryAddHex(input.value)) input.value = "";
      } else if (e.key === "Backspace" && !input.value && state.vibe.hexes.length) {
        state.vibe.hexes.pop();
        renderHexChips();
        regenerate();
      }
    });
    input.addEventListener("blur", () => {
      if (tryAddHex(input.value)) input.value = "";
    });
    // Allow paste of multiple comma/whitespace-separated hexes.
    input.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData).getData("text");
      if (!text) return;
      const parts = text.split(/[\s,;]+/).filter(Boolean);
      if (parts.length <= 1) return; // single value: let default paste happen
      e.preventDefault();
      parts.forEach(tryAddHex);
      input.value = "";
    });
  }

  /* ---------- Image handling ---------- */

  function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("That doesn't look like an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.image.dataUrl = reader.result;
      state.image.filename = file.name;
      state.image.mimeType = file.type;
      document.getElementById("ds-image-preview").src = reader.result;
      document.getElementById("ds-image-filename").textContent = file.name;
      document.getElementById("ds-image-empty").hidden = true;
      document.getElementById("ds-image-filled").hidden = false;
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    state.image = { dataUrl: "", filename: "", mimeType: "", hint: state.image.hint };
    document.getElementById("ds-image-preview").src = "";
    document.getElementById("ds-image-filename").textContent = "—";
    document.getElementById("ds-image-empty").hidden = false;
    document.getElementById("ds-image-filled").hidden = true;
    document.getElementById("ds-image-file").value = "";
  }

  /* ---------- Wiring ---------- */

  // Document-level listeners (loomling:tokens-changed, Escape keydown) are
  // installed at most once per session — re-wiring on a router nav into
  // Settings would otherwise double-bind them.
  let docListenersInstalled = false;

  function wire() {
    const openBtn = document.getElementById("ds-import");
    if (!openBtn) return; // page may not have the import tile
    if (openBtn.dataset.loomInit === "true") return; // this button already wired
    openBtn.dataset.loomInit = "true";

    openBtn.addEventListener("click", openImport);

    const resetBtn = document.getElementById("ds-reset");
    if (resetBtn) resetBtn.addEventListener("click", performReset);

    if (!docListenersInstalled) {
      docListenersInstalled = true;
      // When DevTokens.apply/clear fires from elsewhere (e.g. dev banner's
      // Clear button), re-render the Tokens page swatches so they reflect
      // the new cascade-resolved values.
      document.addEventListener("loomling:tokens-changed", () => {
        if (typeof renderSemantic === "function") renderSemantic();
        if (typeof renderPrimitives === "function") renderPrimitives();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const promptModal = document.getElementById("ds-prompt-modal");
        if (promptModal && !promptModal.hidden) closePrompt();
        else if (state.open) closeImport();
      });
    }

    document.querySelectorAll("[data-modal-dismiss='import']").forEach((el) => {
      el.addEventListener("click", closeImport);
    });
    document.querySelectorAll("[data-modal-dismiss='prompt']").forEach((el) => {
      el.addEventListener("click", closePrompt);
    });

    // Tabs
    document.querySelectorAll(".ds-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Vibe controls — prompt textarea
    document.getElementById("ds-vibe-prompt").addEventListener("input", (e) => {
      state.vibe.prompt = e.target.value;
    });

    // Vibe controls — hex chip input
    wireHexChips();

    // Harmony (only meaningful when one anchor)
    document.querySelectorAll("input[name='ds-harmony']").forEach((r) => {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        state.vibe.harmony = r.value;
        regenerate();
      });
    });

    // Font direction
    document.querySelectorAll("input[name='ds-font-mode']").forEach((r) => {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        state.vibe.font.mode = r.value;
        document.querySelectorAll(".ds-font__detail").forEach((d) => {
          d.hidden = (d.dataset.fontMode !== r.value);
        });
      });
    });
    document.getElementById("ds-vibe-font-google").addEventListener("input", (e) => {
      state.vibe.font.google = e.target.value;
    });
    document.querySelectorAll("input[name='ds-font-generic']").forEach((r) => {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        state.vibe.font.generic = r.value;
      });
    });

    // Live preview toggle
    document.getElementById("ds-visual-preview").addEventListener("change", (e) => {
      state.livePreview = e.target.checked;
      applyLiveOverride();
    });

    // Paste tab
    document.getElementById("ds-paste-format").addEventListener("change", (e) => {
      state.paste.format = e.target.value;
    });
    document.getElementById("ds-paste-raw").addEventListener("input", (e) => {
      state.paste.raw = e.target.value;
    });

    // URL tab
    document.getElementById("ds-url-input").addEventListener("input", (e) => {
      state.url.url = e.target.value;
    });
    document.getElementById("ds-url-hint").addEventListener("input", (e) => {
      state.url.hint = e.target.value;
    });

    // Image tab
    const dropzone = document.getElementById("ds-image-dropzone");
    const fileInput = document.getElementById("ds-image-file");
    dropzone.addEventListener("click", (e) => {
      if (e.target.closest("#ds-image-clear")) return;
      fileInput.click();
    });
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleImageFile(f);
    });
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleImageFile(f);
    });
    document.getElementById("ds-image-clear").addEventListener("click", (e) => {
      e.stopPropagation();
      clearImage();
    });
    document.getElementById("ds-image-hint").addEventListener("input", (e) => {
      state.image.hint = e.target.value;
    });

    // Scope picker
    document.querySelectorAll("input[name='ds-scope']").forEach((r) => {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        state.scope = r.value;
        document.getElementById("ds-scope-target-field").hidden = (r.value !== "replace-target");
      });
    });
    document.getElementById("ds-scope-target").addEventListener("change", (e) => {
      state.scopeTarget = e.target.value;
    });

    // Submit + prompt modal
    document.getElementById("ds-import-submit").addEventListener("click", submit);
    document.getElementById("ds-import-dev").addEventListener("click", applyDevPreview);
    document.getElementById("ds-prompt-back").addEventListener("click", () => {
      document.getElementById("ds-prompt-modal").hidden = true;
      document.getElementById("ds-import-modal").hidden = false;
    });
    document.getElementById("ds-prompt-copy").addEventListener("click", copyPrompt);

    // Prefill
    loadProjectJson();
  }

  return { wire };
})();

// ---- Bootstrap --------------------------------------------------------
// Runs after every top-level declaration above has executed, so `const`
// modules like TokensImport are out of the Temporal Dead Zone. Renderers
// only fire on the System page; TokensImport wires unconditionally so the
// Import tile works on the Settings page too.
//
// Loom router compatibility: this script is loaded on every page so the
// init functions are available when the user navigates IN. The renderers
// re-run on every nav into System (idempotent — they clear + repopulate
// their target elements). The window/matchMedia listeners install ONCE
// across the session, guarded by closure flags.

let tokensGlobalListenersInstalled = false;

function initTokens() {
  setProjectName();
  if (document.body.dataset.page !== "tokens") return;

  renderSemantic();
  renderPrimitives();
  renderType();
  renderRadii();
  renderElevation();
  renderSpace();
  renderGrid();
  renderBreakpoints();
  renderIconography();

  if (!tokensGlobalListenersInstalled) {
    tokensGlobalListenersInstalled = true;
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderGrid, 80);
    });
    for (const px of [480, 768, 1024, 1280, 1536]) {
      const mq = matchMedia(`(min-width: ${px}px)`);
      if (mq.addEventListener) mq.addEventListener("change", renderGrid);
      else if (mq.addListener) mq.addListener(renderGrid);
    }
    // Semantic tokens re-point at different primitives between light/dark.
    // Re-render on every toggle so the swatches match the live cascade.
    // Also re-render once theme detection finishes (initial render runs
    // synchronously during initTokens, before Theme.init's async dark
    // detection resolves — without this hook the first render would miss
    // the dual layout). Primitives don't flip, so they're skipped.
    document.addEventListener("loomling:theme-changed", () => {
      if (document.body.dataset.page === "tokens") renderSemantic();
    });
    document.addEventListener("loomling:theme-ready", () => {
      if (document.body.dataset.page === "tokens") renderSemantic();
    });
  }

  const sideToggle = wireSideToggle();
  wireScrollSpy(sideToggle);
}

// TokensImport wires on every page that contains a #ds-import button
// (currently only Settings). After a router swap into Settings, the
// button is a NEW DOM element — re-wire so its click listener attaches.
// wire() internally guards its document-level listener via a flag.
function initImportTile() {
  if (typeof TokensImport === "object" && typeof TokensImport.wire === "function") {
    TokensImport.wire();
  }
}

window.LoomPages = window.LoomPages || {};
window.LoomPages.tokens = initTokens;
window.LoomPages.settings = function initSettingsPage() {
  setProjectName();
  initImportTile();
};

document.addEventListener("loom:nav", () => {
  initTokens();
  initImportTile();
});

initTokens();
initImportTile();
