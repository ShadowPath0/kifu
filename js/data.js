const BACKUP_COLLECTIONS = ["games", "categories", "errors", "rank_history", "markers", "branches"];

document.addEventListener("DOMContentLoaded", () => {
  renderNav("data");
  refreshStats();
  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("import-btn").addEventListener("click", importData);
});

function refreshStats() {
  const counts = BACKUP_COLLECTIONS.map((name) => `${loadCollection(name).length} ${name}`);
  document.getElementById("export-stats").textContent = "Contenu actuel : " + counts.join(", ");
}

function exportData() {
  const payload = {
    kifu_backup_version: 1,
    exported_at: new Date().toISOString(),
    data: Object.fromEntries(BACKUP_COLLECTIONS.map((name) => [name, loadCollection(name)])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `kifu-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Export lancé");
}

async function importData() {
  const errEl = document.getElementById("import-error");
  errEl.textContent = "";
  const fileInput = document.getElementById("import-file");
  const file = fileInput.files[0];
  if (!file) {
    errEl.textContent = "Choisissez un fichier .json";
    return;
  }
  const mode = document.getElementById("import-mode").value;

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (err) {
    errEl.textContent = "Fichier JSON invalide : " + err.message;
    return;
  }
  const incoming = parsed && parsed.data ? parsed.data : parsed;
  if (!incoming || !Array.isArray(incoming.games) || !Array.isArray(incoming.categories)) {
    errEl.textContent = "Ce fichier ne ressemble pas à une sauvegarde Kifu valide.";
    return;
  }

  if (mode === "replace") {
    if (!confirm("Cela va remplacer TOUTES les données actuelles. Continuer ?")) return;
    for (const name of BACKUP_COLLECTIONS) {
      saveCollection(name, incoming[name] || []);
    }
    localStorage.setItem(
      STORAGE_PREFIX + "seq",
      JSON.stringify({
        games: maxId(incoming.games),
        categories: maxId(incoming.categories),
        errors: maxId(incoming.errors),
        rank_history: maxId(incoming.rank_history),
        markers: maxId(incoming.markers),
        branches: maxId(incoming.branches),
      })
    );
  } else {
    mergeImport(incoming);
  }

  refreshStats();
  fileInput.value = "";
  showToast("Import terminé");
}

function maxId(arr) {
  return (arr || []).reduce((max, item) => Math.max(max, item.id || 0), 0);
}

function mergeImport(incoming) {
  const categoryIdMap = new Map();
  const existingCategories = loadCollection("categories");
  const incomingCategories = incoming.categories || [];
  for (const cat of incomingCategories) {
    const existing = existingCategories.find((c) => c.name === cat.name);
    if (existing) {
      categoryIdMap.set(cat.id, existing.id);
    } else {
      const newId = nextId("categories");
      categoryIdMap.set(cat.id, newId);
      existingCategories.push({ ...cat, id: newId });
    }
  }
  saveCollection("categories", existingCategories);

  const gameIdMap = new Map();
  const existingGames = loadCollection("games");
  for (const g of incoming.games || []) {
    const newId = nextId("games");
    gameIdMap.set(g.id, newId);
    existingGames.push({ ...g, id: newId });
  }
  saveCollection("games", existingGames);

  const existingErrors = loadCollection("errors");
  for (const e of incoming.errors || []) {
    const newGameId = gameIdMap.get(e.game_id);
    if (newGameId === undefined) continue;
    existingErrors.push({
      ...e,
      id: nextId("errors"),
      game_id: newGameId,
      category_id: categoryIdMap.get(e.category_id) ?? e.category_id,
    });
  }
  saveCollection("errors", existingErrors);

  const existingRankHistory = loadCollection("rank_history");
  for (const h of incoming.rank_history || []) {
    const newGameId = h.game_id ? gameIdMap.get(h.game_id) ?? null : null;
    existingRankHistory.push({ ...h, id: nextId("rank_history"), game_id: newGameId });
  }
  saveCollection("rank_history", existingRankHistory);

  const existingMarkers = loadCollection("markers");
  for (const m of incoming.markers || []) {
    const newGameId = gameIdMap.get(m.game_id);
    if (newGameId === undefined) continue;
    existingMarkers.push({ ...m, id: nextId("markers"), game_id: newGameId });
  }
  saveCollection("markers", existingMarkers);

  const existingBranches = loadCollection("branches");
  for (const b of incoming.branches || []) {
    const newGameId = gameIdMap.get(b.game_id);
    if (newGameId === undefined) continue;
    existingBranches.push({ ...b, id: nextId("branches"), game_id: newGameId });
  }
  saveCollection("branches", existingBranches);
}
