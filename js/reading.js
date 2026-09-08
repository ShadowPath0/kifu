document.addEventListener("DOMContentLoaded", () => {
  renderNav("reading");
  renderList();
});

// Chaque branche (variante) de chaque partie EST une séquence de lecture : pas de copie
// séparée, on lit directement les collections existantes. Une variante terminée dans une
// review apparaît donc ici automatiquement.
function readingItems() {
  const games = loadCollection("games");
  const gameById = new Map(games.map((g) => [g.id, g]));
  return loadCollection("branches")
    .filter((b) => gameById.has(b.game_id))
    .map((b) => ({ branch: b, game: gameById.get(b.game_id) }))
    .sort((a, b) => b.branch.id - a.branch.id);
}

function renderList() {
  const el = document.getElementById("reading-list");
  const items = readingItems();

  if (!items.length) {
    el.innerHTML = `<div class="panel muted">${t("reading.empty")}</div>`;
    return;
  }

  el.innerHTML = items
    .map(
      ({ branch, game }) => `
      <div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 4px;">${escapeHtml(branch.name)}</h2>
          <div class="muted">${escapeHtml(t("reading.card.info", { game: game.title, n: branch.moves.length, from: branch.anchor_move_number }))}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <a class="btn primary" href="reading-train.html?branchId=${branch.id}">${t("reading.train")}</a>
          <a class="btn" href="game.html?id=${game.id}">${t("reading.openGame")}</a>
        </div>
      </div>`
    )
    .join("");
}
