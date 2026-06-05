/* ============================================================
   sandbox.js — Loomling sandbox detail view
   ------------------------------------------------------------
   Reads ?entry=<slug> from the URL, hydrates the entry from
   library/manifest.json, and provides state + breakpoint
   controls for inspecting the piece in isolation.
   ============================================================ */

(async function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get("entry");
  if (!slug) {
    return showError("Sandbox needs an entry: open one from the Loom.");
  }

  const manifest = await loadManifest();
  if (!manifest) return;

  setProjectName(manifest.project?.name);

  const entry = (manifest.entries || []).find((e) => e.slug === slug);
  if (!entry) {
    return showError(`No manifest entry with slug "${slug}".`);
  }

  hydrate(entry, manifest);
})();

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
  const el = document.getElementById("sb-error");
  el.textContent = msg;
  el.hidden = false;
  document.getElementById("sb-piece").hidden = true;
}

function hydrate(entry, manifest) {
  // Removed elements have no source files; show a friendly message instead
  // of a broken iframe. The full archive view lives at Settings → Archive
  // (ADR 0010).
  if (entry.status === "removed") {
    return showError(
      `"${entry.name}" has been removed from this project. Its source files are gone. ` +
      `The manifest entry is kept as history — see Settings → Archive for details.`
    );
  }
  // Reject hostile or malformed entries before they reach iframe.src / fetch().
  if (!isSafeManifestPath(entry.previewPath) || !isSafeManifestPath(entry.filePath)) {
    return showError(`Entry "${entry.slug}" has an unsafe file path. Refusing to render.`);
  }
  if (!Array.isArray(entry.states) || entry.states.length === 0) {
    return showError(`Entry "${entry.slug}" has no states declared. Refusing to render.`);
  }
  if (entry.status !== "draft" && entry.status !== "approved") {
    return showError(`Entry "${entry.slug}" has an invalid status. Refusing to render.`);
  }

  document.getElementById("sb-piece").hidden = false;

  document.title = `${entry.name} — Sandbox`;

  // Point the back link at wherever this entry actually lives. Primitives
  // live on the System page; everything else lives on the Library page.
  wireBackLink(entry);

  document.getElementById("sb-title").textContent = entry.name;
  document.getElementById("sb-slug").textContent = entry.slug;
  document.getElementById("sb-category").textContent = categoryLabel(entry.category);

  wireCopyLink(entry);

  const badge = document.getElementById("sb-badge");
  badge.textContent = entry.status;
  badge.classList.add(`lib-badge--${entry.status}`);

  document.getElementById("sb-file-path").textContent = entry.filePath;
  document.getElementById("sb-preview-path").textContent = entry.previewPath;
  document.getElementById("sb-added").textContent = entry.addedAt;
  document.getElementById("sb-state-list").textContent =
    entry.states.map((s) => s.id).join(", ");
  document.getElementById("sb-notes").textContent = entry.notes || "—";

  const iframe = document.getElementById("sb-iframe");
  const measure = document.getElementById("sb-measure");
  const viewport = document.getElementById("sb-viewport");
  const scaler = document.getElementById("sb-scaler");
  const stageFrame = document.getElementById("sb-stage-frame");
  const measureScale = document.getElementById("sb-measure-scale");

  // Track design width (the breakpoint's intrinsic px) and the current scale
  // ratio applied to fit it inside the available stage. In Fluid mode both
  // are null/1; the scaler is a transparent pass-through.
  let currentDesignWidth = null;
  let currentRatio = 1;
  // Padding inside .sb-stage__frame — kept in sync with library.css.
  const STAGE_PADDING = 24;

  // ---- State pills ----------------------------------------
  let currentState = entry.states[0].id;
  // Version routing: "draft" loads the working preview.html; "approved" loads
  // the snapshot at <slug-folder>/_approved/preview.html. The latter only
  // exists when CC has edited the element from approved status — detected by
  // a fetch probe below. Default is draft.
  let currentVersion = "draft";
  let hasApprovedSnapshot = false;

  const approvedPreviewPath = (() => {
    const p = entry.previewPath;
    const idx = p.lastIndexOf("/");
    if (idx < 0) return null;
    return p.slice(0, idx) + "/_approved/" + p.slice(idx + 1);
  })();

  const setIframeSrc = (state) => {
    // Cachebuster prevents Chrome from deduplicating iframe.src changes
    // when only the query string differs (see library.js for context).
    const bust = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const path = currentVersion === "approved" && approvedPreviewPath
      ? approvedPreviewPath
      : entry.previewPath;
    iframe.src = `/${path}?entry=${encodeURIComponent(entry.slug)}&state=${encodeURIComponent(state)}&_=${bust}`;
  };

  const statesEl = document.getElementById("sb-states");
  entry.states.forEach((state, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sb-pill" + (i === 0 ? " is-active" : "");
    btn.dataset.state = state.id;
    btn.textContent = state.label;
    btn.addEventListener("click", () => {
      statesEl.querySelectorAll(".sb-pill").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentState = state.id;
      // Content edits persist across state changes. Clearing a field reverts
      // it to the state's natural default.
      setIframeSrc(currentState);
    });
    statesEl.appendChild(btn);
  });

  // ---- Breakpoint pills -----------------------------------
  const breakpoints = collectBreakpoints();
  const bpsEl = document.getElementById("sb-breakpoints");
  let currentBp = null; // null = fluid

  const measurePrefix = document.getElementById("sb-measure-prefix");
  const measureInput = document.getElementById("sb-measure-input");

  const updateMeasure = () => {
    const mode = viewport.dataset.mode || "fluid";
    // Reflect mode onto the measure pill (cursor + interactivity)
    measure.dataset.mode = mode;
    if (mode === "fluid") {
      measurePrefix.textContent = "Fluid ·";
      if (document.activeElement !== measureInput) {
        // When the user has pinned a design width via type-input, show that
        // value; otherwise track the live viewport width (drag-resize case).
        const px = currentDesignWidth != null
          ? currentDesignWidth
          : Math.round(viewport.getBoundingClientRect().width);
        measureInput.value = String(px);
      }
    } else {
      // Fixed mode: input shows the DESIGN width (the breakpoint's intrinsic
      // px), not the scaled visual width. The input stays editable —
      // focusing it switches the breakpoint back to Fluid (see focus handler
      // below) so the user can drop into any breakpoint, click the px, and
      // type a custom width without an extra Fluid click.
      measurePrefix.textContent = `${currentBp ? currentBp.label : "?"} ·`;
      if (document.activeElement !== measureInput && currentDesignWidth != null) {
        measureInput.value = String(currentDesignWidth);
      }
    }
    // Scale chip is mode-agnostic: it surfaces how much the preview is
    // shrunk when the design width exceeds available stage width
    // (e.g. `LG · 1024 px · 67%` or `Fluid · 1500 px · 64%`).
    measureScale.textContent = currentRatio < 0.999
      ? ` · ${Math.round(currentRatio * 100)}%`
      : "";
  };

  const applyMeasureInput = () => {
    const raw = measureInput.value.replace(/[^0-9]/g, "");
    const px = parseInt(raw, 10);
    if (!Number.isFinite(px) || px <= 0) {
      // Bad input: blur to trigger the revert handler.
      measureInput.blur();
      return;
    }
    const clamped = Math.max(80, Math.min(px, 4000));
    // Enter commits the typed value as a Fluid-pinned design width. If the
    // user was editing while a fixed breakpoint was active, the commit flips
    // the active breakpoint to Fluid — typing a px implies leaving the
    // fixed breakpoint behind. Drag-resize is disabled while pinned; click
    // the Fluid pill to release the pin and resume drag-resize.
    if (viewport.dataset.mode === "fixed") {
      currentBp = null;
      setActiveBp("fluid");
      viewport.dataset.mode = "fluid";
    }
    currentDesignWidth = clamped;
    viewport.dataset.pinned = "true";
    scaler.style.width = `${clamped}px`;
    applyScaling();
    measureInput.blur();
    updateMeasure();
  };

  measureInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyMeasureInput();
    } else if (e.key === "Escape") {
      e.preventDefault();
      updateMeasure();
      measureInput.blur();
    }
  });

  measureInput.addEventListener("blur", () => {
    // Revert any unsubmitted edits.
    updateMeasure();
  });

  // Focusing the input selects the current value so the user can type-replace.
  // Mode does NOT change on focus — staying in the fixed breakpoint until
  // Enter commits the new value (or Esc reverts). Select-all is deferred so
  // it runs after the browser positions the caret from the mousedown.
  measureInput.addEventListener("focus", () => {
    setTimeout(() => {
      if (document.activeElement === measureInput) measureInput.select();
    }, 0);
  });

  // Clicking the pill chrome (prefix / suffix / scale chip) focuses the input.
  measure.addEventListener("click", (e) => {
    if (e.target !== measureInput) {
      measureInput.focus();
    }
  });

  // Track viewport size changes (clicks, drag-resize, window resize) and
  // keep the measure label in sync live.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => updateMeasure()).observe(viewport);
    // Recompute the fit-to-stage scaling whenever the stage frame's available
    // width changes (window resize, layout shifts).
    new ResizeObserver(() => {
      if (currentDesignWidth != null) {
        applyScaling();
        updateMeasure();
      }
    }).observe(stageFrame);
  }

  const applyBreakpoint = (bp) => {
    // Any breakpoint click releases a prior type-input pin (drag-resize and
    // automatic stage-tracking come back on Fluid; a fixed pill takes over).
    delete viewport.dataset.pinned;
    if (!bp) {
      // Fluid mode: clear pinned widths, allow drag-resize.
      currentDesignWidth = null;
      currentRatio = 1;
      viewport.style.maxWidth = "";
      viewport.style.width = "100%";
      viewport.style.height = "";
      viewport.dataset.mode = "fluid";
      scaler.style.width = "";
      scaler.style.transform = "";
    } else {
      // Fixed mode: render the iframe at the breakpoint's design width and
      // scale the scaler down if the stage isn't wide enough to fit it.
      currentDesignWidth = parseInt(String(bp.value), 10);
      viewport.dataset.mode = "fixed";
      scaler.style.width = `${currentDesignWidth}px`;
      applyScaling();
    }
    updateMeasure();
  };

  const applyScaling = () => {
    if (currentDesignWidth == null) return;
    // Stage interior = the stage frame minus its horizontal padding. The
    // viewport must fit in this space; if the design width is larger we
    // shrink the visual via transform: scale on the scaler.
    const stageInner = Math.max(120, stageFrame.clientWidth - STAGE_PADDING * 2);
    const ratio = Math.min(1, stageInner / currentDesignWidth);
    currentRatio = ratio;
    const visualWidth = Math.floor(currentDesignWidth * ratio);
    viewport.style.width = `${visualWidth}px`;
    viewport.style.maxWidth = `${currentDesignWidth}px`;
    scaler.style.transform = ratio < 0.999 ? `scale(${ratio})` : "";
    syncViewportHeight();
  };

  const syncViewportHeight = () => {
    if (currentDesignWidth == null) {
      viewport.style.height = "";
      return;
    }
    // Match the viewport's visual height to the scaled iframe so the layout
    // below it doesn't reserve the full unscaled height (CSS transforms
    // don't shrink the layout box; we have to do it on the wrapper).
    const iframeH = parseFloat(iframe.style.height) || 80;
    viewport.style.height = `${Math.ceil(iframeH * currentRatio)}px`;
  };

  const setActiveBp = (key) => {
    bpsEl.querySelectorAll(".sb-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.bp === key);
    });
  };

  // Fluid (default)
  {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sb-pill is-active";
    btn.dataset.bp = "fluid";
    btn.textContent = "Fluid";
    btn.addEventListener("click", () => {
      currentBp = null;
      applyBreakpoint(null);
      setActiveBp("fluid");
    });
    bpsEl.appendChild(btn);
  }

  for (const bp of breakpoints) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sb-pill";
    btn.dataset.bp = bp.token;
    btn.textContent = bp.label;
    btn.title = `${bp.token} · ${bp.value}`;
    btn.addEventListener("click", () => {
      currentBp = bp;
      applyBreakpoint(bp);
      setActiveBp(bp.token);
    });
    bpsEl.appendChild(btn);
  }

  // ---- Auto-size iframe to its content height -------------
  // The iframe's preview.html sizes to its own content (no 100vh).
  // We observe its body and grow the iframe to match — so the preview
  // box has no internal vertical scroll.
  let contentObserver = null;
  const syncIframeHeight = () => {
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;
    // Use body.scrollHeight ONLY. documentElement.scrollHeight is at least
    // the iframe's viewport height — once we've set iframe.style.height to a
    // tall value (e.g. after the user widened a narrow breakpoint that
    // forced content to stack), html.scrollHeight stays inflated and the
    // iframe never shrinks back. The piece's body is auto-sized to content
    // (the "no vh units in preview.html" rule enforces this), so body
    // honestly tracks content height in both directions.
    const h = Math.max(doc.body.scrollHeight, 80);
    iframe.style.height = `${h}px`;
    // In fixed mode the viewport's visual height has to follow the scaled
    // iframe so the page below doesn't gap or overlap.
    syncViewportHeight();
  };

  iframe.addEventListener("load", () => {
    // Run once after load, then attach a fresh observer to the new body.
    syncIframeHeight();
    if (contentObserver) {
      try { contentObserver.disconnect(); } catch (_) {}
    }
    const doc = iframe.contentDocument;
    if (!doc || !doc.body || typeof ResizeObserver === "undefined") return;
    contentObserver = new ResizeObserver(() => syncIframeHeight());
    contentObserver.observe(doc.body);
  });

  // ---- Action buttons (Approve, Discard) ------------------
  // Approve is shown for any draft entry; clicking opens a CC-prompt modal.
  // Discard is shown only when a _approved/ snapshot exists (detected below).
  if (entry.status === "draft") {
    document.getElementById("sb-approve-btn").hidden = false;
    wireApproveModal(entry);
  }

  // Design check (CLAUDE.md §22) is advisory + read-only — available on any
  // open element, draft or approved. It only ever produces a CC prompt.
  document.getElementById("sb-designcheck-btn").hidden = false;
  wireDesignCheckModal(entry);

  // Critique (CLAUDE.md §23) — advisory, read-only second opinion. Also
  // available on any open element; only ever produces a CC prompt.
  document.getElementById("sb-critique-btn").hidden = false;
  wireCritiqueModal(entry);

  // ---- Snapshot detection + version pill wiring -----------
  // Probe for _approved/preview.html alongside the working preview. If it
  // exists, this element was edited from approved status — expose the
  // Draft/Approved toggle, the snapshot chip, the Discard button, and the
  // pending-changes alert with the entry's changeSummary text.
  (async function detectSnapshot() {
    if (!approvedPreviewPath || !isSafeManifestPath(approvedPreviewPath)) return;
    try {
      const res = await fetch("/" + approvedPreviewPath, { cache: "no-store", method: "GET" });
      if (!res.ok) return;
      hasApprovedSnapshot = true;
      document.getElementById("sb-version-group").hidden = false;
      document.getElementById("sb-snapshot-chip").hidden = false;
      document.getElementById("sb-discard-btn").hidden = false;
      wireVersionPills();
      wireDiscardModal(entry);

      // Pending-changes alert. Hidden if no changeSummary on the manifest
      // entry — the snapshot exists but CC didn't record what changed.
      if (entry.changeSummary) {
        const alertEl = document.getElementById("sb-pending-alert");
        const summaryEl = document.getElementById("sb-pending-summary");
        if (alertEl && summaryEl) {
          summaryEl.textContent = entry.changeSummary;
          alertEl.hidden = false;
        }
      }

      // Replace the chip's static text with a consumer count — more
      // actionable than the file-path detail.
      const count = await countConsumersForEntry(entry, manifest);
      const chipText = document.getElementById("sb-snapshot-chip-text");
      if (chipText) {
        chipText.textContent = count === 0
          ? "Not used yet"
          : count === 1
            ? "Used in 1 place"
            : `Used in ${count} places`;
      }
    } catch (_) {
      // Network or CORS issue — silently leave snapshot affordances hidden.
    }
  })();

  function wireVersionPills() {
    const pills = document.querySelectorAll("#sb-versions .sb-pill");
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        if (pill.dataset.version === currentVersion) return;
        pills.forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");
        currentVersion = pill.dataset.version;
        setIframeSrc(currentState);
      });
    });
  }

  function wireDiscardModal(entryArg) {
    wirePromptModal({
      buttonId:  "sb-discard-btn",
      modalId:   "sb-discard-modal",
      promptId:  "sb-discard-prompt",
      copyId:    "sb-discard-copy",
      dismissAttr: "data-discard-dismiss",
      buildPrompt: () => buildDiscardPrompt(entryArg || entry)
    });
  }

  function wireApproveModal(entryArg) {
    wirePromptModal({
      buttonId:  "sb-approve-btn",
      modalId:   "sb-approve-modal",
      promptId:  "sb-approve-prompt",
      copyId:    "sb-approve-copy",
      dismissAttr: "data-approve-dismiss",
      buildPrompt: () => buildApprovePrompt(entryArg || entry)
    });
  }

  function wireDesignCheckModal(entryArg) {
    wirePromptModal({
      buttonId:  "sb-designcheck-btn",
      modalId:   "sb-designcheck-modal",
      promptId:  "sb-designcheck-prompt",
      copyId:    "sb-designcheck-copy",
      dismissAttr: "data-designcheck-dismiss",
      // currentState is read live at click time, so the prompt leads with the
      // state you're actually viewing.
      buildPrompt: () => buildDesignCheckPrompt(entryArg || entry, currentState)
    });
  }

  function wireCritiqueModal(entryArg) {
    wirePromptModal({
      buttonId:  "sb-critique-btn",
      modalId:   "sb-critique-modal",
      promptId:  "sb-critique-prompt",
      copyId:    "sb-critique-copy",
      dismissAttr: "data-critique-dismiss",
      buildPrompt: () => buildCritiquePrompt(entryArg || entry, currentState)
    });
  }

  /* Shared modal wiring used by Discard + Approve. Both open on button
     click, render a generated CC prompt, dismiss via backdrop/Cancel/ESC,
     and copy the prompt to clipboard with a transient "Copied ✓" label. */
  function wirePromptModal(cfg) {
    const btn = document.getElementById(cfg.buttonId);
    const modal = document.getElementById(cfg.modalId);
    const promptEl = document.getElementById(cfg.promptId);
    const copyBtn = document.getElementById(cfg.copyId);

    const open = () => {
      promptEl.textContent = cfg.buildPrompt();
      modal.hidden = false;
    };
    const close = () => { modal.hidden = true; };

    btn.addEventListener("click", open);

    modal.addEventListener("click", (e) => {
      if (e.target.hasAttribute(cfg.dismissAttr)) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) close();
    });

    copyBtn.addEventListener("click", async () => {
      const text = promptEl.textContent;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand("copy"); } catch (_) {}
        ta.remove();
      }
      const original = copyBtn.textContent;
      copyBtn.textContent = ok ? "Copied ✓" : "Copy failed";
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.disabled = false;
      }, 1600);
    });
  }

  // ---- Initial load ---------------------------------------
  applyBreakpoint(null);
  setIframeSrc(currentState);

  // ---- Listen for iframe ready, push content overrides ----
  window.addEventListener("message", (e) => {
    // Only accept messages from same-origin iframes (which is where the
    // module/template previews live). A cross-origin postMessage could
    // otherwise spoof a ready signal and trick us into pushing content.
    if (e.origin !== location.origin) return;
    if (e.source !== iframe.contentWindow) return;
    if (!e.data || e.data.type !== "loom:ready") return;
    if (e.data.slug !== entry.slug) return;
    pushContentToIframe();
  });

  function pushContentToIframe() {
    try {
      iframe.contentWindow?.postMessage(
        { type: "loom:content", values: contentValues },
        location.origin
      );
    } catch (_) { /* iframe not ready yet */ }
  }

  // ---- Content slots --------------------------------------
  // contentValues holds only USER OVERRIDES — entries are only added when
  // a user types something. The slot's `default` is shown as a placeholder.
  // An empty field omits the slot from the postMessage so the preview falls
  // back to that state's implicit default.
  let contentValues = {};

  // Reset handlers registered by each rendered field — used by "Clear all".
  let fieldResetters = [];
  const clearBtn = document.getElementById("sb-content-clear");
  const updateClearBtn = () => {
    clearBtn.disabled = Object.keys(contentValues).length === 0;
  };

  function commitContent(next) {
    contentValues = next;
    pushContentToIframe();
    updateClearBtn();
  }

  clearBtn.addEventListener("click", () => {
    fieldResetters.forEach((reset) => reset());
    commitContent({});
  });

  renderContentFields(entry.slots || [], contentValues);

  function renderContentFields(slots, values) {
    const panel = document.getElementById("sb-content");
    const fields = document.getElementById("sb-content-fields");
    if (!slots.length) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    fields.innerHTML = "";
    fieldResetters = [];

    for (const slot of slots) {
      let made;
      if (slot.type === "text") made = makeTextField(slot, values);
      else if (slot.type === "image") made = makeImageField(slot, values);
      else continue;
      fields.appendChild(made.el);
      fieldResetters.push(made.reset);
    }

    updateClearBtn();
  }

  function makeTextField(slot, values) {
    const wrap = document.createElement("div");
    wrap.className = "sb-field sb-field--text";

    const label = document.createElement("label");
    label.className = "sb-field__label";
    label.textContent = slot.label;
    label.htmlFor = `sb-field-${slot.id}`;

    const input = document.createElement("input");
    input.className = "sb-field__input";
    input.type = "text";
    input.id = `sb-field-${slot.id}`;
    input.value = values[slot.id] ?? "";
    input.placeholder = slot.default ?? "";

    input.addEventListener("input", () => {
      const next = { ...contentValues };
      if (input.value === "") delete next[slot.id];
      else next[slot.id] = input.value;
      commitContent(next);
    });

    wrap.appendChild(label);
    if (slot.hint) {
      const hint = document.createElement("span");
      hint.className = "sb-field__hint";
      hint.textContent = slot.hint;
      wrap.appendChild(hint);
    }
    wrap.appendChild(input);

    return {
      el: wrap,
      reset: () => { input.value = ""; }
    };
  }

  function makeImageField(slot, values) {
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
    updateThumb(values[slot.id]);

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

    const fileName = document.createElement("span");
    fileName.className = "sb-field__file-name";
    fileName.textContent = "no file";

    const fileClearBtn = document.createElement("button");
    fileClearBtn.type = "button";
    fileClearBtn.className = "sb-field__file-btn";
    fileClearBtn.textContent = "Clear";

    const resetField = () => {
      fileInput.value = "";
      fileName.textContent = "no file";
      updateThumb("");
    };

    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      // Hard cap. Sandbox content values are postMessaged on every keystroke;
      // an oversize blob slows down every push and bloats the message queue.
      if (file.size > 512 * 1024) {
        fileName.textContent = "image too large (>512 KB)";
        fileInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        fileName.textContent = file.name;
        updateThumb(dataUrl);
        commitContent({ ...contentValues, [slot.id]: dataUrl });
      };
      reader.readAsDataURL(file);
    });
    fileClearBtn.addEventListener("click", () => {
      resetField();
      const next = { ...contentValues };
      delete next[slot.id];
      commitContent(next);
    });

    row.appendChild(fileBtn);
    row.appendChild(fileClearBtn);
    row.appendChild(fileName);
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

    return { el: wrap, reset: resetField };
  }
}

