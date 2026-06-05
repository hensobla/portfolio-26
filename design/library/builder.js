/* ============================================================
   builder.js — Loomling Page Builder
   ------------------------------------------------------------
   Composes pages by stacking modules. Navigation is locked
   to the top of the canvas, footer to the bottom; user modules
   reorder freely in between. State persists to localStorage.
   Finalize → emits a CC prompt with a JSON payload; CC writes
   the template files + manifest entry per system/page-builder.md.
   ============================================================ */

const LS_KEY = "loomling:builder:current";
const STATE_VERSION = 1;
const NAV_SLUG_PREFERRED = "navigation";
const FOOTER_SLUG_PREFERRED = "footer";

// Tracks the BuilderApp tied to the current <main>. Each router nav INTO
// Builder creates a new app on the new DOM; we abort the previous app's
// global listeners (via AbortController) before instantiating the new one.
let currentBuilderApp = null;

async function initBuilder() {
  // Dispose any previous app's global listeners regardless of where we're
  // navigating to — they were bound when this script last ran a BuilderApp
  // init and would otherwise stay subscribed to window/document forever,
  // doubling up after a few Builder visits.
  if (currentBuilderApp && typeof currentBuilderApp.teardown === "function") {
    try { currentBuilderApp.teardown(); } catch (_) {}
    currentBuilderApp = null;
  }

  if (document.body.dataset.page !== "builder") return;

  const manifest = await loadManifest();
  if (!manifest) return;

  setProjectName(manifest.project?.name);

  // Drop module entries with hostile or malformed paths — they could
  // otherwise drive iframe.src to an attacker-controlled location.
  const modules = (manifest.entries || []).filter(
    (e) => e.category === "modules" && isSafeManifestPath(e.previewPath) && isSafeManifestPath(e.filePath)
  );

  const navModule = pickModule(modules, NAV_SLUG_PREFERRED, "nav");
  const footerModule = pickModule(modules, FOOTER_SLUG_PREFERRED, "footer");

  // Refuse when nav + footer would collapse to the same module — happens when
  // the manifest has exactly one module and the position-based fallback picks
  // it twice. The user would otherwise see two locked-but-identical canvas
  // instances and have no way to differentiate them.
  if (!navModule || !footerModule || navModule === footerModule) {
    return showError(
      "The Page Builder needs a navigation module and a footer module before it can run. " +
      `Found ${modules.length} module(s) in the manifest. ` +
      "Ask Claude Code to build a 'navigation' module and a 'footer' module, then come back."
    );
  }

  const layout = document.getElementById("bld-layout");
  if (!layout) return;
  layout.hidden = false;

  // Sortable.js is loaded lazily — needed only when Builder actually runs.
  // Keeps the rest of the Loom from paying the 50KB cost on every page load.
  await ensureSortableLoaded();

  const app = new BuilderApp({ manifest, modules, navModule, footerModule });
  app.init();
  currentBuilderApp = app;
}

// Lazy-load Sortable.js the first time Builder initializes. Cached across
// re-entries.
let sortablePromise = null;
function ensureSortableLoaded() {
  if (typeof Sortable !== "undefined") return Promise.resolve();
  if (sortablePromise) return sortablePromise;
  sortablePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js";
    s.integrity = "sha384-HZZ/fukV+9G8gwTNjN7zQDG0Sp7MsZy5DDN6VfY3Be7V9dvQpEpR2jF2HlyFUUjU";
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Sortable.js"));
    document.head.appendChild(s);
  });
  return sortablePromise;
}

window.LoomPages = window.LoomPages || {};
window.LoomPages.builder = initBuilder;
document.addEventListener("loom:nav", initBuilder);
initBuilder();

async function loadManifest() {
  try {
    const res = await fetch("manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    showError(
      "Could not load manifest.json. Make sure you're serving from the project root " +
      `(npx http-server . -c-1). Underlying: ${err.message}`
    );
    return null;
  }
}

function setProjectName(name) {
  const el = document.querySelector("[data-project-name]");
  if (el) el.textContent = name ? name : "(unnamed)";
}

function showError(msg) {
  const el = document.getElementById("bld-error");
  el.textContent = msg;
  el.hidden = false;
  document.getElementById("bld-layout").hidden = true;
}

/* Pick a module by preferred slug; fall back to first/last available so the
   Builder still works in a project where someone renamed nav/footer.
   Returns null if no module exists at all. */
function pickModule(modules, preferredSlug, role) {
  if (!modules.length) return null;
  const byPreferred = modules.find((m) => m.slug === preferredSlug);
  if (byPreferred) return byPreferred;
  // Heuristic fallback: slug containing the role hint
  const byHint = modules.find((m) => m.slug.includes(role));
  if (byHint) return byHint;
  // Position-based fallback
  if (role === "nav") return modules[0];
  if (role === "footer") return modules[modules.length - 1];
  return null;
}

