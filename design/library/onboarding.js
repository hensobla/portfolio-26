/* ============================================================
   onboarding.js — first-run init flow for the Loom
   ------------------------------------------------------------
   A dismissible 5-screen dialog that auto-opens once on a first
   visit. It IS the project init (it replaces the conversational
   §7 interview as the entry point — see CLAUDE.md §21).

   The flow:
     0. Welcome  — the loop: you act in the Loom → it hands you a
                   prompt → you paste it into Claude Code → CC writes
                   the files → you refresh and the Loom reflects it.
     1. Basics   — project name + one-line purpose (both required).
     2. Fork     — single-select: Import / Let's vibe / Start fresh.
     3. Capture  — fork-specific inputs (Fresh skips this screen).
     4. Handoff  — the generated, read-only CC prompt + copy button.

   The Loom CANNOT write to disk — only Claude Code does. So the
   whole flow produces ONE paste-ready prompt; CC executes it and
   sets project.json.initializedAt, which is what stops this from
   auto-opening again. Same architecture as the Tokens Import modal
   (§17) and the dark-mode editor (§18).

   EXTENSIBILITY (this surface is iterated on continuously):
     - Add a fork → add an entry to FORKS + a buildPrompt() branch.
     - Add a capture field → extend the fork's capture markup +
       its prompt builder; state.fields is a free-form bag.
     - Add a screen → add a key to SCREENS, a <section data-screen>,
       a META entry, and (if it can gate) a validate() branch.

   Page-agnostic chrome: loaded on every routable Loom page, NOT
   registered with window.LoomPages and NOT listening for loom:nav
   (auto-open fires once at script run, never per SPA navigation).
   The modal + header "?" button are built once and survive <main>
   swaps. Reuses .bld-modal* / .bld-btn* / .bld-prompt from
   library.css. Vanilla — no deps (CLAUDE.md §11).
   ============================================================ */