function wireCopyLink(entry) {
  const btn = document.getElementById("sb-copy-link");
  const toast = document.getElementById("sb-copy-toast");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    // Copies just the element's slug (not the full sandbox URL). Useful for
    // pasting into a CC prompt or referring to the piece in notes.
    const text = entry.slug;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (_) {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      try { ok = document.execCommand("copy"); } catch (_) {}
      input.remove();
    }
    if (ok) {
      btn.classList.add("is-copied");
      toast.textContent = "Copied slug";
      toast.classList.add("is-visible");
      clearTimeout(btn._toastTimer);
      btn._toastTimer = setTimeout(() => {
        btn.classList.remove("is-copied");
        toast.classList.remove("is-visible");
      }, 1600);
    } else {
      toast.textContent = "Copy failed";
      toast.classList.add("is-visible");
      setTimeout(() => toast.classList.remove("is-visible"), 1600);
    }
  });
}

/* Route the "← back" link to whichever surface the entry lives on:
   - Primitives → System page, with the section anchor that matches the
     entry's sub-category tag (action / input / nav / etc.).
   - Everything else → Library page.

   Section anchors must stay in sync with tokens.html's <section id="...">
   values. The map below is the single source of truth on the JS side. */
function wireBackLink(entry) {
  const back = document.getElementById("sb-back");
  const label = document.getElementById("sb-back-label");
  if (!back) return;

  const tags = entry.tags || [];
  const isPrimitive = tags.includes("primitive");

  if (!isPrimitive) {
    back.href = "index.html";
    if (label) label.textContent = "Library";
    return;
  }

  const SUB_TO_SECTION = {
    "action":       "actions",
    "input":        "inputs",
    "data-display": "data-display",
    "nav":          "navigation",
    "feedback":     "feedback",
    "overlay":      "overlays"
  };
  const sub = tags.find((t) => t in SUB_TO_SECTION);
  const anchor = sub ? `#${SUB_TO_SECTION[sub]}` : "";
  back.href = `tokens.html${anchor}`;
  if (label) label.textContent = "System";
}