/* ============================================================
   BuilderApp — single instance, owns state + DOM wiring
   ============================================================ */

class BuilderApp {
  constructor(opts) {
    this.manifest = opts.manifest;
    this.modules = opts.modules;
    this.navModule = opts.navModule;
    this.footerModule = opts.footerModule;

    this.moduleBySlug = new Map(this.modules.map((m) => [m.slug, m]));

    this.state = null;
    this.selectedId = null;

    // id → { rootEl, iframe, ready, lastContentJson }
    this.instanceEls = new Map();

    this.elPaletteList = document.getElementById("bld-palette-list");
    this.elPaletteCount = document.getElementById("bld-palette-count");
    this.elCanvasStack = document.getElementById("bld-canvas-stack");
    this.elInspector = document.getElementById("bld-inspector");
    this.elInspectorPane = document.getElementById("bld-inspector-pane");
    this.elInspectorEmpty = document.getElementById("bld-inspector-empty");

    // AbortController for global window/document listeners owned by this
    // app instance. Calling teardown() (or .abort() directly) removes every
    // listener bound with { signal: this.abortCtrl.signal } — used by the
    // router to dispose the previous app before swapping in a new one.
    this.abortCtrl = new AbortController();
  }

  teardown() {
    if (this.abortCtrl) {
      try { this.abortCtrl.abort(); } catch (_) {}
    }
  }

  init() {
    this.state = this.loadPersistedState() || this.seedState();

    this.renderPalette();
    this.renderCanvas();
    this.wireToolbar();
    this.wireInspectorChrome();
    this.wireFinalize();
    this.wireIframeMessages();

    // Save initial seed so a fresh visitor sees the same canvas after refresh.
    this.persistState();
  }

  // ---- state ----------------------------------------------------------

  seedState() {
    return {
      version: STATE_VERSION,
      modules: [
        this.makeInstance(this.navModule, "top"),
        this.makeInstance(this.footerModule, "bottom")
      ]
    };
  }

