/* ============================================================
   data-table.js — row selection + sort indicator
   ------------------------------------------------------------
   Behaviors:
   - Click a tbody row to toggle its data-state="selected".
   - Click any thead th to cycle that column's sort:
       (no sort) → asc → desc → no sort. Only one column is
       sorted at a time. Inserts a Phosphor caret icon as a
       visual indicator and toggles it.

   Dispatches:
   - `loom:row-select` (detail.row, detail.selected:boolean)
   - `loom:sort-change`  (detail.column, detail.direction)
   ============================================================ */

(function () {
  const ATTR = '[data-loom="data-table"]';

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(table) {
    if (table.dataset.loomInit === "true") return;
    table.dataset.loomInit = "true";

    // Row selection
    table.querySelectorAll("tbody tr").forEach((row) => {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => {
        const next = row.dataset.state !== "selected";
        row.dataset.state = next ? "selected" : "";
        if (!next) row.removeAttribute("data-state");
        table.dispatchEvent(new CustomEvent("loom:row-select", {
          detail: { row, selected: next, cells: Array.from(row.cells).map((c) => c.textContent.trim()) },
          bubbles: true
        }));
      });
    });

    // Sort
    const headers = Array.from(table.querySelectorAll("thead th"));
    headers.forEach((th, colIdx) => {
      th.style.cursor = "pointer";
      // Ensure a sort indicator slot
      let indicator = th.querySelector(".dt-sort");
      if (!indicator) {
        indicator = document.createElement("i");
        indicator.className = "ph dt-sort";
        indicator.setAttribute("aria-hidden", "true");
        indicator.style.marginLeft = "6px";
        indicator.style.fontSize = "0.75rem";
        indicator.style.opacity = "0";
        indicator.style.verticalAlign = "middle";
        th.appendChild(indicator);
      }

      th.addEventListener("click", () => {
        const cur = th.dataset.sort || "";
        const next = cur === "" ? "asc" : (cur === "asc" ? "desc" : "");
        // Clear all other headers
        headers.forEach((h) => {
          h.dataset.sort = "";
          const ind = h.querySelector(".dt-sort");
          if (ind) { ind.style.opacity = "0"; ind.classList.remove("ph-arrow-up", "ph-arrow-down"); }
        });
        // Apply this one
        th.dataset.sort = next;
        if (next) {
          indicator.style.opacity = "1";
          indicator.classList.add(next === "asc" ? "ph-arrow-up" : "ph-arrow-down");
        }
        if (next) sortByColumn(table, colIdx, next);
        table.dispatchEvent(new CustomEvent("loom:sort-change", {
          detail: { column: th.textContent.trim().replace(/[↑↓]/g, "").trim(), direction: next || null },
          bubbles: true
        }));
      });
    });
  }

  function sortByColumn(table, colIdx, direction) {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const av = (a.cells[colIdx]?.textContent || "").trim();
      const bv = (b.cells[colIdx]?.textContent || "").trim();
      // Try numeric first
      const an = parseFloat(av.replace(/[^\d.-]/g, ""));
      const bn = parseFloat(bv.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return direction === "asc" ? an - bn : bn - an;
      }
      return direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomDataTable = { init };
})();