function categoryLabel(id) {
  switch (id) {
    case "components": return "Component";
    case "modules":    return "Module";
    case "templates":  return "Template";
    default:           return id;
  }
}

/* Reject any manifest path that doesn't match the on-disk convention.
   See library.js for the rationale + canonical regex. */
function isSafeManifestPath(p) {
  if (typeof p !== "string" || !p) return false;
  if (p.includes("..") || p.startsWith("/") || /[\\:]/.test(p)) return false;
  return /^src\/(components|modules|templates)\/[a-z0-9][a-z0-9-]*\/(_approved\/)?[a-zA-Z0-9._-]+\.(html|json|css|js)$/.test(p);
}

/* Counts direct consumers of a single entry. Mirrors the procedure in
   CLAUDE.md §15 — same logic the Library page runs for its Awaiting
   approval chips, but scoped to one slug instead of all drafts. Keep in
   sync with library.js `countConsumers`. */
async function countConsumersForEntry(entry, manifest) {
  if (entry.category === "templates") return 0;
  if (!manifest) return 0;

  const pattern = entry.category === "components"
    ? `data-loom="${entry.slug}"`
    : `data-loom-module="${entry.slug}"`;

  const others = (manifest.entries || []).filter((e) => !(e.slug === entry.slug && e.category === entry.category));
  let count = 0;

  const tasks = others.map(async (other) => {
    if (!isSafeManifestPath(other.filePath)) return;
    try {
      if (other.filePath.endsWith(".json")) {
        // Composed template — only meaningful for module consumers.
        if (entry.category !== "modules") return;
        const r = await fetch("/" + other.filePath, { cache: "no-store" });
        if (!r.ok) return;
        const json = await r.json();
        if ((json.modules || []).some((m) => m.moduleSlug === entry.slug)) count++;
      } else {
        // HTML file (module body or hand-written template body). Grep
        // for the data-loom* attribute.
        const r = await fetch("/" + other.filePath, { cache: "no-store" });
        if (!r.ok) return;
        const html = await r.text();
        if (html.includes(pattern)) count++;
      }
    } catch (_) {}
  });

  await Promise.all(tasks);
  return count;
}

