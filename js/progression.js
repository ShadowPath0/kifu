function numericToRankLabel(n) {
  return n <= 30 ? `${31 - n}k` : `${n - 30}d`;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("progression");
  document.getElementById("rank-add-btn").addEventListener("click", addRankEntry);
  await refresh();
});

async function refresh() {
  const [rankHistory, games] = await Promise.all([api.getRankHistory(), api.listGames({})]);
  const allErrors = loadCollection("errors");
  renderChart(rankHistory, games, allErrors);
  renderPersistentTable(games, allErrors);
}

async function addRankEntry() {
  const errEl = document.getElementById("rank-error");
  errEl.textContent = "";
  const date = document.getElementById("rank-date").value;
  const rank = document.getElementById("rank-value").value.trim();
  if (!date || !rank) {
    errEl.textContent = "Date et rang requis";
    return;
  }
  if (rankToNumeric(rank) === null) {
    errEl.textContent = "Format de rang invalide (ex : 1d, 5k)";
    return;
  }
  await api.createRankEntry({ date, rank });
  document.getElementById("rank-value").value = "";
  showToast("Entrée de rang ajoutée");
  refresh();
}

// ---------- graphique SVG (rang + erreurs critiques par partie) ----------

function renderChart(rankHistory, games, allErrors) {
  const container = document.getElementById("progression-chart");
  const datedGames = games.filter((g) => g.date_played).sort((a, b) => (a.date_played < b.date_played ? -1 : 1));

  if (rankHistory.length < 2 && datedGames.length < 2) {
    document.getElementById("progression-empty").classList.remove("hidden");
    container.innerHTML = "";
    return;
  }
  document.getElementById("progression-empty").classList.add("hidden");

  const critByGame = new Map();
  for (const e of allErrors) {
    if (e.severity !== "critique") continue;
    critByGame.set(e.game_id, (critByGame.get(e.game_id) || 0) + 1);
  }

  const allDates = [...rankHistory.map((h) => h.date), ...datedGames.map((g) => g.date_played)].sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const dateSpan = Math.max(1, dateDiffDays(minDate, maxDate));

  const width = Math.max(700, datedGames.length * 24 + 120);
  const height = 340;
  const margin = { top: 20, right: 60, bottom: 40, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const x = (date) => margin.left + (dateDiffDays(minDate, date) / dateSpan) * plotW;

  const rankValues = rankHistory.map((h) => h.rank_numeric);
  const rankMin = rankValues.length ? Math.min(...rankValues) - 1 : 0;
  const rankMax = rankValues.length ? Math.max(...rankValues) + 1 : 1;
  const yRank = (v) => margin.top + plotH - ((v - rankMin) / (rankMax - rankMin || 1)) * plotH;

  const errMax = Math.max(1, ...datedGames.map((g) => critByGame.get(g.id) || 0));
  const yErr = (v) => margin.top + plotH - (v / errMax) * plotH;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="inherit">`;

  // axes
  svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#c4a76a" />`;
  svg += `<line x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}" stroke="#c4a76a" />`;
  svg += `<line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + plotH}" stroke="#ef4444" opacity="0.4" />`;

  // barres erreurs critiques (axe droit)
  const barW = Math.min(16, plotW / Math.max(1, datedGames.length) - 4);
  for (const g of datedGames) {
    const count = critByGame.get(g.id) || 0;
    if (!count) continue;
    const cx = x(g.date_played);
    const y0 = yErr(0);
    const y1 = yErr(count);
    svg += `<rect x="${cx - barW / 2}" y="${y1}" width="${barW}" height="${y0 - y1}" fill="#ef444455" stroke="#ef4444" stroke-width="0.5"><title>${escapeHtml(g.title)} — ${count} erreur(s) critique(s)</title></rect>`;
  }

  // courbe de rang (axe gauche)
  if (rankHistory.length) {
    const points = rankHistory.map((h) => `${x(h.date)},${yRank(h.rank_numeric)}`).join(" ");
    svg += `<polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="2.5" />`;
    for (const h of rankHistory) {
      svg += `<circle cx="${x(h.date)}" cy="${yRank(h.rank_numeric)}" r="3.5" fill="#6366f1"><title>${h.date} — ${h.rank}</title></circle>`;
    }
    // ticks axe gauche
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = rankMin + ((rankMax - rankMin) * i) / steps;
      svg += `<text x="${margin.left - 8}" y="${yRank(v) + 4}" font-size="10" fill="#5a564d" text-anchor="end">${numericToRankLabel(Math.round(v))}</text>`;
    }
  }

  // ticks axe droit (erreurs critiques)
  const errSteps = Math.min(errMax, 4);
  for (let i = 0; i <= errSteps; i++) {
    const v = Math.round((errMax * i) / errSteps);
    svg += `<text x="${width - margin.right + 8}" y="${yErr(v) + 4}" font-size="10" fill="#ef4444" text-anchor="start">${v}</text>`;
  }

  // légende
  svg += `<text x="${margin.left}" y="14" font-size="11" fill="#6366f1">● rang</text>`;
  svg += `<text x="${width - margin.right - 90}" y="14" font-size="11" fill="#ef4444">■ erreurs critiques / partie</text>`;

  svg += `</svg>`;
  container.innerHTML = svg;
}

function dateDiffDays(a, b) {
  return (new Date(b) - new Date(a)) / 86400000;
}

// ---------- erreurs persistantes (top-3 Pareto stable sur 3 périodes) ----------

function renderPersistentTable(games, allErrors) {
  const el = document.getElementById("persist-table");
  const datedGames = [...games].filter((g) => g.date_played).sort((a, b) => (a.date_played < b.date_played ? -1 : 1));

  if (datedGames.length < 6) {
    document.getElementById("persist-empty").classList.remove("hidden");
    el.innerHTML = "";
    return;
  }
  document.getElementById("persist-empty").classList.add("hidden");

  const third = Math.ceil(datedGames.length / 3);
  const periods = [datedGames.slice(0, third), datedGames.slice(third, third * 2), datedGames.slice(third * 2)];
  const categories = loadCollection("categories");
  const catName = (id) => (categories.find((c) => c.id === id) || {}).name || "?";

  const periodTop3 = periods.map((periodGames) => {
    const gameIds = new Set(periodGames.map((g) => g.id));
    const counts = new Map();
    for (const e of allErrors) {
      if (!gameIds.has(e.game_id)) continue;
      counts.set(e.category_id, (counts.get(e.category_id) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  });

  const persistentIds = periodTop3[0]
    .map(([id]) => id)
    .filter((id) => periodTop3[1].some(([id2]) => id2 === id) && periodTop3[2].some(([id2]) => id2 === id));

  if (!persistentIds.length) {
    el.innerHTML = '<p class="muted">Aucune catégorie ne reste dans le top 3 sur les 3 périodes — bon signe.</p>';
    return;
  }

  let html = '<table class="persist-table"><thead><tr><th>Catégorie</th><th>Période 1</th><th>Période 2</th><th>Période 3</th></tr></thead><tbody>';
  for (const id of persistentIds) {
    html += `<tr><td>${escapeHtml(catName(id))}</td>`;
    for (const top3 of periodTop3) {
      const entry = top3.find(([cid]) => cid === id);
      html += `<td>${entry ? entry[1] + " erreur(s)" : "—"}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  el.innerHTML = html;
}
