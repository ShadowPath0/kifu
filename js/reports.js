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
  const fmt = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  if (periodType === "week") return `Semaine du ${fmt(range.start)} au ${fmt(range.end)}`;
  return anchorDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
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
  const catName = (id) => (categories.find((c) => c.id === id) || {}).name || "?";

  const rankLine = report.rankEnd
    ? `${report.rankEnd.rank}${report.rankStart && report.rankStart.rank !== report.rankEnd.rank ? ` (depuis ${report.rankStart.rank})` : ""}`
    : "non renseigné";

  const top3 = report.top.slice(0, 3);
  const top3Html = top3.length
    ? `<ol>${top3.map(([id, count]) => `<li>${escapeHtml(catName(id))} — ${count} occurrence(s)</li>`).join("")}</ol>`
    : "<p class=\"muted\">Aucune erreur annotée sur cette période.</p>";

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
    ? `<table><thead><tr><th>Catégorie</th><th>Cette période</th><th>Période précédente</th><th>Évolution</th></tr></thead><tbody>${comparisonRows
        .map((r) => {
          const arrow = r.delta > 0 ? `▲ +${r.delta}` : r.delta < 0 ? `▼ ${r.delta}` : "= 0";
          const color = r.delta > 0 ? "var(--sev-critique)" : r.delta < 0 ? "var(--sev-mineure)" : "var(--ink-soft)";
          return `<tr><td>${escapeHtml(catName(r.id))}</td><td>${r.cur}</td><td>${r.prev}</td><td style="color:${color};font-weight:600;">${arrow}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : '<p class="muted">Pas de données comparables sur la période précédente.</p>';

  const synthesis = buildSynthesis(report, prevReport, catName);

  return `
    <div class="stat-cards">
      <div class="stat-card"><div class="value">${report.games.length}</div><div class="label">Parties jouées</div></div>
      <div class="stat-card"><div class="value">${report.errorCount}</div><div class="label">Erreurs annotées</div></div>
      <div class="stat-card"><div class="value">${report.bySeverity.critique}</div><div class="label">dont critiques</div></div>
      <div class="stat-card"><div class="value" style="font-size:1.2rem;">${escapeHtml(rankLine)}</div><div class="label">Rang</div></div>
    </div>

    <h3>Synthèse</h3>
    <p>${escapeHtml(synthesis)}</p>

    <h3>Top 3 erreurs récurrentes</h3>
    ${top3Html}

    <h3>Comparaison vs période précédente</h3>
    ${comparisonHtml}

    <h3>Parties de la période</h3>
    ${
      report.games.length
        ? `<ul>${report.games
            .map((g) => `<li>${escapeHtml(g.date_played)} — ${escapeHtml(g.title)} (${g.error_count} erreur(s))</li>`)
            .join("")}</ul>`
        : '<p class="muted">Aucune partie jouée sur cette période.</p>'
    }
  `;
}

function buildSynthesis(report, prevReport, catName) {
  if (!report.games.length) {
    return "Aucune partie jouée sur cette période.";
  }
  const bits = [`${report.games.length} partie(s) jouée(s), ${report.errorCount} erreur(s) annotée(s)`];
  if (report.top.length) {
    bits.push(`l'erreur la plus fréquente reste « ${catName(report.top[0][0])} » (${report.top[0][1]} fois)`);
  }
  const delta = report.errorCount - prevReport.errorCount;
  if (prevReport.games.length) {
    if (delta > 0) bits.push(`c'est plus d'erreurs que la période précédente (+${delta})`);
    else if (delta < 0) bits.push(`c'est moins d'erreurs que la période précédente (${delta})`);
    else bits.push("stable par rapport à la période précédente");
  }
  return bits.join(", ") + ".";
}

function exportMarkdown() {
  const { range, report, prevReport } = window.__lastReport || {};
  if (!report) return;
  const categories = loadCollection("categories");
  const catName = (id) => (categories.find((c) => c.id === id) || {}).name || "?";
  const label = formatRangeLabel(range);

  let md = `# Rapport Kifu — ${label}\n\n`;
  md += `- Parties jouées : ${report.games.length}\n`;
  md += `- Erreurs annotées : ${report.errorCount} (dont ${report.bySeverity.critique} critiques)\n`;
  md += `- Rang : ${report.rankEnd ? report.rankEnd.rank : "non renseigné"}\n\n`;
  md += `## Synthèse\n\n${buildSynthesis(report, prevReport, catName)}\n\n`;
  md += `## Top 3 erreurs récurrentes\n\n`;
  if (report.top.length) {
    report.top.slice(0, 3).forEach(([id, count], i) => {
      md += `${i + 1}. ${catName(id)} — ${count} occurrence(s)\n`;
    });
  } else {
    md += "Aucune erreur annotée.\n";
  }
  md += `\n## Parties\n\n`;
  for (const g of report.games) {
    md += `- ${g.date_played} — ${g.title} (${g.error_count} erreur(s))\n`;
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