function buildDiscardPrompt(entry) {
  // Mirrors the procedure in CLAUDE.md §14. Self-contained so the pasted
  // prompt works even if the receiving CC session hasn't seen this turn.
  // The label is "Discard changes" in the UI but the underlying mechanism
  // is a revert — restore files from _approved/ and delete the snapshot.
  const slug = entry.slug;
  const category = entry.category;
  const slugFolder = `src/${category}/${slug}`;
  const lines = [];
  lines.push(`Discard changes for \`${slug}\` (${category}) by reverting to its approved version. Follow \`CLAUDE.md §14\`.`);
  lines.push("");
  lines.push("Concretely:");
  lines.push(`1. Copy every file from \`${slugFolder}/_approved/\` back to \`${slugFolder}/\`, overwriting the current versions.`);
  lines.push(`2. In \`library/manifest.json\`, flip the \`${slug}\` entry's \`status\` from \`draft\` to \`approved\`. Remove any "Reverted to draft from approved on ..." note appended at edit time.`);
  lines.push(`3. Delete the \`${slugFolder}/_approved/\` folder — the working files ARE the approved state now.`);
  lines.push(`4. Run the where-used scan from \`CLAUDE.md §15\`. The restored files just overwrote what consumers may have been relying on; downstream needs re-checking.`);
  lines.push(`5. Report the file paths restored.`);
  return lines.join("\n");
}

