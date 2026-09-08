document.addEventListener("DOMContentLoaded", () => {
  renderNav("pro-games");
  const el = document.getElementById("pro-games-list");
  el.innerHTML = PRO_GAMES.map(
    (g) => `
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
      <div>
        <h2 style="margin:0 0 4px;">${escapeHtml(g.title)}</h2>
        <div class="muted">${escapeHtml(g.black)} (${escapeHtml(g.blackRank || "?")}) vs ${escapeHtml(g.white)} (${escapeHtml(g.whiteRank || "?")}) · ${escapeHtml(g.date || "")} · ${escapeHtml(g.result || "")}</div>
        ${g.event ? `<div class="muted" style="font-size:0.82rem;">${escapeHtml(g.event)}</div>` : ""}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <a class="btn" href="pro-game.html?id=${encodeURIComponent(g.id)}&mode=normal">${t("proGames.replay")}</a>
        <a class="btn primary" href="pro-game.html?id=${encodeURIComponent(g.id)}&mode=guess">${t("proGames.guess")}</a>
      </div>
    </div>`
  ).join("");
});
