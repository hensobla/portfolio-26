/* ============================================================
   settings.js — Loom Settings page
   ------------------------------------------------------------
   Two modules:
   - LogoUpload: file picker → localStorage data URL → instant
     nav preview across all Loom views. "Save to project" copies
     a CC paste prompt to persist the file to .loomling/ + set
     project.json.logo.
   - DarkModeSetting: relocated from tokens.js. Same behavior —
     surfaces project.json.darkMode flag + detection chip, copies
     a CC paste prompt to save the changed flag.
   ============================================================ */

// Re-runs on every nav INTO Settings. Element-bound listeners inside <main>
// die with the old DOM; document-level listeners are guarded inside each
// module so they install at most once per session. setProjectName re-renders
// from manifest each call.
async function initSettings() {
  if (document.body.dataset.page !== "settings") return;
  await setProjectName();
  LogoUpload.wire();
  DarkModeSetting.wire();
  ArchiveView.wire();
  wireSideToggle();
}

window.LoomPages = window.LoomPages || {};
// Don't clobber tokens.js' registration of LoomPages.settings (which calls
// setProjectName + initImportTile) — wrap both inits together so the router
// fires this site's complete settings setup.
const _tokensSettingsInit = window.LoomPages.settings;
window.LoomPages.settings = async function () {
  if (typeof _tokensSettingsInit === "function") {
    try { _tokensSettingsInit(); } catch (e) { console.error(e); }
  }
  await initSettings();
};

document.addEventListener("loom:nav", initSettings);
initSettings();

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

/* Side-nav collapse toggle — duplicate of the trivial helper in tokens.js
   so the Settings page works standalone. Could be lifted to a shared util
   later if a third page needs it. */
function wireSideToggle() {
  const toggle = document.getElementById("lib-side-toggle");
  const side = document.querySelector(".lib-side");
  if (!toggle || !side) return;
  toggle.addEventListener("click", () => {
    const open = side.getAttribute("data-open") === "true";
    side.setAttribute("data-open", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "false" : "true");
  });
}

/* ---------------------------------------------------------------- */