function buildApprovePrompt(entry) {
  // Mirrors the procedure in CLAUDE.md §6 (Approval flow). The prompt is
  // self-contained — paste-ready for any CC session.
  const slug = entry.slug;
  const category = entry.category;
  const lines = [];
  lines.push(`Approve \`${slug}\` (${category}). Follow \`CLAUDE.md §6\`.`);
  lines.push("");
  lines.push("Concretely:");
  lines.push(`1. Run the approval checklist for ${category} per \`system/${category}.md\`. Verify every check item passes.`);
  lines.push(`2. If the checklist passes, flip the \`${slug}\` entry's \`status\` from \`draft\` to \`approved\` in \`library/manifest.json\`. Refresh the \`notes\` field to record the approval date and drop any "Reverted to draft from approved on ..." note.`);
  lines.push(`3. If \`src/${category}/${slug}/_approved/\` exists, delete it — the new state IS the new approved version.`);
  lines.push(`4. Run the where-used scan from \`CLAUDE.md §15\` and surface the QA prompt listing every consumer.`);
  lines.push(`5. Report the file paths affected.`);
  return lines.join("\n");
}

function buildDesignCheckPrompt(entry, currentStateId) {
  // Advisory design check (CLAUDE.md §22, system/design-check.md). Scans the
  // RENDERED preview against .loomling/design-check.json. Flag, never block.
  const slug = entry.slug;
  const category = entry.category;
  const states = (entry.states && entry.states.length) ? entry.states : [{ id: "default" }];
  // Currently-viewed state first, then the rest, so the most relevant URL leads.
  const ordered = [
    ...states.filter((s) => s.id === currentStateId),
    ...states.filter((s) => s.id !== currentStateId)
  ];
  const urls = ordered.map(
    (s) => `   - http://localhost:8765/${entry.previewPath}?entry=${encodeURIComponent(slug)}&state=${encodeURIComponent(s.id)}`
  );
  const lines = [];
  lines.push(`Run the advisory design check for \`${slug}\` (${category}) per \`system/design-check.md\`.`);
  lines.push("");
  lines.push("Advisory only — flag, never block. Scan the RENDERED preview, not the source file.");
  lines.push("");
  lines.push("Concretely:");
  lines.push("1. Load the rule set from `.loomling/design-check.json` — only `enabled` rules, and respect each `severity`.");
  lines.push("2. Scan the rendered preview for every declared state (swap the port if your Loom server runs elsewhere):");
  urls.forEach((u) => lines.push(u));
  lines.push("3. Run it: if `impeccable` is installed, `npx impeccable detect <url> --json` per state and keep only findings whose rule id is `enabled` in the config; otherwise inspect the rendered DOM (computed styles, heading order, image `src`, rendered text) against those rules.");
  lines.push("4. Discount Loomling-intentional patterns: an unfilled `data-loom-slot` placeholder is NOT a broken image; count em-dashes in rendered body copy only, never CSS `--custom-properties`.");
  lines.push("5. Report findings grouped by severity (high → low), each naming the rule id, the element, and a one-line fix. If clean, say so.");
  lines.push("");
  lines.push("Do not edit anything — this check only reports.");
  return lines.join("\n");
}

