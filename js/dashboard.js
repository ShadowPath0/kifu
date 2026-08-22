document.addEventListener("DOMContentLoaded", () => {
  renderNav("dashboard");
  document.getElementById("fl-apply").addEventListener("click", refresh);
  document.getElementById("fl-30d").addEventListener("click", () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    document.getElementById("fl-date-from").value = d.toISOString().slice(0, 10);
    document.getElementById("fl-date-to").value = "";
    refresh();
  });
  document.getElementById("fl-reset").addEventListener("click", () => {
    document.getElementById("fl-date-from").value = "";
    document.getElementById("fl-date-to").value = "";
    document.getElementById("fl-color").value = "";
    document.getElementById("fl-phase").value = "";
    document.getElementById("fl-severity").value = "";
    document.getElementById("fl-platform").value = "";
    refresh();
  });
  refresh();
});

function currentFilters() {
  return {
    date_from: document.getElementById("fl-date-from").value,
    date_to: document.getElementById("fl-date-to").value,
    user_color: document.getElementById("fl-color").value,
    phase: document.getElementById("fl-phase").value,
    severity: document.getElementById("fl-severity").value,
    platform: document.getElementById("fl-platform").value,
  };
}

async function refresh() {
  const filters = currentFilters();
  try {
    const [pareto, games, heatmap] = await Promise.all([
      api.getPareto(filters),
      api.listGames({
        date_from: filters.date_from,
        date_to: filters.date_to,
        user_color: filters.user_color,
        platform: filters.platform,
      }),
      api.getPhaseSeverity(filters),
    ]);
    renderStats(games, pareto);
    renderPareto(pareto);
    renderRecentGames(games.slice(0, 8));
    renderHeatmap(heatmap);
  } catch (err) {
    showToast("Erreur de chargement : " + err.message, true);
  }
}

const HEATMAP_PHASES = ["fuseki", "milieu", "yose"];
const HEATMAP_SEVERITIES = ["mineure", "moyenne", "critique"];
const HEATMAP_PHASE_LABEL = { fuseki: "Fuseki", milieu: "Milieu", yose: "Yose" };
const HEATMAP_SEV_LABEL = { mineure: "Mineure", moyenne: "Moyenne", critique: "Critique" };

function renderHeatmap(cells) {
  const container = document.getElementById("heatmap");
  const total = cells.reduce((s, c) => s + c.count, 0);
  document.getElementById("heatmap-empty").classList.toggle("hidden", total > 0);
  if (!total) {
    container.innerHTML = "";
    return;
  }
  const byKey = new Map(cells.map((c) => [`${c.phase}|${c.severity}`, c.count]));
  const max = Math.max(...cells.map((c) => c.count), 1);

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  for (const phase of HEATMAP_PHASES) html += `<th>${HEATMAP_PHASE_LABEL[phase]}</th>`;
  html += "</tr></thead><tbody>";
  for (const sev of HEATMAP_SEVERITIES) {
    html += `<tr><th>${HEATMAP_SEV_LABEL[sev]}</th>`;
    for (const phase of HEATMAP_PHASES) {
      const count = byKey.get(`${phase}|${sev}`) || 0;
      const alpha = count ? 0.15 + 0.75 * (count / max) : 0;
      html += `<td class="heatmap-cell" style="background:rgba(239,68,68,${alpha})">${count || ""}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderStats(games, pareto) {
  const totalErrors = pareto.reduce((s, p) => s + p.count, 0);
  const el = document.getElementById("stat-cards");
  el.innerHTML = `
    <div class="stat-card"><div class="value">${games.length}</div><div class="label">Parties</div></div>
    <div class="stat-card"><div class="value">${totalErrors}</div><div class="label">Erreurs taguées</div></div>
    <div class="stat-card"><div class="value">${games.length ? (totalErrors / games.length).toFixed(1) : "—"}</div><div class="label">Erreurs / partie</div></div>
  `;
}

function renderPareto(entries) {
  const container = document.getElementById("pareto-chart");
  document.getElementById("pareto-empty").classList.toggle("hidden", entries.length > 0);
  container.innerHTML = "";
  const max = Math.max(...entries.map((e) => e.count), 1);
  for (const e of entries) {
    const row = document.createElement("div");
    row.className = "pareto-row";
    row.innerHTML = `
      <div>${escapeHtml(e.category_name)}</div>
      <div class="pareto-bar-bg"><div class="pareto-bar-fill" style="width:${(e.count / max) * 100}%;background:${e.color}"></div></div>
      <div>${e.count}</div>
    `;
    container.appendChild(row);
  }
}

function renderRecentGames(games) {
  const el = document.getElementById("recent-games");
  if (!games.length) {
    el.innerHTML = '<p class="muted">Aucune partie encore importée.</p>';
    return;
  }
  el.innerHTML = games
    .map(
      (g) => `
      <div class="error-item" onclick="window.location.href='game.html?id=${g.id}'">
        <div style="flex:1;">
          <div>${escapeHtml(g.title)}</div>
          <div class="muted">${escapeHtml(g.date_played || "")} · ${g.error_count} erreur(s)</div>
        </div>
      </div>`
    )
    .join("");
}