  loadPersistedState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== STATE_VERSION) return null;
      if (!Array.isArray(parsed.modules) || parsed.modules.length < 2) return null;

      // Drop instances whose referenced module no longer exists.
      const validInstances = parsed.modules.filter((inst) => this.moduleBySlug.has(inst.moduleSlug));
      if (validInstances.length < 2) return null;

      // Re-anchor locked nav at top and locked footer at bottom in case the
      // persisted order was somehow corrupted.
      const top = validInstances.find((i) => i.locked === "top");
      const bottom = validInstances.find((i) => i.locked === "bottom");
      if (!top || !bottom) return null;

      const middle = validInstances.filter((i) => i.locked == null);
      return {
        version: STATE_VERSION,
        modules: [top, ...middle, bottom]
      };
    } catch (e) {
      console.warn("Builder: failed to load persisted state, starting fresh.", e);
      return null;
    }
  }

  persistState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Builder: could not persist state.", e);
    }
  }

  resetState() {
    this.state = this.seedState();
    this.persistState();
    this.selectedId = null;
    this.instanceEls.clear();
    this.renderCanvas();
    this.renderInspector();
  }

  makeInstance(module, locked = null) {
    return {
      id: this.newId(),
      moduleSlug: module.slug,
      stateId: module.states?.[0]?.id || "default",
      locked,
      overrides: {}
    };
  }

  newId() {
    return "i_" + Math.random().toString(36).slice(2, 10);
  }

  // ---- palette --------------------------------------------------------

  renderPalette() {
    this.elPaletteCount.textContent = String(this.modules.length);
    this.elPaletteList.innerHTML = "";

    for (const module of this.modules) {
      this.elPaletteList.appendChild(this.renderPaletteItem(module));
    }
  }

  renderPaletteItem(module) {
    const root = document.createElement("button");
    root.type = "button";
    root.className = "bld-palette-item";
    root.dataset.moduleSlug = module.slug;
    root.title = `Add ${module.name}`;

    root.innerHTML = `
      <div class="bld-palette-item__preview">
        <div class="bld-palette-item__preview-fit">
          <div class="bld-palette-item__preview-scaler">
            <iframe
              loading="lazy"
              title="${escape(module.name)} preview"
              sandbox="allow-scripts allow-same-origin"></iframe>
          </div>
        </div>
        <span class="bld-palette-item__add" aria-hidden="true">+</span>
      </div>
      <div class="bld-palette-item__body">
        <span class="bld-palette-item__name">${escape(module.name)}</span>
        <span class="bld-palette-item__slug">${escape(module.slug)}</span>
      </div>
    `;

    const iframe = root.querySelector("iframe");
    const preview = root.querySelector(".bld-palette-item__preview");
    const fit = root.querySelector(".bld-palette-item__preview-fit");
    const scaler = root.querySelector(".bld-palette-item__preview-scaler");

    /* Mirror library.js fitPreview: render the module at desktop design width
       and scale to fit. Tiles are small (100px tall), so scaling is heavy —
       it's a thumbnail, not a fidelity reference. */
    const designWidth = 1280;
    iframe.style.width = `${designWidth}px`;
    iframe.style.height = "40px";

    const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    iframe.src = `/${module.previewPath}?state=${encodeURIComponent(module.states?.[0]?.id || "default")}&_=${bust}`;

    const PAD = 4;
    const fitPreview = () => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) return;
      const contentH = Math.max(doc.body.scrollHeight, 40);
      iframe.style.height = `${contentH}px`;

      const tileW = preview.clientWidth;
      const tileH = preview.clientHeight;
      const innerW = Math.max(40, tileW - PAD * 2);
      const innerH = Math.max(40, tileH - PAD * 2);
      const ratio = Math.min(innerW / designWidth, innerH / contentH, 1);

      scaler.style.width = `${designWidth}px`;
      scaler.style.height = `${contentH}px`;
      scaler.style.transform = `scale(${ratio})`;
      fit.style.width = `${Math.ceil(designWidth * ratio)}px`;
      fit.style.height = `${Math.ceil(contentH * ratio)}px`;
    };

    let bodyObserver = null;
    iframe.addEventListener("load", () => {
      fitPreview();
      // Disconnect any prior observer on the previous body — palette
      // previews never reload during a normal session, but defensive: a
      // hot-reload or theme propagation can swap the iframe's document.
      if (bodyObserver) {
        try { bodyObserver.disconnect(); } catch (_) {}
        bodyObserver = null;
      }
      const doc = iframe.contentDocument;
      if (doc && doc.body && typeof ResizeObserver !== "undefined") {
        bodyObserver = new ResizeObserver(() => fitPreview());
        bodyObserver.observe(doc.body);
      }
    });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => fitPreview()).observe(preview);
    }

    root.addEventListener("click", () => {
      this.addModule(module);
    });

    return root;
  }

  // ---- canvas ---------------------------------------------------------

  renderCanvas() {
    // Disconnect observers from any previous render before we drop the DOM
    // refs — otherwise they hang around on detached iframe bodies until GC
    // and the canvas accumulates one per state-change/reorder cycle.
    for (const ref of this.instanceEls.values()) {
      if (ref.bodyObserver) {
        try { ref.bodyObserver.disconnect(); } catch (_) {}
        ref.bodyObserver = null;
      }
    }
    this.elCanvasStack.innerHTML = "";
    this.instanceEls.clear();

    const top = this.state.modules.find((i) => i.locked === "top");
    const bottom = this.state.modules.find((i) => i.locked === "bottom");
    const middle = this.state.modules.filter((i) => i.locked == null);

    if (top) this.elCanvasStack.appendChild(this.renderInstance(top));

    const middleWrap = document.createElement("div");
    middleWrap.className = middle.length ? "bld-canvas__middle" : "bld-canvas__middle bld-canvas__middle--empty";
    middleWrap.id = "bld-canvas-middle";
    if (middle.length === 0) {
      middleWrap.textContent = "Click a module on the left to add it between the nav and footer.";
    } else {
      for (const inst of middle) middleWrap.appendChild(this.renderInstance(inst));
    }
    this.elCanvasStack.appendChild(middleWrap);

    if (bottom) this.elCanvasStack.appendChild(this.renderInstance(bottom));

    this.wireSortable();
  }

  renderInstance(inst) {
    const module = this.moduleBySlug.get(inst.moduleSlug);
    if (!module) {
      // Defensive — shouldn't happen since loadPersistedState filters these out
      const ghost = document.createElement("div");
      ghost.className = "bld-instance bld-instance--missing";
      ghost.textContent = `(missing module: ${inst.moduleSlug})`;
      return ghost;
    }

    const root = document.createElement("article");
    root.className = "bld-instance" + (inst.locked ? " bld-instance--locked" : "");
    root.dataset.instanceId = inst.id;
    root.dataset.locked = inst.locked || "";

    const stateLabel = module.states?.find((s) => s.id === inst.stateId)?.label || inst.stateId;

    root.innerHTML = `
      <div class="bld-instance__chrome">
        <div class="bld-instance__label">
          <span class="bld-instance__handle" aria-label="Drag to reorder" data-handle>⋮⋮</span>
          <span class="bld-instance__name">${escape(module.name)}</span>
          <span class="bld-instance__slug">${escape(module.slug)}</span>
          <span class="bld-instance__state" data-state-chip>${escape(stateLabel)}</span>
        </div>
        ${inst.locked ? `<span class="bld-instance__lock">Locked ${inst.locked}</span>` : ""}
      </div>
      <div class="bld-instance__frame">
        <iframe
          title="${escape(module.name)} on canvas"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"></iframe>
        <div class="bld-instance__overlay" data-select-instance></div>
      </div>
    `;

    const iframe = root.querySelector("iframe");
    iframe.style.height = "40px";

    /* Cachebuster identical to sandbox.js — Chrome dedups iframe.src writes to
       the same URL even when query strings differ. */
    const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    iframe.src = `/${module.previewPath}?entry=${encodeURIComponent(module.slug)}&state=${encodeURIComponent(inst.stateId)}&_=${bust}&iid=${encodeURIComponent(inst.id)}`;

    this.instanceEls.set(inst.id, { rootEl: root, iframe, ready: false, bodyObserver: null });

    /* Sync the iframe height to its content. body.scrollHeight only — see
       sandbox.js for the reasoning (documentElement.scrollHeight is floored
       at the iframe's viewport height and never shrinks). */
    iframe.addEventListener("load", () => {
      this.syncInstanceHeight(inst.id);
      const ref = this.instanceEls.get(inst.id);
      if (ref?.bodyObserver) {
        try { ref.bodyObserver.disconnect(); } catch (_) {}
        ref.bodyObserver = null;
      }
      const doc = iframe.contentDocument;
      if (doc && doc.body && typeof ResizeObserver !== "undefined" && ref) {
        ref.bodyObserver = new ResizeObserver(() => this.syncInstanceHeight(inst.id));
        ref.bodyObserver.observe(doc.body);
      }
    });

    root.querySelector("[data-select-instance]").addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectInstance(inst.id);
    });

    if (inst.id === this.selectedId) root.classList.add("is-selected");

    return root;
  }

  syncInstanceHeight(id) {
    const ref = this.instanceEls.get(id);
    if (!ref) return;
    const doc = ref.iframe.contentDocument;
    if (!doc || !doc.body) return;
    const h = Math.max(doc.body.scrollHeight, 60);
    ref.iframe.style.height = `${h}px`;
  }

  // ---- sortable -------------------------------------------------------

  wireSortable() {
    if (typeof Sortable === "undefined") {
      console.warn("Builder: SortableJS not loaded yet, drag-reorder disabled. Retrying.");
      // Try again next tick in case the CDN script loaded after builder.js
      setTimeout(() => this.wireSortable(), 200);
      return;
    }

    const middle = document.getElementById("bld-canvas-middle");
    if (!middle || middle.classList.contains("bld-canvas__middle--empty")) return;

    if (this._sortable) {
      try { this._sortable.destroy(); } catch (_) {}
    }

    this._sortable = Sortable.create(middle, {
      animation: 150,
      handle: "[data-handle]",
      ghostClass: "bld-ghost",
      chosenClass: "bld-drag",
      dragClass: "bld-drag",
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        this.reorderMiddle(evt.oldIndex, evt.newIndex);
      }
    });
  }

  reorderMiddle(oldIdx, newIdx) {
    const middleInstances = this.state.modules.filter((i) => i.locked == null);
    const [moved] = middleInstances.splice(oldIdx, 1);
    middleInstances.splice(newIdx, 0, moved);

    const top = this.state.modules.find((i) => i.locked === "top");
    const bottom = this.state.modules.find((i) => i.locked === "bottom");
    this.state.modules = [top, ...middleInstances, bottom].filter(Boolean);

    this.persistState();
    // Heading levels are position-derived (CLAUDE.md §16). Reordering shifts
    // which instance owns h1/h2/etc; re-push to every loaded iframe so the
    // tags update without a full rebuild.
    this.pushAllContent();
  }

  pushAllContent() {
    for (const [id, ref] of this.instanceEls) {
      if (ref.ready) this.pushContent(id);
    }
  }

  // ---- add / delete ---------------------------------------------------

  addModule(module) {
    const inst = this.makeInstance(module, null);
    const bottomIdx = this.state.modules.findIndex((i) => i.locked === "bottom");
    if (bottomIdx >= 0) {
      this.state.modules.splice(bottomIdx, 0, inst);
    } else {
      this.state.modules.push(inst);
    }
    this.persistState();
    this.renderCanvas();
    this.selectInstance(inst.id);
    this.scrollInstanceIntoView(inst.id);
  }

  deleteInstance(id) {
    const inst = this.state.modules.find((i) => i.id === id);
    if (!inst || inst.locked) return;
    this.state.modules = this.state.modules.filter((i) => i.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.persistState();
    this.renderCanvas();
    this.renderInspector();
  }

  scrollInstanceIntoView(id) {
    const ref = this.instanceEls.get(id);
    if (!ref) return;
    ref.rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---- selection / inspector ------------------------------------------

  selectInstance(id) {
    this.selectedId = id;
    for (const ref of this.instanceEls.values()) {
      ref.rootEl.classList.toggle("is-selected", ref.rootEl.dataset.instanceId === id);
    }
    this.renderInspector();
  }

  deselect() {
    this.selectedId = null;
    for (const ref of this.instanceEls.values()) {
      ref.rootEl.classList.remove("is-selected");
    }
    this.renderInspector();
  }

  renderInspector() {
    const id = this.selectedId;
    if (!id) {
      this.elInspector.dataset.empty = "true";
      this.elInspectorPane.hidden = true;
      this.elInspectorEmpty.style.display = "";
      return;
    }
    const inst = this.state.modules.find((i) => i.id === id);
    const module = inst && this.moduleBySlug.get(inst.moduleSlug);
    if (!inst || !module) {
      this.deselect();
      return;
    }

    this.elInspector.dataset.empty = "false";
    this.elInspectorEmpty.style.display = "none";
    this.elInspectorPane.hidden = false;

    document.getElementById("bld-insp-title").textContent = module.name;
    document.getElementById("bld-insp-slug").textContent = module.slug;

    const lockedBox = document.getElementById("bld-insp-locked");
    lockedBox.hidden = !inst.locked;

    const deleteBtn = document.getElementById("bld-insp-delete");
    deleteBtn.hidden = !!inst.locked;

    this.renderInspectorState(inst, module);
    this.renderInspectorFields(inst, module);
    this.updateClearButton(inst);
  }

  renderInspectorState(inst, module) {
    const select = document.getElementById("bld-insp-state");
    select.innerHTML = "";
    for (const s of (module.states || [])) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === inst.stateId) opt.selected = true;
      select.appendChild(opt);
    }
    select.onchange = () => {
      inst.stateId = select.value;
      this.persistState();
      // Reload iframe with new state. Cachebuster forces nav even if URL
      // would otherwise look identical.
      const ref = this.instanceEls.get(inst.id);
      if (!ref) return;
      const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      ref.ready = false;
      ref.iframe.src = `/${module.previewPath}?entry=${encodeURIComponent(module.slug)}&state=${encodeURIComponent(inst.stateId)}&_=${bust}&iid=${encodeURIComponent(inst.id)}`;
      // Chrome label
      const chip = ref.rootEl.querySelector("[data-state-chip]");
      if (chip) chip.textContent = module.states.find((s) => s.id === inst.stateId)?.label || inst.stateId;
    };
  }

  renderInspectorFields(inst, module) {
    const fieldsEl = document.getElementById("bld-insp-fields");
    fieldsEl.innerHTML = "";

    const slots = module.slots || [];
    if (slots.length === 0) {
      const note = document.createElement("div");
      note.className = "bld-inspector__empty-fields";
      note.textContent = "This module has no editable slots.";
      fieldsEl.appendChild(note);
      return;
    }

    for (const slot of slots) {
      const made = slot.type === "image"
        ? this.makeImageField(slot, inst)
        : this.makeTextField(slot, inst);
      fieldsEl.appendChild(made);
    }
  }

  makeTextField(slot, inst) {
    /* Reuse sb-field classes so the inspector inherits the sandbox's form
       styling. Behavior is identical: a typed value becomes an override; an
       empty field reverts to the state's default. */
    const wrap = document.createElement("div");
    wrap.className = "sb-field sb-field--text";

    const label = document.createElement("label");
    label.className = "sb-field__label";
    label.textContent = slot.label;
    label.htmlFor = `bld-field-${inst.id}-${slot.id}`;

    /* Multiline slots (anything containing a newline in its default, or
       explicitly hinted via "(HTML)" / "(one per line)" in the label) get a
       textarea; everything else gets an input. */
    const isMulti = (slot.default && slot.default.includes("\n"))
      || /\(.*per line.*\)/i.test(slot.label)
      || /\(HTML\)/i.test(slot.label);

    const input = document.createElement(isMulti ? "textarea" : "input");
    input.className = "sb-field__input";
    if (!isMulti) input.type = "text";
    else input.rows = 4;
    input.id = `bld-field-${inst.id}-${slot.id}`;
    input.value = inst.overrides[slot.id] ?? "";
    input.placeholder = slot.default ?? "";

    input.addEventListener("input", () => {
      if (input.value === "") delete inst.overrides[slot.id];
      else inst.overrides[slot.id] = input.value;
      this.persistState();
      this.pushContent(inst.id);
      this.updateClearButton(inst);
    });

    wrap.appendChild(label);
    if (slot.hint) {
      const hint = document.createElement("span");
      hint.className = "sb-field__hint";
      hint.textContent = slot.hint;
      wrap.appendChild(hint);
    }
    wrap.appendChild(input);
    return wrap;
  }

  makeImageField(slot, inst) {
    const wrap = document.createElement("div");
    wrap.className = "sb-field sb-field--image";

    const label = document.createElement("label");
    label.className = "sb-field__label";
    label.textContent = slot.label;

    const thumb = document.createElement("div");
    thumb.className = "sb-field__thumb";
    const updateThumb = (value) => {
      thumb.innerHTML = "";
      if (value) {
        const img = document.createElement("img");
        img.src = value;
        img.alt = "";
        thumb.appendChild(img);
      }
    };
    updateThumb(inst.overrides[slot.id]);

    const controls = document.createElement("div");
    controls.className = "sb-field__file-controls";

    const row = document.createElement("div");
    row.className = "sb-field__file-row";

    const fileBtn = document.createElement("button");
    fileBtn.type = "button";
    fileBtn.className = "sb-field__file-btn";
    fileBtn.textContent = "Choose file…";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "sb-field__file-btn";
    clearBtn.textContent = "Clear";

    const name = document.createElement("span");
    name.className = "sb-field__file-name";
    name.textContent = inst.overrides[slot.id] ? "image set" : "no file";

    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      // Hard cap on base64 size — the whole builder state is persisted to
      // localStorage as JSON, and a single oversize image silently breaks
      // the persist on every keystroke after.
      if (file.size > 512 * 1024) {
        name.textContent = "image too large (>512 KB)";
        fileInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        name.textContent = file.name;
        updateThumb(dataUrl);
        inst.overrides[slot.id] = dataUrl;
        this.persistState();
        this.pushContent(inst.id);
        this.updateClearButton(inst);
      };
      reader.readAsDataURL(file);
    });
    clearBtn.addEventListener("click", () => {
      fileInput.value = "";
      name.textContent = "no file";
      updateThumb("");
      delete inst.overrides[slot.id];
      this.persistState();
      this.pushContent(inst.id);
      this.updateClearButton(inst);
    });

    row.appendChild(fileBtn);
    row.appendChild(clearBtn);
    row.appendChild(name);
    controls.appendChild(row);
    controls.appendChild(fileInput);

    wrap.appendChild(label);
    if (slot.hint) {
      const hint = document.createElement("span");
      hint.className = "sb-field__hint";
      hint.textContent = slot.hint;
      wrap.appendChild(hint);
    }
    wrap.appendChild(thumb);
    wrap.appendChild(controls);
    return wrap;
  }

  updateClearButton(inst) {
    const btn = document.getElementById("bld-insp-clear");
    if (!btn) return;
    btn.disabled = Object.keys(inst.overrides || {}).length === 0;
  }

  // ---- iframe content push --------------------------------------------

  wireIframeMessages() {
    // Bound to this app's AbortController so teardown() removes it. Without
    // the signal, every router nav into Builder would leave a stale handler
    // subscribed to window's `message` event for the rest of the session.
    window.addEventListener("message", (e) => {
      // Only accept ready signals from same-origin iframes we own. Without
      // this check a cross-origin page could spoof loom:ready and observe
      // (and rewrite) the builder's content payload.
      if (e.origin !== location.origin) return;
      if (!e.data) return;
      if (e.data.type !== "loom:ready") return;
      /* preview.html doesn't echo the instance id; we match by slug + walk
         the instance map to find any unready iframes for that slug. The
         iid query-string lookup is more deterministic when many instances
         share a slug — we read it back from the iframe's URL. */
      for (const [id, ref] of this.instanceEls) {
        if (ref.ready) continue;
        if (e.source !== ref.iframe.contentWindow) continue;
        try {
          const url = new URL(ref.iframe.src);
          if (url.searchParams.get("iid") === id) {
            ref.ready = true;
            this.pushContent(id);
          }
        } catch (_) { /* ignore malformed */ }
      }
    }, { signal: this.abortCtrl.signal });
  }

  pushContent(id) {
    const ref = this.instanceEls.get(id);
    if (!ref || !ref.ready) return;
    const inst = this.state.modules.find((i) => i.id === id);
    if (!inst) return;
    // Merge user overrides with system-assigned structural keys (heading
    // level computed from position). CLAUDE.md §16 — backend correctness
    // is derived, not designer-input.
    const headingLevel = this.headingLevelFor(id);
    const values = Object.assign({}, inst.overrides || {});
    if (headingLevel != null) values["_heading-level"] = headingLevel;
    try {
      ref.iframe.contentWindow?.postMessage(
        { type: "loom:content", values: values },
        location.origin
      );
    } catch (_) { /* iframe not ready, will retry on next ready msg */ }
  }

  /* Walks the current state.modules in order. For each, looks up the
     module's manifest entry to find any `headings: [{ slot, role }]`
     declarations and steps the level counter. Returns the heading level
     for the requested instance id, or null if that instance doesn't have a
     primary heading. */
  headingLevelFor(id) {
    let primaryCount = 0;
    for (const inst of this.state.modules) {
      const module = this.moduleBySlug.get(inst.moduleSlug);
      const headings = (module && module.headings) || [];
      const primary = headings.find((h) => h.role === "primary");
      if (!primary) continue;
      primaryCount += 1;
      if (inst.id === id) return Math.min(6, primaryCount);
    }
    return null;
  }

  // ---- toolbar / inspector chrome -------------------------------------

  wireToolbar() {
    document.getElementById("bld-reset").addEventListener("click", () => {
      if (!confirm("Reset the canvas to nav + footer only? Your unsaved edits will be lost.")) return;
      this.resetState();
    });
    document.getElementById("bld-finalize").addEventListener("click", () => {
      const middle = this.state.modules.filter((i) => i.locked == null);
      if (middle.length === 0) {
        if (!confirm("Your page only has nav + footer. Finalize anyway?")) return;
      }
      this.openFinalizeModal();
    });
  }

  wireInspectorChrome() {
    document.getElementById("bld-insp-close").addEventListener("click", () => this.deselect());
    document.getElementById("bld-insp-delete").addEventListener("click", () => {
      if (!this.selectedId) return;
      this.deleteInstance(this.selectedId);
    });
    document.getElementById("bld-insp-clear").addEventListener("click", () => {
      const id = this.selectedId;
      if (!id) return;
      const inst = this.state.modules.find((i) => i.id === id);
      if (!inst) return;
      inst.overrides = {};
      this.persistState();
      this.pushContent(id);
      this.renderInspector();
    });
  }

  // ---- finalize flow --------------------------------------------------

  wireFinalize() {
    const modal = document.getElementById("bld-modal");
    const promptModal = document.getElementById("bld-prompt-modal");

    modal.addEventListener("click", (e) => {
      if (e.target.dataset.modalDismiss !== undefined && e.target.dataset.modalDismiss === "") {
        this.closeFinalizeModal();
      }
    });
    promptModal.addEventListener("click", (e) => {
      if (e.target.dataset.modalDismiss === "prompt") {
        this.closePromptModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!promptModal.hidden) this.closePromptModal();
        else if (!modal.hidden) this.closeFinalizeModal();
      }
    }, { signal: this.abortCtrl.signal });

    // Live char counters
    this.wireCounter("bld-modal-title-tag", "title", 60);
    this.wireCounter("bld-modal-description", "description", 160);

    document.getElementById("bld-modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFinalizeSubmit();
    });

    document.getElementById("bld-prompt-back").addEventListener("click", () => {
      this.closePromptModal();
      this.openFinalizeModal(false); // re-open without resetting fields
    });
    document.getElementById("bld-prompt-copy").addEventListener("click", () => this.copyPrompt());

    // Auto-fill display name → slug
    const nameEl = document.getElementById("bld-modal-name");
    const slugEl = document.getElementById("bld-modal-slug");
    let slugTouched = false;
    slugEl.addEventListener("input", () => { slugTouched = true; });
    nameEl.addEventListener("input", () => {
      if (slugTouched) return;
      slugEl.value = nameEl.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    });
  }

  wireCounter(inputId, counterKey, target) {
    const input = document.getElementById(inputId);
    const counter = document.querySelector(`[data-counter-for="${counterKey}"]`);
    if (!input || !counter) return;
    const update = () => {
      const len = input.value.length;
      counter.textContent = `${len}/${target}`;
      counter.dataset.over = len > target ? "true" : "false";
    };
    input.addEventListener("input", update);
    update();
  }

  openFinalizeModal(resetFields = true) {
    const modal = document.getElementById("bld-modal");
    modal.hidden = false;
    if (resetFields) {
      // Soft reset — preserve fields between attempts unless the user starts fresh
      // (handled by Back from prompt modal).
    }
    setTimeout(() => document.getElementById("bld-modal-name")?.focus(), 30);
  }

  closeFinalizeModal() {
    document.getElementById("bld-modal").hidden = true;
  }

  closePromptModal() {
    document.getElementById("bld-prompt-modal").hidden = true;
  }

  handleFinalizeSubmit() {
    const form = document.getElementById("bld-modal-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    const seo = {
      name: data.get("name").trim(),
      slug: data.get("slug").trim(),
      pageType: data.get("pageType"),
      title: data.get("title").trim(),
      description: data.get("description").trim(),
      canonical: data.get("canonical")?.trim() || null,
      ogImage: data.get("ogImage")?.trim() || null
    };

    const payload = this.buildPayload(seo);
    const prompt = this.buildPrompt(payload);

    document.getElementById("bld-prompt-text").textContent = prompt;
    this.closeFinalizeModal();
    document.getElementById("bld-prompt-modal").hidden = false;
  }

  buildPayload(seo) {
    /* The payload omits any image override that's a data: URL (base64-uploaded
       file) since CC can't write binary blobs back to disk via a paste. The
       prompt notes which slots had base64 data and asks the user to provide
       real URLs or files separately. We still record the slot IDs so CC
       knows where the images go. */
    const modules = this.state.modules.map((inst) => {
      const module = this.moduleBySlug.get(inst.moduleSlug);
      const overrides = {};
      const dataUrlSlots = [];
      for (const [k, v] of Object.entries(inst.overrides || {})) {
        if (typeof v === "string" && v.startsWith("data:")) {
          dataUrlSlots.push(k);
          // Keep a placeholder so the slot is clearly tracked
          overrides[k] = `%LOCAL_${k.toUpperCase()}%`;
        } else {
          overrides[k] = v;
        }
      }
      return {
        moduleSlug: inst.moduleSlug,
        moduleName: module?.name || inst.moduleSlug,
        stateId: inst.stateId,
        locked: inst.locked || null,
        overrides,
        dataUrlSlots: dataUrlSlots.length ? dataUrlSlots : undefined
      };
    });

    return {
      schema: "loomling.page-builder/v1",
      seo,
      modules,
      generatedAt: new Date().toISOString()
    };
  }

  buildPrompt(payload) {
    const lines = [];
    lines.push("Build a new page template from this Page Builder payload, following `system/page-builder.md` and `system/seo.md`. This is a **declarative composition** per ADR 0004 — the template references modules at runtime instead of inlining their HTML, so future module edits propagate automatically.");
    lines.push("");
    lines.push("Concretely:");
    lines.push(`1. Create \`src/templates/${payload.seo.slug}/\` containing exactly three files: \`composition.json\`, \`${payload.seo.slug}.css\`, \`preview.html\`. Do NOT create a \`${payload.seo.slug}.html\` body fragment — composed templates don't have one.`);
    lines.push("2. **composition.json** — copy the payload's `seo` and `modules` arrays verbatim into a new JSON document with `schema: \"loomling.template-composition/v1\"`, plus `templateSlug`, `composedAt`, and `lastUpdatedAt` fields (both ISO timestamps = now).");
    lines.push("3. **preview.html** — a small renderer that fetches `composition.json` at load, creates one iframe per module pointing at `../../modules/<slug>/preview.html?state=<state>&iid=<unique>`, syncs each iframe's height to its content body, and (on receiving `loom:ready` from each) postMessages the recorded overrides as `{ type: \"loom:content\", values: {...} }`. Use [test-page/preview.html](src/templates/test-page/preview.html) as the reference implementation — copy its `<script>` block verbatim, only changing the SEO head + `data-loom-template` slug. SEO head fields (title, description, canonical, OG, Twitter, JSON-LD per pageType) are filled from `composition.seo`; blank canonical/ogImage become `%UPPER_SNAKE%` placeholders. The SEO head IS still hardcoded in preview.html (crawlers don't run JS); composition.json mirrors it for re-finalize purposes.");
    lines.push("4. **<slug>.css** — composition-only styles, usually just `background` and `color` on the `[data-loom-template]` root. Modules carry their own layout/visual CSS. Reference [test-page/test-page.css](src/templates/test-page/test-page.css) for the minimal shape.");
    lines.push("5. Run the heading-level audit: load each referenced module's `preview.html` mentally (or programmatically) and verify the composed page yields exactly one `<h1>` with no skips. If a module's heading level conflicts with the composition, raise the issue before fixing.");
    lines.push("6. Append a manifest entry to `library/manifest.json`: category `templates`, status `draft`, one `default` state, slots `[]`, **`filePath` points at `composition.json`** (not a body fragment).");
    lines.push("7. Report back with the file paths created + surface any `dataUrlSlots[]` so the user provides real URLs.");
    lines.push("");
    lines.push("Payload:");
    lines.push("```json");
    lines.push(JSON.stringify(payload, null, 2));
    lines.push("```");
    return lines.join("\n");
  }

  copyPrompt() {
    const text = document.getElementById("bld-prompt-text").textContent;
    const btn = document.getElementById("bld-prompt-copy");
    const tryCopy = async () => {
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
    };
    tryCopy().then((ok) => {
      const original = btn.textContent;
      btn.textContent = ok ? "Copied ✓" : "Copy failed";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1600);
    });
  }
}

function escape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

/* Reject any manifest path that doesn't match the on-disk convention.
   See library.js for the rationale + canonical regex. */
function isSafeManifestPath(p) {
  if (typeof p !== "string" || !p) return false;
  if (p.includes("..") || p.startsWith("/") || /[\\:]/.test(p)) return false;
  return /^src\/(components|modules|templates)\/[a-z0-9][a-z0-9-]*\/(_approved\/)?[a-zA-Z0-9._-]+\.(html|json|css|js)$/.test(p);
}
