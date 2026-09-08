document.addEventListener("DOMContentLoaded", () => {
  renderNav("reading");
  renderList();
});

// Chaque branche (variante) de chaque partie EST une séquence de lecture : pas de copie
// séparée, on lit directement les collections existantes. Mais toutes les branches ne sont
// pas dedans : seules celles explicitement enregistrées pour la lecture (bouton "📚
// Enregistrer pour la lecture" sur une branche, ou plage de coups) ont in_reading = true —
// composer une séquence sur le plateau ne suffit pas, il faut ce clic explicite.
function readingItems() {
  const games = loadCollection("games");
  const gameById = new Map(games.map((g) => [g.id, g]));
  return loadCollection("branches")
    .filter((b) => b.in_reading && gameById.has(b.game_id))
    .map((b) => ({ branch: b, game: gameById.get(b.game_id) }))
    .sort((a, b) => b.branch.id - a.branch.id);
}

function renderList() {
  const el = document.getElementById("reading-list");
  const randomEl = document.getElementById("reading-random");
  const items = readingItems();

  if (!items.length) {
    randomEl.innerHTML = "";
    el.innerHTML = `<div class="panel muted">${t("reading.empty")}</div>`;
    return;
  }

  randomEl.innerHTML = `<button type="button" class="btn primary" id="reading-random-btn">${t("reading.randomTrain")}</button>`;
  document.getElementById("reading-random-btn").addEventListener("click", () => {
    const pick = items[Math.floor(Math.random() * items.length)];
    window.location.href = `reading-train.html?branchId=${pick.branch.id}`;
  });

  el.innerHTML = items
    .map(
      ({ branch, game }) => `
      <div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 4px;">${escapeHtml(branch.name)}</h2>
          <div class="muted">${escapeHtml(t("reading.card.info", { game: game.title, n: branch.moves.length, from: branch.anchor_move_number }))}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
          <a class="btn primary" href="reading-train.html?branchId=${branch.id}">${t("reading.train")}</a>
          <a class="btn" href="game.html?id=${game.id}">${t("reading.openGame")}</a>
          <button type="button" class="btn" data-rename="${branch.id}">${t("reading.rename")}</button>
          <button type="button" class="btn" data-remove="${branch.id}">${t("reading.removeFromLibrary")}</button>
        </div>
      </div>`
    )
    .join("");

  el.querySelectorAll("button[data-rename]").forEach((btn) => {
    btn.addEventListener("click", () => renameSequence(parseInt(btn.dataset.rename, 10)));
  });
  el.querySelectorAll("button[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromLibrary(parseInt(btn.dataset.remove, 10)));
  });
}

async function renameSequence(id) {
  const branch = loadCollection("branches").find((b) => b.id === id);
  if (!branch) return;
  const name = prompt(t("reading.namePrompt"), branch.name);
  if (name === null || !name.trim()) return;
  await api.updateBranch(id, { name: name.trim() });
  renderList();
}

// Ne fait que retirer la variante de la bibliothèque de lecture (in_reading = false) —
// la branche elle-même reste sur la fiche partie, ce n'est pas une suppression.
async function removeFromLibrary(id) {
  if (!confirm(t("reading.removeConfirm"))) return;
  await api.updateBranch(id, { in_reading: false });
  showToast(t("reading.removed"));
  renderList();
}