const LogoUpload = (() => {
  const state = {
    pending: null,    // { dataUrl, fileName, mimeType, size } — uploaded but not saved
    savedPath: null,  // project.json.logo, if set
  };

  function wire() {
    const dropzone = document.getElementById("settings-logo-dropzone");
    const fileInput = document.getElementById("settings-logo-file");
    const removeBtn = document.getElementById("settings-logo-remove");
    const saveBtn = document.getElementById("settings-logo-save");

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragging");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    });

    removeBtn.addEventListener("click", removeLogo);
    saveBtn.addEventListener("click", copySavePrompt);

    init();
  }

  async function init() {
    // Reflect any existing logo (localStorage live preview OR project.json on disk).
    syncFromBrand();
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.logo) state.savedPath = json.logo;
      }
    } catch { /* no project.json */ }
    renderStatus();

    // React to external Brand changes (e.g. cleared from another tab, or
    // a subsequent CC commit that updated project.json.logo + cleared
    // localStorage). Keeps the Settings UI in sync without a reload.
    // Document-level — guard so a router re-entry into Settings doesn't
    // double-bind.
    if (!LogoUpload._docWired) {
      LogoUpload._docWired = true;
      document.addEventListener("loomling:user-logo-changed", () => {
        syncFromBrand();
        renderStatus();
      });
    }
  }

  function syncFromBrand() {
    const stored = window.Brand && window.Brand.get();
    if (stored && stored.dataUrl) {
      state.pending = stored;
      renderFilled();
    } else {
      // Cleared externally — reset our UI to empty.
      state.pending = null;
      const empty = document.getElementById("settings-logo-empty");
      const filled = document.getElementById("settings-logo-filled");
      const img = document.getElementById("settings-logo-img");
      const sep = document.getElementById("settings-logo-sep");
      const fileInput = document.getElementById("settings-logo-file");
      if (empty) empty.hidden = false;
      if (filled) filled.hidden = true;
      if (img) img.hidden = true;
      if (sep) sep.hidden = true;
      if (fileInput) fileInput.value = "";
    }
  }

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      setStatus("Only images are accepted (SVG, PNG, JPG, WebP).", "warn");
      return;
    }
    // Hard cap. The dataURL lands in localStorage (typical quota ~5 MB per
    // origin); a multi-MB upload would crowd out the theme / builder state
    // keys and silently break those features. Reject rather than warn.
    if (file.size > 1024 * 1024) {
      setStatus("Logo is over 1 MB. Use a compressed PNG or an SVG.", "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.pending = {
        dataUrl: reader.result,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      };
      // Push to localStorage + nav preview immediately.
      window.Brand.set(state.pending.dataUrl, {
        fileName: state.pending.fileName,
        mimeType: state.pending.mimeType,
        size: state.pending.size,
      });
      renderFilled();
      renderStatus();
    };
    reader.onerror = () => setStatus("Could not read file.", "warn");
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    state.pending = null;
    window.Brand.set(null);
    document.getElementById("settings-logo-empty").hidden = false;
    document.getElementById("settings-logo-filled").hidden = true;
    document.getElementById("settings-logo-img").hidden = true;
    document.getElementById("settings-logo-sep").hidden = true;
    document.getElementById("settings-logo-file").value = "";
    renderStatus();
  }

  function renderFilled() {
    if (!state.pending) return;
    document.getElementById("settings-logo-empty").hidden = true;
    document.getElementById("settings-logo-filled").hidden = false;
    document.getElementById("settings-logo-filename").textContent = state.pending.fileName || "logo";
    document.getElementById("settings-logo-filesize").textContent = state.pending.size
      ? formatBytes(state.pending.size) + " · " + (state.pending.mimeType || "image")
      : (state.pending.mimeType || "image");

    const img = document.getElementById("settings-logo-img");
    const sep = document.getElementById("settings-logo-sep");
    img.src = state.pending.dataUrl;
    img.hidden = false;
    sep.hidden = false;
  }

  function renderStatus() {
    const saveBtn = document.getElementById("settings-logo-save");
    const removeBtn = document.getElementById("settings-logo-remove");
    const status = document.getElementById("settings-logo-status");

    removeBtn.disabled = !state.pending && !state.savedPath;
    // Save button is enabled when there's a pending data-URL that's not
    // already what's on disk (we can't tell trivially without comparing
    // bytes, so any pending upload enables save).
    saveBtn.disabled = !state.pending;

    if (state.pending && state.savedPath) {
      status.textContent = `Live preview active. On disk: ${state.savedPath}. Click Save to overwrite.`;
    } else if (state.pending) {
      status.textContent = "Live preview only (localStorage). Click Save to persist to disk.";
    } else if (state.savedPath) {
      status.textContent = `Saved on disk: ${state.savedPath}.`;
    } else {
      status.textContent = "No logo set.";
    }
  }

  function setStatus(text, _variant) {
    const status = document.getElementById("settings-logo-status");
    if (status) status.textContent = text;
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }

  function extForMime(mime) {
    if (mime === "image/svg+xml") return "svg";
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    return "png";
  }

  async function copySavePrompt() {
    if (!state.pending) return;
    const ext = extForMime(state.pending.mimeType);
    const targetPath = `.loomling/user-logo.${ext}`;

    const prompt = `Save the user-uploaded brand logo to the project:

1. Decode the base64 payload below and write it to \`${targetPath}\` (binary write — preserve the original bytes).
2. Update \`project.json.logo\` to \`"${targetPath}"\`.
3. If a previous logo file exists at a different path (check \`project.json.logo\` before overwriting), delete the old file.

The logo will appear in the nav of every Loom view, to the left of the Loomling mark, separated by a pipe character: \`[user logo] | [Loomling]\`. Loomling reads the path from \`project.json.logo\` on cold start when localStorage is empty (e.g. fresh clone).

\`\`\`
${state.pending.dataUrl}
\`\`\`

Filename hint: \`${state.pending.fileName || "logo." + ext}\` (${state.pending.mimeType}, ${formatBytes(state.pending.size || 0)}).`;

    try { await navigator.clipboard.writeText(prompt); }
    catch { /* swallow */ }
    if (window.DevTokens && window.DevTokens.showToast) {
      window.DevTokens.showToast("Save prompt copied — paste into Claude Code.");
    }
  }

  return { wire };
})();

/* ---------------------------------------------------------------- */

/* DarkModeSetting — relocated from tokens.js. Same logic; the markup
   moved to settings.html. See system/dark-mode.md. */