function buildCritiquePrompt(entry, currentStateId) {
  // Read-only design critique (CLAUDE.md §23, system/critique.md). Uses
  // Loomling's own context as the brief; never writes PRODUCT.md/DESIGN.md
  // or any file. The deterministic half reuses the §22 design check.
  const slug = entry.slug;
  const category = entry.category;
  const states = (entry.states && entry.states.length) ? entry.states : [{ id: "default" }];
  const ordered = [
    ...states.filter((s) => s.id === currentStateId),
    ...states.filter((s) => s.id !== currentStateId)
  ];
  const urls = ordered.map(
    (s) => `   - http://localhost:8765/${entry.previewPath}?entry=${encodeURIComponent(slug)}&state=${encodeURIComponent(s.id)}`
  );
  const lines = [];
  lines.push(`Give \`${slug}\` (${category}) a design critique — a read-only second opinion per \`system/critique.md\`.`);
  lines.push("");
  lines.push("Read-only: produce a report in chat. Do NOT edit files, and do NOT create PRODUCT.md or DESIGN.md.");
  lines.push("");
  lines.push("Concretely:");
  lines.push("1. Use Loomling's own context as the brief — read `system/voice.md` (voice + audience), the `system/*.md` design rules, and `project.json` (name, purpose). Don't invent a brief.");
  lines.push("2. Look at the RENDERED element, per declared state (swap the port if your Loom server runs elsewhere):");
  urls.forEach((u) => lines.push(u));
  lines.push("3. Weave two assessments:");
  lines.push("   - Design review: visual hierarchy, information architecture, cognitive load, emotional fit, copy against `system/voice.md`, states, edge cases. Score Nielsen's heuristics where they apply (a single element legitimately leaves many n/a).");
  lines.push("   - Deterministic pass: reuse the Loomling design check (`.loomling/design-check.json`, Moderate, §22) on the rendered URL — don't run a separate linter. Note any false positives.");
  lines.push("4. Report in chat: a short heuristic table (n/a where appropriate); an on-brand / 'could someone tell AI made this' verdict; 3-5 priority issues tagged P0-P3 (each: what / why it matters / a concrete fix); persona red flags if relevant. Be specific and direct.");
  lines.push("5. Do NOT persist a snapshot or write any file. If I want to act on a finding, I'll ask — and any fix then runs through the normal edit lifecycle (CLAUDE.md §14 snapshot + §5 drift + tokens-only).");
  return lines.join("\n");
}

function collectBreakpoints() {
  // Mirror the catalog in tokens.js / system/space.md.
  const defs = [
    { token: "--bp-xs",  label: "XS" },
    { token: "--bp-sm",  label: "SM" },
    { token: "--bp-md",  label: "MD" },
    { token: "--bp-lg",  label: "LG" },
    { token: "--bp-xl",  label: "XL" },
    { token: "--bp-2xl", label: "2XL" }
  ];
  const out = [];
  for (const def of defs) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(def.token)
      .trim();
    if (value) out.push({ ...def, value });
  }
  return out;
}
