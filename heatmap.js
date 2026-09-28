/*
 * ClaudeHeatmap — shared GitHub-style contribution calendar.
 * Embed identically on any site:
 *
 *   <div id="claude-heatmap"></div>
 *   <p id="claude-heatmap-heading"></p>
 *   <script src="https://electra-usa.github.io/portfolio-shared/heatmap.js"></script>
 *   <script>
 *     ClaudeHeatmap.render({
 *       container: "claude-heatmap",
 *       headingEl: "claude-heatmap-heading",
 *       dataUrl: "https://electra-usa.github.io/portfolio-shared/claude-usage.json"
 *     });
 *   </script>
 *
 * Data format (claude-usage.json): [{ "date": "YYYY-MM-DD", "count": 0 }, ...]
 * Placeholder data today — see README.md in this repo for how to wire up real logging.
 */
(function (global) {
  const LEVELS = [0, 2, 5, 9]; // count thresholds for color levels 1-4 (0 = no activity)
  const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
  const MS_DAY = 86400000;

  function injectStyles() {
    if (document.getElementById("claude-heatmap-styles")) return;
    const style = document.createElement("style");
    style.id = "claude-heatmap-styles";
    style.textContent = `
      .ch-wrap { font-family: inherit; }
      .ch-heading { font-size: 15px; font-weight: 600; margin: 0 0 14px; }
      .ch-card {
        border: 1px solid var(--ch-border, #e4e6ea);
        border-radius: 12px;
        padding: 18px 20px 14px;
        overflow-x: auto;
        background: var(--ch-surface, #ffffff);
      }
      .ch-months { display: flex; margin-left: 30px; font-size: 12px; color: var(--ch-muted, #6b7280); margin-bottom: 4px; }
      .ch-body { display: flex; }
      .ch-daylabels { display: flex; flex-direction: column; justify-content: space-between; margin-right: 6px; font-size: 11px; color: var(--ch-muted, #6b7280); }
      .ch-daylabels span { height: 12px; line-height: 12px; margin-bottom: 3px; }
      .ch-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); gap: 3px; }
      .ch-cell { width: 12px; height: 12px; border-radius: 2.5px; background: var(--ch-l0, #ebedf0); }
      .ch-cell[data-level="1"] { background: var(--ch-l1, #9be9a8); }
      .ch-cell[data-level="2"] { background: var(--ch-l2, #40c463); }
      .ch-cell[data-level="3"] { background: var(--ch-l3, #30a14e); }
      .ch-cell[data-level="4"] { background: var(--ch-l4, #216e39); }
      .ch-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 12.5px; color: var(--ch-muted, #6b7280); }
      .ch-legend { display: flex; align-items: center; gap: 4px; }
      .ch-legend .ch-cell { width: 10px; height: 10px; }
      .ch-stats { font-size: 12.5px; color: var(--ch-muted, #6b7280); }
      @media (prefers-color-scheme: dark) {
        .ch-card { border-color: #262a33; background: #171a21; }
      }
    `;
    document.head.appendChild(style);
  }

  function levelFor(count) {
    if (count <= LEVELS[0]) return 0;
    if (count <= LEVELS[1]) return 1;
    if (count <= LEVELS[2]) return 2;
    if (count <= LEVELS[3]) return 3;
    return 4;
  }

  function computeStreaks(byDate, orderedDates) {
    let total = 0, longest = 0, running = 0, current = 0;
    const today = orderedDates[orderedDates.length - 1];
    for (let i = 0; i < orderedDates.length; i++) {
      const c = byDate[orderedDates[i]] || 0;
      total += c;
      if (c > 0) { running++; longest = Math.max(longest, running); }
      else { running = 0; }
    }
    for (let i = orderedDates.length - 1; i >= 0; i--) {
      if ((byDate[orderedDates[i]] || 0) > 0) current++;
      else break;
    }
    return { total, longest, current };
  }

  async function render(opts) {
    const { container, headingEl, dataUrl } = opts;
    injectStyles();
    const el = document.getElementById(container);
    const heading = headingEl ? document.getElementById(headingEl) : null;
    if (!el) return;

    let data = [];
    try {
      const res = await fetch(dataUrl, { cache: "no-store" });
      data = await res.json();
    } catch (e) {
      el.innerHTML = '<p style="color:#b23b3b;font-size:13px;">Couldn\'t load activity data.</p>';
      return;
    }

    const byDate = {};
    data.forEach((d) => { byDate[d.date] = d.count; });

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 364 * MS_DAY);
    // align start back to the most recent Sunday on/before `start`
    const alignedStart = new Date(start.getTime() - start.getDay() * MS_DAY);

    const orderedDates = [];
    for (let t = alignedStart.getTime(); t <= end.getTime(); t += MS_DAY) {
      orderedDates.push(new Date(t).toISOString().slice(0, 10));
    }

    const weeks = [];
    for (let i = 0; i < orderedDates.length; i += 7) {
      weeks.push(orderedDates.slice(i, i + 7));
    }

    const stats = computeStreaks(byDate, orderedDates.filter((d) => d >= start.toISOString().slice(0, 10)));

    if (heading) {
      heading.textContent = `${stats.total.toLocaleString()} Claude sessions in the last year`;
    }

    let monthsHtml = "";
    let lastMonth = -1;
    weeks.forEach((week) => {
      const d = new Date(week[0]);
      const m = d.getMonth();
      if (m !== lastMonth) {
        monthsHtml += `<span style="width:15px;flex:0 0 auto;">${d.toLocaleString("en-US", { month: "short" })}</span>`;
        lastMonth = m;
      } else {
        monthsHtml += `<span style="width:15px;flex:0 0 auto;"></span>`;
      }
    });

    let gridHtml = "";
    weeks.forEach((week) => {
      week.forEach((dateStr) => {
        const count = byDate[dateStr] || 0;
        const inRange = dateStr >= start.toISOString().slice(0, 10);
        const level = inRange ? levelFor(count) : 0;
        const title = inRange ? `${count} on ${dateStr}` : "";
        gridHtml += `<div class="ch-cell" data-level="${inRange ? level : ''}" title="${title}"></div>`;
      });
    });

    el.innerHTML = `
      <div class="ch-wrap">
        <div class="ch-card">
          <div class="ch-months">${monthsHtml}</div>
          <div class="ch-body">
            <div class="ch-daylabels">${DAY_LABELS.map((l) => `<span>${l}</span>`).join("")}</div>
            <div class="ch-grid">${gridHtml}</div>
          </div>
          <div class="ch-footer">
            <span class="ch-stats">Current streak: ${stats.current}d &nbsp;·&nbsp; Longest streak: ${stats.longest}d</span>
            <span class="ch-legend">Less
              <div class="ch-cell" data-level="0"></div>
              <div class="ch-cell" data-level="1"></div>
              <div class="ch-cell" data-level="2"></div>
              <div class="ch-cell" data-level="3"></div>
              <div class="ch-cell" data-level="4"></div>
            More</span>
          </div>
        </div>
      </div>
    `;
  }

  global.ClaudeHeatmap = { render };
})(window);