const DarkModeSetting = (() => {
  const state = {
    saved: "auto",
    current: "auto",
    detected: null,
  };

  function wire() {
    document.querySelectorAll('input[name="ds-darkmode"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        state.current = e.target.value;
        renderStatus();
      });
    });
    document.getElementById("ds-darkmode-save").addEventListener("click", copySavePrompt);
    init();
  }

  async function init() {
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const v = json && json.darkMode;
        if (v === "always" || v === "never" || v === "auto") state.saved = v;
      }
    } catch { /* default */ }
    state.current = state.saved;

    const radio = document.querySelector(`input[name="ds-darkmode"][value="${state.saved}"]`);
    if (radio) radio.checked = true;

    state.detected = !!(window.Theme && window.Theme.userDsHasDark);
    renderStatus();

    if (!DarkModeSetting._docWired) {
      DarkModeSetting._docWired = true;
      document.addEventListener("loomling:theme-changed", () => {
        state.detected = !!(window.Theme && window.Theme.userDsHasDark);
        renderStatus();
      });
      document.addEventListener("loomling:tokens-changed", () => {
        setTimeout(() => {
          state.detected = !!(window.Theme && window.Theme.userDsHasDark);
          renderStatus();
        }, 200);
      });
    }
  }

  function renderStatus() {
    const detectedChip = document.getElementById("ds-darkmode-detected");
    const detectedText = document.getElementById("ds-darkmode-detected-text");
    if (detectedChip && detectedText) {
      if (state.detected === true) {
        detectedChip.dataset.state = "yes";
        detectedText.textContent = "Detected in tokens.css: yes";
      } else {
        detectedChip.dataset.state = "no";
        detectedText.textContent = "Detected in tokens.css: no";
      }
    }

    const effectText = document.getElementById("ds-darkmode-effect-text");
    if (effectText) {
      const v = state.current;
      const propagates =
        v === "always" ? true :
        v === "never"  ? false :
        !!state.detected;
      effectText.textContent = propagates
        ? "Effective: chrome + your design system"
        : "Effective: chrome only";
    }

    const saveBtn = document.getElementById("ds-darkmode-save");
    if (saveBtn) saveBtn.disabled = state.current === state.saved;
  }

  async function copySavePrompt() {
    const value = state.current;
    const prompt = `Set \`project.json.darkMode\` to \`"${value}"\`.

Background: the Loomling nav has a sun/moon toggle that always flips the Loom chrome. \`project.json.darkMode\` controls whether the toggle also flips the user's design system (the tokens in \`src/tokens.css\`):

- \`"auto"\`: propagate only when \`src/tokens.css\` declares a \`[data-theme="dark"]\` block (detected automatically).
- \`"always"\`: propagate every time the toggle flips, even if no dark tokens are declared.
- \`"never"\`: chrome only. The user's design system never flips.

See \`system/dark-mode.md\` for the full spec. Just update \`project.json\` — no other files need to change.`;

    try { await navigator.clipboard.writeText(prompt); }
    catch { /* swallow */ }
    if (window.DevTokens && window.DevTokens.showToast) {
      window.DevTokens.showToast("Save prompt copied — paste into Claude Code.");
    }
  }

  return { wire };
})();

/* ---------------------------------------------------------------- */

/* ArchiveView — read-only list of removed elements. Each row shows the
   element's name, slug, category, removal date, and notes. No interactive
   actions yet; restoring an archived element means asking CC directly
   ("recreate the eyebrow component"). See ADR 0010 and CLAUDE.md §11. */
const ArchiveView = (() => {
  function wire() {
    init();
  }

  async function init() {
    const list = document.getElementById("settings-archive-list");
    const empty = document.getElementById("settings-archive-empty");
    const meta = document.getElementById("archive-meta");
    if (!list) return;

    let manifest;
    try {
      const res = await fetch("manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      manifest = await res.json();
    } catch (err) {
      list.innerHTML = `<li class="settings-archive__error">Could not load manifest.json (${escapeText(err.message)}).</li>`;
      return;
    }

    const removed = (manifest.entries || []).filter((e) => e.status === "removed");
    if (meta) meta.textContent = `manifest.json · ${removed.length} archived`;

    if (removed.length === 0) {
      if (empty) empty.hidden = false;
      list.hidden = true;
      return;
    }

    // Newest-removed first; entries without removedAt fall to the bottom.
    removed.sort((a, b) => (b.removedAt || "").localeCompare(a.removedAt || ""));

    list.innerHTML = "";
    for (const entry of removed) {
      const li = document.createElement("li");
      li.className = "settings-archive__row";
      li.innerHTML = `
        <div class="settings-archive__head">
          <span class="settings-archive__name">${escapeText(entry.name)}</span>
          <span class="settings-archive__chip">${escapeText(categoryLabel(entry.category))}</span>
          <span class="settings-archive__slug">${escapeText(entry.slug)}</span>
        </div>
        <div class="settings-archive__meta">
          ${entry.removedAt ? `<span>Removed ${escapeText(entry.removedAt)}</span>` : ""}
          ${entry.addedAt ? `<span>${entry.removedAt ? "· " : ""}Added ${escapeText(entry.addedAt)}</span>` : ""}
        </div>
        ${entry.notes ? `<div class="settings-archive__notes">${escapeText(entry.notes)}</div>` : ""}
      `;
      list.appendChild(li);
    }
  }

  function categoryLabel(id) {
    if (id === "components") return "Component";
    if (id === "modules") return "Module";
    if (id === "templates") return "Template";
    return id || "—";
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  return { wire };
})();