(function () {
  const STORAGE_KEY = "loomling:onboarding:dismissed:v1";
  const MODAL_ID = "loom-onboard-modal";

  /* ---------- screen sequence ----------
     "capture" is skipped when the fork carries no capture screen
     (Start fresh). Everything else is linear. */
  const SCREENS = ["welcome", "basics", "fork", "capture", "handoff"];

  const META = {
    welcome: { title: "Welcome to Loomling", sub: "Here's how you and Claude Code work together" },
    basics: { title: "Tell us about your project", sub: "Just the essentials — you can refine anything later" },
    fork: { title: "How would you like to start?", sub: "You can always adjust your project later" },
    capture: { title: "", sub: "" }, // set per-fork at render time
    handoff: { title: "Your kickoff prompt", sub: "Paste this into Claude Code, then refresh the Loom" },
  };

  /* ---------- forks ----------
     Each fork owns: the select-card copy, whether it has a capture
     screen, the capture screen's title/sub, and a prompt builder.
     Adding a fork is a local edit here + a card in the markup. */
  const FORKS = {
    import: {
      label: "Import",
      blurb: "Map an existing site or files into Loomling",
      hasCapture: true,
      captureMeta: { title: "Import a system", sub: "You can include as many references as you want" },
      validate: () => {
        const v = state.importMode === "files" ? state.fields.folder : state.fields.url;
        return Boolean((v || "").trim());
      },
    },
    vibe: {
      label: "Let's vibe",
      blurb: "Describe a look & feel and let Claude build it",
      hasCapture: true,
      captureMeta: { title: "Let's vibe", sub: "The more you give Claude, the closer the first pass lands" },
      validate: () => Boolean((state.fields.vibe || "").trim()),
    },
    fresh: {
      label: "Start fresh",
      blurb: "Begin from Loomling's base library and defaults",
      hasCapture: false,
      captureMeta: null,
      validate: () => true,
    },
  };

  const state = {
    open: false,
    screen: "welcome",
    fork: null,
    importMode: "url", // "url" | "files"
    basics: { name: "", purpose: "" },
    fields: { url: "", folder: "", vibe: "", sites: "", context: "" },
    lastFocus: null,
  };

  let docListenersInstalled = false;

  /* ---------- dismissed flag (gates AUTO-open only) ---------- */

  function readDismissed() {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; }
    catch { return false; }
  }
  function writeDismissed() {
    try { localStorage.setItem(STORAGE_KEY, "true"); }
    catch { /* quota / private mode — silent */ }
  }

  /* ---------- prompt builders ----------
     Every fork sets project basics + initializedAt, then layers on
     fork-specific work. CC is the only writer; the Loom never sets
     initializedAt itself. */

  function basicsBlock() {
    const name = state.basics.name.trim();
    const purpose = state.basics.purpose.trim();
    return [
      "I'm initializing my Loomling project through the onboarding flow — this is the project init (CLAUDE.md §7 / §21). Please:",
      "",
      "1. Set `project.json.name` to \"" + name + "\" and mirror it into `library/manifest.json.project.name`.",
      "2. Set `project.json.purpose` to \"" + purpose + "\" and rewrite the opening line of `README.md` to match.",
      "3. Set `project.json.initializedAt` to today's date (YYYY-MM-DD).",
    ];
  }

  function contextLine(n) {
    const ctx = state.fields.context.trim();
    return ctx ? n + ". Additional context from me: " + ctx : null;
  }

  function buildImportPrompt() {
    const lines = basicsBlock();
    if (state.importMode === "files") {
      const folder = state.fields.folder.trim();
      lines.push(
        "4. I have an existing project I'd like to bring in. It lives in this local folder: `" + folder + "`.",
        "   - **Confirm with me first.** Verify the folder location (this path came from a browser drag-and-drop, so it may be just the folder name — ask me for the absolute path if you're unsure) and tell me what you plan to copy in. **Do not copy any files until I've confirmed.**",
        "   - Once confirmed, copy the relevant source + assets into this project and map them into the design system — derive `src/tokens.css` (50–950 OKLCH ramps + semantic mappings), `--font-display/body/mono`, and voice — following `system/tokens-import.md`. Update `system/color.md` and `system/typography.md`. Run the contrast gate before writing.",
      );
    } else {
      const url = state.fields.url.trim();
      lines.push(
        "4. Existing brand reference: set `project.json.brandSource` to \"" + url + "\".",
        "5. Read and map that site into the design system: `WebFetch` the URL, extract its palette, typography, and voice, and seed `src/tokens.css` (50–950 OKLCH ramps + semantic mappings referencing primitives only) following `system/tokens-import.md` (treat as `mode: \"url\"`). Update `system/color.md` and `system/typography.md` to match. Run the contrast gate (body-on-paper ≥ 4.5:1, accent-on-paper ≥ 3:1) before writing.",
      );
    }
    const c = contextLine(state.importMode === "files" ? 5 : 6);
    if (c) lines.push(c);
    lines.push("", "When you're done, I'll refresh the Loom to see the result.");
    return lines.join("\n");
  }

  function buildVibePrompt() {
    const payload = {
      schema: "loomling.tokens-import/v1",
      mode: "vibe",
      scope: { type: "replace-all" },
      input: {
        prompt: state.fields.vibe.trim() || undefined,
        references: splitList(state.fields.sites),
        notes: state.fields.context.trim() || undefined,
      },
    };
    if (!payload.input.references.length) delete payload.input.references;

    const lines = basicsBlock();
    lines.push(
      "4. Now establish the look & feel from the vibe below. Treat this as a **Vibe Tokens Import** (`system/tokens-import.md`): run the § Vibe extraction heuristics, then write the proposal to `.loomling/tokens.proposed.css` — this is **preview-and-commit**, so do NOT touch `src/tokens.css`, `system/*.md`, or the token docs yet. I'll review the proposal in the Loom's banner and paste the Commit prompt to finalize.",
      "   - Emit a `[data-theme=\"dark\"]` block only if the vibe signals dark-mode support; otherwise note why you skipped it.",
      "",
      "Vibe payload:",
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
      "",
      "After you write the proposal, I'll review it in the Loom and Commit (or Discard) from the banner.",
    );
    return lines.join("\n");
  }

  function buildFreshPrompt() {
    const lines = basicsBlock();
    lines.push(
      "4. I'm starting fresh — keep Loomling's shipped starter primitives and the default `src/tokens.css` as my baseline. No brand import or token changes for now.",
    );
    const c = contextLine(5);
    if (c) lines.push(c);
    lines.push(
      "",
      "That's the whole init. When you're done, I'll refresh the Loom. (If I later want the example Elements cleared out, I'll ask separately per CLAUDE.md §9.)",
    );
    return lines.join("\n");
  }

  function splitList(raw) {
    return (raw || "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function buildPrompt() {
    if (state.fork === "import") return buildImportPrompt();
    if (state.fork === "vibe") return buildVibePrompt();
    return buildFreshPrompt();
  }

  /* ---------- modal DOM (built once) ---------- */

  function buildModal() {
    if (document.getElementById(MODAL_ID)) return;
    if (!document.body) return;

    const modal = document.createElement("div");
    modal.className = "onb-modal";
    modal.id = MODAL_ID;
    modal.hidden = true;
    modal.innerHTML = `
      <div class="onb-shell onb-panel" role="dialog" aria-modal="true"
           aria-labelledby="onb-title" tabindex="-1">
        <div class="onb-topbar">
          <span class="sr-only" id="onb-progress" aria-live="polite"></span>
          <button type="button" class="onb-skiplink" data-onb-dismiss>Skip</button>
        </div>

        <div class="onb-stage">
         <div class="onb-stage__inner">
          <div class="onb-head__text">
            <h2 class="onb-title" id="onb-title">${META.welcome.title}</h2>
            <p class="onb-sub" id="onb-sub">${META.welcome.sub}</p>
          </div>

          <div class="onb-body">

          <!-- 0. Welcome -->
          <section class="onb-screen" data-screen="welcome">
            <div class="onb-loop" aria-hidden="true">
              <div class="onb-loop__node">The Loom</div>
              <span class="onb-loop__arrow">→ hands you a prompt →</span>
              <div class="onb-loop__node onb-loop__node--cc">Claude&nbsp;Code</div>
            </div>
            <p class="onb-lead">You work in <strong>the Loom</strong> — your window into the project. Anything that has to touch disk, the Loom can't do directly: instead it hands you a <strong>ready-to-paste prompt</strong>.</p>
            <ol class="onb-steps">
              <li>Do something here in the Loom.</li>
              <li>Copy the prompt it gives you.</li>
              <li>Paste it into <strong>Claude Code</strong> — CC writes the files, following your design system.</li>
              <li>Refresh the Loom and watch it reflect the change.</li>
            </ol>
            <p class="onb-note">Ask CC for something off-system and it flags the &ldquo;drift,&rdquo; then offers choices — it never blocks you.</p>
          </section>

          <!-- 1. Basics -->
          <section class="onb-screen" data-screen="basics" hidden>
            <div class="onb-field">
              <label class="onb-label" for="onb-name">Project name</label>
              <input type="text" id="onb-name" class="onb-input" data-onb-field="name"
                     placeholder="e.g. acme marketing site" autocomplete="off" />
            </div>
            <div class="onb-field">
              <label class="onb-label" for="onb-purpose">Basic project description</label>
              <textarea id="onb-purpose" class="onb-input onb-textarea" data-onb-field="purpose"
                        rows="2" placeholder="One sentence on what this site is for."></textarea>
            </div>
          </section>

          <!-- 2. Fork -->
          <section class="onb-screen" data-screen="fork" hidden>
            <div class="onb-cards" role="radiogroup" aria-label="How would you like to start?">
              <button type="button" class="onb-card" role="radio" aria-checked="false" data-onb-fork="import">
                <span class="onb-card__icon" aria-hidden="true">${ICON_IMPORT}</span>
                <span class="onb-card__title">${FORKS.import.label}</span>
                <span class="onb-card__blurb">${FORKS.import.blurb}</span>
              </button>
              <button type="button" class="onb-card" role="radio" aria-checked="false" data-onb-fork="vibe">
                <span class="onb-card__icon" aria-hidden="true">${ICON_VIBE}</span>
                <span class="onb-card__title">${FORKS.vibe.label}</span>
                <span class="onb-card__blurb">${FORKS.vibe.blurb}</span>
              </button>
              <button type="button" class="onb-card" role="radio" aria-checked="false" data-onb-fork="fresh">
                <span class="onb-card__icon" aria-hidden="true">${ICON_FRESH}</span>
                <span class="onb-card__title">${FORKS.fresh.label}</span>
                <span class="onb-card__blurb">${FORKS.fresh.blurb}</span>
              </button>
            </div>
          </section>

          <!-- 3. Capture (fork-specific; Fresh skips this screen) -->
          <section class="onb-screen" data-screen="capture" hidden>

            <!-- import -->
            <div class="onb-capture" data-capture="import" hidden>
              <div class="onb-toggle" role="tablist" aria-label="Import source">
                <button type="button" class="onb-toggle__btn is-active" role="tab" aria-selected="true" data-onb-import-mode="url">Your website</button>
                <button type="button" class="onb-toggle__btn" role="tab" aria-selected="false" data-onb-import-mode="files">Your files</button>
              </div>

              <div class="onb-field" data-import-group="url">
                <label class="onb-label" for="onb-url">Website URL</label>
                <input type="url" id="onb-url" class="onb-input" data-onb-field="url"
                       placeholder="https://example.com" autocomplete="off" />
                <p class="onb-help">Claude will read the site and map its look & feel into Loomling.</p>
              </div>

              <div class="onb-field" data-import-group="files" hidden>
                <label class="onb-label" for="onb-folder">Point me to your folder</label>
                <div class="onb-drop" data-onb-drop tabindex="-1">
                  <input type="text" id="onb-folder" class="onb-input onb-drop__input" data-onb-field="folder"
                         placeholder="Drag a folder here, or type its path" autocomplete="off" />
                </div>
                <div class="onb-chip" data-onb-chip hidden>
                  <span class="onb-chip__name" data-onb-chip-name></span>
                  <span class="onb-chip__note">Claude will confirm and copy these in.</span>
                </div>
                <p class="onb-help">Your browser only shares the folder name on drop — Claude will confirm the real location with you before copying anything. No files are uploaded here.</p>
              </div>

              <div class="onb-field">
                <label class="onb-label" for="onb-context-import">Any additional context</label>
                <textarea id="onb-context-import" class="onb-input onb-textarea" data-onb-field="context"
                          rows="2" placeholder="Anything else that helps — the more the better."></textarea>
              </div>
            </div>

            <!-- vibe -->
            <div class="onb-capture" data-capture="vibe" hidden>
              <div class="onb-field">
                <label class="onb-label" for="onb-vibe">Tell me the vibe you want</label>
                <textarea id="onb-vibe" class="onb-input onb-textarea" data-onb-field="vibe"
                          rows="3" placeholder="e.g. warm, editorial, lots of whitespace, confident serif headlines."></textarea>
              </div>
              <div class="onb-field">
                <label class="onb-label" for="onb-sites">Websites you like</label>
                <textarea id="onb-sites" class="onb-input onb-textarea" data-onb-field="sites"
                          rows="2" placeholder="One per line or comma-separated."></textarea>
              </div>
              <div class="onb-field">
                <label class="onb-label" for="onb-context-vibe">Any additional context</label>
                <textarea id="onb-context-vibe" class="onb-input onb-textarea" data-onb-field="context"
                          rows="2" placeholder="Anything else that helps — the more the better."></textarea>
              </div>
            </div>

          </section>

          <!-- 4. Handoff -->
          <section class="onb-screen" data-screen="handoff" hidden>
            <pre class="bld-prompt onb-prompt" id="onb-handoff-prompt"></pre>
            <button type="button" class="bld-btn bld-btn--ghost onb-copy" data-onb-copy>Copy prompt</button>
            <p class="onb-help onb-handoff__hint">Paste this into Claude Code. When it's finished, refresh the Loom to see your project.</p>
          </section>

          </div>
         </div>
        </div>

        <footer class="onb-foot">
          <div class="onb-foot__inner">
            <div class="onb-dots" id="onb-dots" aria-hidden="true"></div>
            <div class="onb-foot__btns">
              <button type="button" class="bld-btn onb-back" hidden>Back</button>
              <button type="button" class="bld-btn bld-btn--primary onb-next">Next</button>
            </div>
          </div>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);
    wireModal(modal);
  }

  /* ---------- icons (inline so they inherit currentColor) ---------- */

  const ICON_IMPORT =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/></svg>';
  const ICON_VIBE =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.7-.3-1.3-.7-1.8-.4-.5-.6-1-.6-1.5a1.5 1.5 0 0 1 1.5-1.5H17a5 5 0 0 0 5-5c0-4.4-4.5-7.7-10-7.7z"/></svg>';
  const ICON_FRESH =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a3.5 3.5 0 0 1 0 7M12 22a3.5 3.5 0 0 1 0-7M2 12a3.5 3.5 0 0 1 7 0M22 12a3.5 3.5 0 0 1-7 0M4.9 4.9a3.5 3.5 0 0 1 4.95 4.95M19.1 19.1a3.5 3.5 0 0 1-4.95-4.95M19.1 4.9a3.5 3.5 0 0 1-4.95 4.95M4.9 19.1a3.5 3.5 0 0 1 4.95-4.95"/></svg>';

  /* ---------- listeners (bound once, on the built-once modal) ---------- */

  function wireModal(modal) {
    modal.querySelectorAll("[data-onb-dismiss]").forEach((el) => {
      el.addEventListener("click", () => close());
    });

    // text inputs / textareas → state.basics + state.fields
    modal.querySelectorAll("[data-onb-field]").forEach((el) => {
      el.addEventListener("input", () => {
        const key = el.dataset.onbField;
        if (key === "name" || key === "purpose") state.basics[key] = el.value;
        else state.fields[key] = el.value;
        if (key === "folder") syncChip(el.value);
        refreshNav();
      });
    });

    // fork select cards
    modal.querySelectorAll("[data-onb-fork]").forEach((card) => {
      card.addEventListener("click", () => selectFork(card.dataset.onbFork));
    });

    // import source toggle
    modal.querySelectorAll("[data-onb-import-mode]").forEach((btn) => {
      btn.addEventListener("click", () => setImportMode(btn.dataset.onbImportMode));
    });

    // copy handoff prompt
    modal.querySelector("[data-onb-copy]").addEventListener("click", copyPrompt);

    // nav
    modal.querySelector(".onb-back").addEventListener("click", () => goRelative(-1));
    modal.querySelector(".onb-next").addEventListener("click", () => goRelative(1));

    // folder drag-and-drop (captures the folder NAME only — see help text)
    wireDrop(modal.querySelector("[data-onb-drop]"));
  }

  function wireDrop(zone) {
    if (!zone) return;
    const input = zone.querySelector(".onb-drop__input");
    ["dragenter", "dragover"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("is-drag");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === "dragleave" && zone.contains(e.relatedTarget)) return;
        zone.classList.remove("is-drag");
      })
    );
    zone.addEventListener("drop", (e) => {
      const name = folderNameFromDrop(e.dataTransfer);
      if (!name) return;
      input.value = name;
      state.fields.folder = name;
      syncChip(name);
      refreshNav();
    });
  }

  function folderNameFromDrop(dt) {
    if (!dt) return "";
    const item = dt.items && dt.items[0];
    if (item && typeof item.webkitGetAsEntry === "function") {
      const entry = item.webkitGetAsEntry();
      if (entry && entry.name) return entry.name;
    }
    const file = dt.files && dt.files[0];
    if (file) return (file.webkitRelativePath || file.name).split("/")[0];
    return "";
  }

  function syncChip(value) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const chip = modal.querySelector("[data-onb-chip]");
    if (!chip) return;
    const v = (value || "").trim();
    chip.hidden = !v;
    if (v) modal.querySelector("[data-onb-chip-name]").textContent = v;
  }

  /* ---------- fork + import-mode selection ---------- */

  function selectFork(fork) {
    state.fork = fork;
    const modal = document.getElementById(MODAL_ID);
    modal.querySelectorAll("[data-onb-fork]").forEach((c) => {
      const on = c.dataset.onbFork === fork;
      c.classList.toggle("is-selected", on);
      c.setAttribute("aria-checked", String(on));
    });
    refreshNav();
  }

  function setImportMode(mode) {
    state.importMode = mode;
    const modal = document.getElementById(MODAL_ID);
    modal.querySelectorAll("[data-onb-import-mode]").forEach((b) => {
      const on = b.dataset.onbImportMode === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    modal.querySelectorAll("[data-import-group]").forEach((g) => {
      g.hidden = g.dataset.importGroup !== mode;
    });
    refreshNav();
  }

  /* ---------- sequence helpers ---------- */

  function sequence() {
    // Fresh has no capture screen; everything else is the full list.
    if (state.fork === "fresh") return SCREENS.filter((s) => s !== "capture");
    return SCREENS.slice();
  }

  function goRelative(delta) {
    const seq = sequence();
    const i = seq.indexOf(state.screen);
    // Forward off the end = finish.
    if (delta > 0 && i === seq.length - 1) { close(); return; }
    const next = seq[Math.max(0, Math.min(seq.length - 1, i + delta))];
    if (next) goToScreen(next);
  }

  function goToScreen(key) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    state.screen = key;

    modal.querySelectorAll(".onb-screen").forEach((sec) => {
      sec.hidden = sec.dataset.screen !== key;
    });

    // Keep visible inputs in sync with state. Matters because the import
    // and vibe screens each render their own "additional context" box bound
    // to the same state.fields.context — without this, switching forks leaves
    // one box visually empty while state still holds the value.
    hydrateFields(modal);

    // capture sub-panels follow the chosen fork
    if (key === "capture") {
      modal.querySelectorAll("[data-capture]").forEach((cap) => {
        cap.hidden = cap.dataset.capture !== state.fork;
      });
      if (state.fork === "import") setImportMode(state.importMode);
    }

    // handoff renders the live prompt
    if (key === "handoff") {
      modal.querySelector("#onb-handoff-prompt").textContent = buildPrompt();
    }

    renderMeta();
    renderDots();
    refreshNav();
  }

  function hydrateFields(modal) {
    modal.querySelectorAll("[data-onb-field]").forEach((el) => {
      const key = el.dataset.onbField;
      const val = key === "name" || key === "purpose" ? state.basics[key] : state.fields[key];
      if (el.value !== val) el.value = val;
      if (key === "folder") syncChip(val);
    });
  }

  function renderMeta() {
    const modal = document.getElementById(MODAL_ID);
    let meta = META[state.screen];
    if (state.screen === "capture" && state.fork && FORKS[state.fork].captureMeta) {
      meta = FORKS[state.fork].captureMeta;
    }
    modal.querySelector("#onb-title").textContent = meta.title;
    const sub = modal.querySelector("#onb-sub");
    sub.textContent = meta.sub || "";
    sub.hidden = !meta.sub;

    const seq = sequence();
    modal.querySelector("#onb-progress").textContent =
      "Step " + (seq.indexOf(state.screen) + 1) + " of " + seq.length;
  }

  function renderDots() {
    const modal = document.getElementById(MODAL_ID);
    const dots = modal.querySelector("#onb-dots");
    const seq = sequence();
    const active = seq.indexOf(state.screen);
    dots.innerHTML = seq
      .map((_, i) => {
        const cls = "onb-dot" + (i === active ? " is-active" : i < active ? " is-done" : "");
        return '<span class="' + cls + '"></span>';
      })
      .join("");
  }

  /* ---------- validation + nav button state ---------- */

  function validate(screen) {
    if (screen === "basics") return Boolean(state.basics.name.trim() && state.basics.purpose.trim());
    if (screen === "fork") return Boolean(state.fork);
    if (screen === "capture") return state.fork ? FORKS[state.fork].validate() : false;
    return true;
  }

  function refreshNav() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const seq = sequence();
    const i = seq.indexOf(state.screen);
    const isLast = i === seq.length - 1;

    const back = modal.querySelector(".onb-back");
    back.hidden = i === 0;

    const next = modal.querySelector(".onb-next");
    next.textContent = isLast ? "Done" : "Next";
    next.disabled = !validate(state.screen);
  }

  /* ---------- open / close ---------- */

  function open() {
    if (state.open) return;
    buildModal();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    state.lastFocus = document.activeElement;
    state.open = true;
    modal.hidden = false;
    // Full-screen takeover: lock background scroll while open.
    document.documentElement.classList.add("onb-open");
    goToScreen("welcome");
    modal.querySelector(".onb-panel").focus();
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = true;
    state.open = false;
    document.documentElement.classList.remove("onb-open");
    writeDismissed();
    const prev = state.lastFocus;
    if (prev && typeof prev.focus === "function" && document.contains(prev)) prev.focus();
    state.lastFocus = null;
  }

  /* ---------- copy ---------- */

  async function copyPrompt() {
    const modal = document.getElementById(MODAL_ID);
    const btn = modal.querySelector("[data-onb-copy]");
    const text = modal.querySelector("#onb-handoff-prompt").textContent;
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied ✓";
    } catch {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => { btn.textContent = original; }, 1400);
  }

  /* ---------- focus trap + Esc (document-level, installed once) ---------- */

  function focusables() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return [];
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(modal.querySelectorAll(sel))
      .filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function onKeydown(e) {
    if (!state.open) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !document.getElementById(MODAL_ID).contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- sidebar "?" reopen button ---------- */

  // Lives at the bottom of the page sidebar (.lib-side), not the header. The
  // sidebar is inside <main>, which the SPA router swaps per navigation — so
  // unlike the header (which persists), this must be re-injected on every
  // loom:nav (see init()). Idempotent: bails if the current sidebar already
  // has the button. CSS pins it to the sidebar's bottom-left on desktop.
  function injectHelp() {
    const host = document.querySelector(".lib-side");
    if (!host || host.querySelector(".lib-onboard-help")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lib-onboard-help";
    btn.setAttribute("aria-label", "Getting started");
    btn.title = "Getting started";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>' +
      '<line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    btn.addEventListener("click", () => open());

    host.appendChild(btn);
  }

  /* ---------- auto-open gate ---------- */

  async function maybeAutoOpen() {
    if (readDismissed()) return;
    let initialized = false;
    try {
      const res = await fetch("../project.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        initialized = !!(json && json.initializedAt);
      }
    } catch { /* unreadable → fall back to dismissed-flag check (passed above) */ }
    if (initialized) return;
    open();
  }

  function init() {
    buildModal();
    injectHelp();
    if (!docListenersInstalled) {
      docListenersInstalled = true;
      document.addEventListener("keydown", onKeydown);
      // The "?" lives in the swappable <main> sidebar now, so re-inject it
      // into each freshly-swapped page. This listener only re-injects — it
      // never re-runs maybeAutoOpen(), so auto-open still fires once per
      // script run, not on every navigation (CLAUDE.md §21).
      document.addEventListener("loom:nav", injectHelp);
    }
    maybeAutoOpen();
  }

  window.LoomOnboarding = { open, close };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
