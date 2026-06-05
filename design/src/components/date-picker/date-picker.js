/* ============================================================
   date-picker.js — month navigation + date selection
   ------------------------------------------------------------
   Self-contained calendar logic for [data-loom="date-picker"].
   Re-renders the grid when prev/next clicked or a day chosen.
   Tracks "today" against the real current date.

   Auto-initializes every picker on DOMContentLoaded.
   ============================================================ */

(function () {
  const ATTR = '[data-loom="date-picker"]';

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function init() {
    document.querySelectorAll(ATTR).forEach(wireOne);
  }

  function wireOne(picker) {
    if (picker.dataset.loomInit === "true") return;
    picker.dataset.loomInit = "true";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // State
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let selected = parseInitialSelected(picker, today);
    // Reference to the cell currently carrying .dp-day--selected — kept in
    // sync by render() and the click handler so clicks can do a fast class
    // swap (remove from old, add to new) instead of rebuilding all 42 cells.
    let selectedCell = null;

    const title = picker.querySelector(".dp-title");
    const grid  = picker.querySelector(".dp-grid");
    const prev  = picker.querySelector(".dp-head i:first-child");
    const next  = picker.querySelector(".dp-head i:last-child");
    if (!title || !grid) return;

    function render() {
      title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
      const frag = document.createDocumentFragment();
      selectedCell = null;
      const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
      const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const daysInPrev  = new Date(view.getFullYear(), view.getMonth(), 0).getDate();

      // Leading muted days from previous month
      for (let i = firstDay - 1; i >= 0; i--) {
        frag.appendChild(makeCell(daysInPrev - i, true, false, false));
      }
      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(view.getFullYear(), view.getMonth(), d);
        const isToday = sameDay(cellDate, today);
        const isSelected = selected && sameDay(cellDate, selected);
        const cell = makeCell(d, false, isToday, isSelected, cellDate);
        if (isSelected) selectedCell = cell;
        frag.appendChild(cell);
      }
      // Trailing muted days to fill to 6 weeks (42 cells) or end of week
      const cellsSoFar = firstDay + daysInMonth;
      const trailing = (7 - (cellsSoFar % 7)) % 7;
      for (let d = 1; d <= trailing; d++) {
        frag.appendChild(makeCell(d, true, false, false));
      }

      // Single atomic swap — avoids the empty-then-rebuild flash of
      // `innerHTML = ""` + appendChild loop.
      grid.replaceChildren(frag);
    }

    function makeCell(num, muted, isToday, isSelected, date) {
      const cell = document.createElement("span");
      cell.className = "dp-day";
      if (muted) cell.classList.add("dp-day--muted");
      if (isToday) cell.classList.add("dp-day--today");
      if (isSelected) cell.classList.add("dp-day--selected");
      cell.textContent = num;
      if (!muted && date) {
        cell.addEventListener("click", () => {
          // Fast path: swap the --selected class on the old + new cells.
          // Rebuilding the whole grid here (the old behavior) caused a
          // perceptible lag + flicker on every click.
          if (selectedCell && selectedCell !== cell) {
            selectedCell.classList.remove("dp-day--selected");
          }
          cell.classList.add("dp-day--selected");
          selectedCell = cell;
          selected = date;
          picker.dispatchEvent(new CustomEvent("loom:date-select", {
            detail: { date }, bubbles: true
          }));
        });
      }
      return cell;
    }

    function sameDay(a, b) {
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth() === b.getMonth() &&
             a.getDate() === b.getDate();
    }

    if (prev) prev.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      render();
    });
    if (next) next.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      render();
    });

    render();
  }

  function parseInitialSelected(picker, today) {
    // Honor data-selected="YYYY-MM-DD" if present, else seed to today.
    const raw = picker.dataset.selected;
    if (raw) {
      const [y, m, d] = raw.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date(today);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.LoomDatePicker = { init };
})();
