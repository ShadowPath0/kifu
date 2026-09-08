let periodType = "week";
let anchorDate = new Date();

document.addEventListener("DOMContentLoaded", () => {
  renderNav("reports");
  document.getElementById("rp-prev").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("rp-next").addEventListener("click", () => shiftPeriod(1));
  document.getElementById("rp-today").addEventListener("click", () => {
    anchorDate = new Date();
    render();
  });
  document.getElementById("rp-period-type").addEventListener("change", (e) => {
    periodType = e.target.value;
    render();
  });
  document.getElementById("rp-export-md").addEventListener("click", exportMarkdown);
  document.getElementById("rp-print").addEventListener("click", () => window.print());
  render();
});

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function currentRange() {
  if (periodType === "week") {
    const start = startOfWeek(anchorDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  return { start, end };
}

function previousRange({ start, end }) {
  if (periodType === "week") {
    const pStart = new Date(start);
    pStart.setDate(pStart.getDate() - 7);
    const pEnd = new Date(end);
    pEnd.setDate(pEnd.getDate() - 7);
    return { start: pStart, end: pEnd };
  }
  const pStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const pEnd = new Date(start.getFullYear(), start.getMonth(), 0);
  return { start: pStart, end: pEnd };
}

function shiftPeriod(dir) {
  if (periodType === "week") anchorDate.setDate(anchorDate.getDate() + dir * 7);
  else anchorDate.setMonth(anchorDate.getMonth() + dir);
  anchorDate = new Date(anchorDate);
  render();
}

function formatRangeLabel(range) {
  const locale = getLang() === "en" ? "en-US" : "fr-FR";
  const fmt = (d) => d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  if (periodType === "week") return t("reports.weekLabel", { start: fmt(range.start), end: fmt(range.end) });
  return anchorDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

async function render() {
  const range = currentRange();
  const prevRange = previousRange(range);
  document.getElementById("rp-period-type").value = periodType;
  document.getElementById("rp-label").textContent = formatRangeLabel(range);

  const [games, rankHistory] = await Promise.all([api.listGames({}), api.getRankHistory()]);
  const allErrors = loadCollection("errors");
  const categories = loadCollection("categories");

  const report = buildReport(range, games, allErrors, categories, rankHistory);
  const prevReport = buildReport(prevRange, games, allErrors, categories, rankHistory);

  window.__lastReport = { range, report, prevReport };
  document.getElementById("report-content").innerHTML = renderReportHtml(range, report, prevReport, categories);
}

function buildReport(range, games, allErrors, categories, rankHistory) {
  const startIso = toISODate(range.start);
  const endIso = toISODate(range.end);
  const periodGames = games.filter((g) => g.date_played && g.date_played >= startIso && g.date_played <= endIso);
  const gameIds = new Set(periodGames.map((g) => g.id));
  const periodErrors = allErrors.filter((e) => gameIds.has(e.game_id));

  const counts = new Map();
  for (const e of periodErrors) counts.set(e.category_id, (counts.get(e.category_id) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const bySeverity = { mineure: 0, moyenne: 0, critique: 0 };
  for (const e of periodErrors) bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;

  const sortedHistory = [...rankHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const rankAtOrBefore = (iso) => {
    const candidates = sortedHistory.filter((h) => h.date <= iso);
    return candidates.length ? candidates[candidates.length - 1] : null;
  };
  const rankStart = rankAtOrBefore(toISODate(new Date(range.start.getTime() - 86400000)));
  const rankEnd = rankAtOrBefore(endIso) || rankStart;

  return {
    games: periodGames,
    errorCount: periodErrors.length,
    counts,
    top,
    bySeverity,
    rankStart,
    rankEnd,
  };
}

function renderReportHtml(range, report, prevReport, categories) {
  const catName = (id) => categoryDisplayName(categories.find((c) => c.id === id));

  const rankLine = report.rankEnd
    ? `${report.rankEnd.rank}${
        report.rankStart && report.rankStart.rank !== report.rankEnd.rank ? t("reports.rankSince", { rank: report.rankStart.rank }) : ""
      }`
    : t("reports.rankUnknown");

  const top3 = report.top.slice(0, 3);
  const top3Html = top3.length
    ? `<ol>${top3.map(([id, count]) => `<li>${escapeHtml(t("reports.top3.occurrences", { name: catName(id), count }))}</li>`).join("")}</ol>`
    : `<p class="muted">${t("reports.top3.empty")}</p>`;

  const allCatIds = new Set([...report.counts.keys(), ...prevReport.counts.keys()]);
  const comparisonRows = [...allCatIds]
    .map((id) => {
      const cur = report.counts.get(id) || 0;
      const prev = prevReport.counts.get(id) || 0;
      return { id, cur, prev, delta: cur - prev };
    })
    .filter((r) => r.cur > 0 || r.prev > 0)
    .sort((a, b) => b.cur - a.cur);

  const comparisonHtml = comparisonRows.length
    ? `<table><thead><tr><th>${t("reports.compare.category")}</th><th>${t("reports.compare.current")}</th><th>${t(
        "reports.compare.previous"
      )}</th><th>${t("reports.compare.evolution")}</th></tr></thead><tbody>${comparisonRows
        .map((r) => {
          const arrow = r.delta > 0 ? `▲ +${r.delta}` : r.delta < 0 ? `▼ ${r.delta}` : "= 0";
          const color = r.delta > 0 ? "var(--sev-critique)" : r.delta < 0 ? "var(--sev-mineure)" : "var(--ink-soft)";
          return `<tr><td>${escapeHtml(catName(r.id))}</td><td>${r.cur}</td><td>${r.prev}</td><td style="color:${color};font-weight:600;">${arrow}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : `<p class="muted">${t("reports.compare.empty")}</p>`;

  const synthesis = buildSynthesis(report, prevReport, catName);

  return `
    <div class="stat-cards">
      <div class="stat-card"><div class="value">${report.games.length}</div><div class="label">${t("reports.stat.games")}</div></div>
      <div class="stat-card"><div class="value">${report.errorCount}</div><div class="label">${t("reports.stat.errors")}</div></div>
      <div class="stat-card"><div class="value">${report.bySeverity.critique}</div><div class="label">${t("reports.stat.critical")}</div></div>
      <div class="stat-card"><div class="value" style="font-size:1.2rem;">${escapeHtml(rankLine)}</div><div class="label">${t("reports.stat.rank")}</div></div>
    </div>

    <h3>${t("reports.synthesis.title")}</h3>
    <p>${escapeHtml(synthesis)}</p>

    <h3>${t("reports.top3.title")}</h3>
    ${top3Html}

    <h3>${t("reports.compare.title")}</h3>
    ${comparisonHtml}

    <h3>${t("reports.games.title")}</h3>
    ${
      report.games.length
        ? `<ul>${report.games
            .map((g) => `<li>${escapeHtml(t("reports.games.row", { date: g.date_played, title: g.title, count: g.error_count }))}</li>`)
            .join("")}</ul>`
        : `<p class="muted">${t("reports.games.empty")}</p>`
    }
  `;
}

function buildSynthesis(report, prevReport, catName) {
  if (!report.games.length) {
    return t("reports.synth.none");
  }
  const bits = [t("reports.synth.base", { n: report.games.length, count: report.errorCount })];
  if (report.top.length) {
    bits.push(t("reports.synth.topError", { name: catName(report.top[0][0]), count: report.top[0][1] }));
  }
  const delta = report.errorCount - prevReport.errorCount;
  if (prevReport.games.length) {
    if (delta > 0) bits.push(t("reports.synth.more", { delta }));
    else if (delta < 0) bits.push(t("reports.synth.less", { delta }));
    else bits.push(t("reports.synth.stable"));
  }
  return bits.join(", ") + ".";
}

function exportMarkdown() {
  const { range, report, prevReport } = window.__lastReport || {};
  if (!report) return;
  const categories = loadCollection("categories");
  const catName = (id) => categoryDisplayName(categories.find((c) => c.id === id));
  const label = formatRangeLabel(range);

  let md = `# Kifu — ${t("reports.title")} — ${label}\n\n`;
  md += `- ${t("reports.stat.games")}: ${report.games.length}\n`;
  md += `- ${t("reports.stat.errors")}: ${report.errorCount} (${report.bySeverity.critique} ${t("reports.stat.critical")})\n`;
  md += `- ${t("reports.stat.rank")}: ${report.rankEnd ? report.rankEnd.rank : t("reports.rankUnknown")}\n\n`;
  md += `## ${t("reports.synthesis.title")}\n\n${buildSynthesis(report, prevReport, catName)}\n\n`;
  md += `## ${t("reports.top3.title")}\n\n`;
  if (report.top.length) {
    report.top.slice(0, 3).forEach(([id, count], i) => {
      md += `${i + 1}. ${t("reports.top3.occurrences", { name: catName(id), count })}\n`;
    });
  } else {
    md += `${t("reports.top3.empty")}\n`;
  }
  md += `\n## ${t("reports.games.title")}\n\n`;
  for (const g of report.games) {
    md += `- ${t("reports.games.row", { date: g.date_played, title: g.title, count: g.error_count })}\n`;
  }

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kifu-rapport-${toISODate(range.start)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
