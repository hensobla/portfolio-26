/* ============================================================
   combobox.js — filter logic + keyboard navigation
   ------------------------------------------------------------
   For [data-loom="combobox"]. Filters the .cb-menu options as
   the user types in the input. Arrow keys move highlight;
   Enter picks the highlighted option; Escape closes.

   Initial menu items are scanned from the DOM — no remote data
   model. Highlight uses <mark> wrapping for the matched substring.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="combobox"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(cb) {
    if (cb.dataset.loomInit === "true") return;
    cb.dataset.loomInit = "true";

    const input = cb.querySelector(".cb-field input");
    const menu  = cb.querySelector(".cb-menu");
    const count = cb.querySelector(".cb-count");
    if (!input || !menu) return;

    // Snapshot initial items (text + outerHTML) so we can re-render on filter.
    const items = Array.from(menu.querySelectorAll("li[role='option']")).map((li) => ({
      el: li,
      text: li.textContent.trim()
    }));
    if (items.length === 0) return;

    // Cache the unwrapped <span> child template by stripping <mark> wrappers
    items.forEach((it) => {
      const span = it.el.querySelector("span");
      if (span) it.htmlBefore = it.el.outerHTML.replace(/<mark>(.*?)<\/mark>/gi, "$1");
      else it.htmlBefore = it.el.outerHTML;
    });

    function render(query) {
      const q = query.trim().toLowerCase();
      const filtered = q === ""
        ? items
        : items.filter((it) => it.text.toLowerCase().includes(q));

      menu.innerHTML = "";

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "cb-empty";
        empty.textContent = `NO RESULTS FOR "${query}"`;
        menu.appendChild(empty);
      } else {
        filtered.forEach((it, i) => {
          // Re-wrap match with <mark>
          let html = it.htmlBefore;
          if (q) {
            const re = new RegExp(`(${escapeRegex(q)})`, "gi");
            html = html.replace(/(<span>)([^<]*)(<\/span>)/i, (m, a, content, c) => {
              return a + content.replace(re, "<mark>$1</mark>") + c;
            });
          }
          const wrap = document.createElement("div");
          wrap.innerHTML = html;
          const li = wrap.firstElementChild;
          li.setAttribute("aria-selected", i === 0 ? "true" : "false");
          li.addEventListener("click", () => {
            input.value = it.text;
            render(it.text);
            cb.dispatchEvent(new CustomEvent("loom:combobox-select", {
              detail: { text: it.text }, bubbles: true
            }));
          });
          menu.appendChild(li);
        });
      }

      if (count) {
        count.textContent = filtered.length === 0
          ? "0 results"
          : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
      }
    }

    function moveHighlight(delta) {
      const lis = Array.from(menu.querySelectorAll("li[role='option']"));
      if (lis.length === 0) return;
      let idx = lis.findIndex((li) => li.getAttribute("aria-selected") === "true");
      if (idx < 0) idx = 0;
      lis[idx].setAttribute("aria-selected", "false");
      idx = (idx + delta + lis.length) % lis.length;
      lis[idx].setAttribute("aria-selected", "true");
      lis[idx].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", (e) => render(e.target.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { moveHighlight(1); e.preventDefault(); }
      else if (e.key === "ArrowUp") { moveHighlight(-1); e.preventDefault(); }
      else if (e.key === "Enter") {
        const li = menu.querySelector("li[aria-selected='true']");
        if (li) li.click();
        e.preventDefault();
      } else if (e.key === "Escape") {
        input.value = "";
        render("");
      }
    });

    // Initial render honors any pre-filled value in the input
    render(input.value);
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomCombobox = { init };
})();
