// Stockage 100% local (localStorage) — aucun serveur requis.
// Toutes les données restent sur cette machine, dans ce navigateur.

const STORAGE_PREFIX = "kifu_v1_";

function loadCollection(name) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + name) || "[]");
  } catch (_) {
    return [];
  }
}

function saveCollection(name, arr) {
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(arr));
}

function nextId(name) {
  const seq = JSON.parse(localStorage.getItem(STORAGE_PREFIX + "seq") || "{}");
  seq[name] = (seq[name] || 0) + 1;
  localStorage.setItem(STORAGE_PREFIX + "seq", JSON.stringify(seq));
  return seq[name];
}

function nowIso() {
  return new Date().toISOString();
}

const PRESET_CATEGORIES = [
  ["Direction de jeu", "#ef4444"],
  ["Joseki", "#f97316"],
  ["Choix de fuseki global", "#f59e0b"],
  ["Invasion prématurée", "#eab308"],
  ["Tesuji manqué", "#84cc16"],
  ["Lecture insuffisante", "#22c55e"],
  ["Erreur de timing sente/gote", "#14b8a6"],
  ["Vie et mort", "#06b6d4"],
  ["Contact incorrect", "#3b82f6"],
  ["Surconcentration locale", "#6366f1"],
  ["Erreur de yose", "#a855f7"],
  ["Comptage erroné", "#ec4899"],
];

function ensureSeedData() {
  const categories = loadCollection("categories");
  if (categories.length === 0) {
    const seeded = PRESET_CATEGORIES.map(([name, color]) => ({
      id: nextId("categories"),
      name,
      color,
      is_preset: true,
    }));
    saveCollection("categories", seeded);
  }
}
ensureSeedData();

function findCategory(id) {
  return loadCollection("categories").find((c) => c.id === id) || null;
}

function rankToNumeric(rank) {
  const m = /^\s*(\d+)\s*([kKdD])\s*$/.exec(rank || "");
  if (!m) return null;
  const value = parseInt(m[1], 10);
  const letter = m[2].toLowerCase();
  return letter === "k" ? 31 - value : 30 + value;
}

function syncRankHistory(game) {
  const history = loadCollection("rank_history");
  const idx = history.findIndex((h) => h.game_id === game.id && h.source === "auto_from_game");
  if (!game.user_rank_at_time || !game.date_played) {
    if (idx !== -1) history.splice(idx, 1);
    saveCollection("rank_history", history);
    return;
  }
  const numeric = rankToNumeric(game.user_rank_at_time);
  if (numeric === null) {
    if (idx !== -1) history.splice(idx, 1);
    saveCollection("rank_history", history);
    return;
  }
  if (idx !== -1) {
    history[idx] = { ...history[idx], rank: game.user_rank_at_time, rank_numeric: numeric, date: game.date_played };
  } else {
    history.push({
      id: nextId("rank_history"),
      date: game.date_played,
      rank: game.user_rank_at_time,
      rank_numeric: numeric,
      source: "auto_from_game",
      game_id: game.id,
    });
  }
  saveCollection("rank_history", history);
}

function errorCountFor(gameId, errorsAll) {
  return (errorsAll || loadCollection("errors")).filter((e) => e.game_id === gameId).length;
}

const api = {
  // games
  async listGames(filters = {}) {
    let games = loadCollection("games");
    const errorsAll = loadCollection("errors");
    if (filters.date_from) games = games.filter((g) => g.date_played && g.date_played >= filters.date_from);
    if (filters.date_to) games = games.filter((g) => g.date_played && g.date_played <= filters.date_to);
    if (filters.user_color) games = games.filter((g) => g.user_color === filters.user_color);
    if (filters.platform) {
      const p = filters.platform.toLowerCase();
      games = games.filter((g) => (g.platform || "").toLowerCase().includes(p));
    }
    if (filters.time_control) games = games.filter((g) => g.time_control === filters.time_control);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      games = games.filter(
        (g) => (g.title || "").toLowerCase().includes(s) || (g.opponent_name || "").toLowerCase().includes(s)
      );
    }
    games = games.map((g) => ({ ...g, error_count: errorCountFor(g.id, errorsAll) }));
    games.sort((a, b) => {
      const ad = a.date_played || "";
      const bd = b.date_played || "";
      if (ad !== bd) return ad < bd ? 1 : -1;
      return b.id - a.id;
    });
    return games;
  },

  async getGame(id) {
    const numId = Number(id);
    const game = loadCollection("games").find((g) => g.id === numId);
    if (!game) throw new Error("Partie introuvable");
    const errors = loadCollection("errors")
      .filter((e) => e.game_id === numId)
      .sort((a, b) => a.move_number - b.move_number)
      .map((e) => ({ ...e, category: findCategory(e.category_id) }));
    return { ...game, error_count: errors.length, errors };
  },

  async createGame(payload) {
    const games = loadCollection("games");
    let title = payload.title;
    if (!title) {
      const opponent = payload.opponent_name || "adversaire inconnu";
      title = payload.date_played ? `vs ${opponent} — ${payload.date_played}` : `vs ${opponent}`;
    }
    const game = {
      id: nextId("games"),
      sgf_content: null,
      external_link: null,
      date_played: null,
      opponent_name: null,
      opponent_rank: null,
      user_color: null,
      user_rank_at_time: null,
      komi: null,
      time_control: null,
      platform: null,
      result: null,
      comment: null,
      ...payload,
      title,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    games.push(game);
    saveCollection("games", games);
    syncRankHistory(game);
    return { ...game, error_count: 0 };
  },

  async updateGame(id, payload) {
    const numId = Number(id);
    const games = loadCollection("games");
    const idx = games.findIndex((g) => g.id === numId);
    if (idx === -1) throw new Error("Partie introuvable");
    games[idx] = { ...games[idx], ...payload, updated_at: nowIso() };
    saveCollection("games", games);
    syncRankHistory(games[idx]);
    return { ...games[idx], error_count: errorCountFor(numId) };
  },

  async deleteGame(id) {
    const numId = Number(id);
    saveCollection(
      "games",
      loadCollection("games").filter((g) => g.id !== numId)
    );
    saveCollection(
      "errors",
      loadCollection("errors").filter((e) => e.game_id !== numId)
    );
    saveCollection(
      "rank_history",
      loadCollection("rank_history").filter((h) => h.game_id !== numId)
    );
    saveCollection(
      "markers",
      loadCollection("markers").filter((m) => m.game_id !== numId)
    );
  },

  async parseSgf(sgf_content) {
    try {
      return parseSgfText(sgf_content);
    } catch (err) {
      throw new Error(`SGF invalide: ${err.message}`);
    }
  },

  async getBoardStates(id) {
    const numId = Number(id);
    const game = loadCollection("games").find((g) => g.id === numId);
    if (!game) throw new Error("Partie introuvable");
    if (!game.sgf_content) {
      throw new Error("Cette partie n'a pas de contenu SGF (lien externe ou saisie manuelle)");
    }
    try {
      return computeBoardStates(game.sgf_content);
    } catch (err) {
      throw new Error(`SGF invalide: ${err.message}`);
    }
  },

  // categories
  async listCategories() {
    return [...loadCollection("categories")].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createCategory(payload) {
    const categories = loadCollection("categories");
    if (categories.some((c) => c.name === payload.name)) {
      throw new Error("Cette catégorie existe déjà");
    }
    const category = { id: nextId("categories"), name: payload.name, color: payload.color || "#6366f1", is_preset: false };
    categories.push(category);
    saveCollection("categories", categories);
    return category;
  },

  async updateCategory(id, payload) {
    const numId = Number(id);
    const categories = loadCollection("categories");
    const idx = categories.findIndex((c) => c.id === numId);
    if (idx === -1) throw new Error("Catégorie introuvable");
    if (payload.name !== undefined && payload.name !== null) categories[idx].name = payload.name;
    if (payload.color !== undefined && payload.color !== null) categories[idx].color = payload.color;
    saveCollection("categories", categories);
    return categories[idx];
  },

  async deleteCategory(id) {
    const numId = Number(id);
    saveCollection(
      "categories",
      loadCollection("categories").filter((c) => c.id !== numId)
    );
  },

  // game errors
  async listGameErrors(gameId) {
    const numId = Number(gameId);
    return loadCollection("errors")
      .filter((e) => e.game_id === numId)
      .sort((a, b) => a.move_number - b.move_number)
      .map((e) => ({ ...e, category: findCategory(e.category_id) }));
  },

  async createGameError(gameId, payload) {
    const numGameId = Number(gameId);
    const game = loadCollection("games").find((g) => g.id === numGameId);
    if (!game) throw new Error("Partie introuvable");
    const category = findCategory(payload.category_id);
    if (!category) throw new Error("Catégorie introuvable");
    const errors = loadCollection("errors");
    const error = {
      id: nextId("errors"),
      game_id: numGameId,
      category_id: payload.category_id,
      move_number: payload.move_number,
      phase: payload.phase,
      severity: payload.severity,
      note: payload.note || null,
      suggested_moves: payload.suggested_moves || [],
      created_at: nowIso(),
    };
    errors.push(error);
    saveCollection("errors", errors);
    return { ...error, category };
  },

  async updateGameError(id, payload) {
    const numId = Number(id);
    const errors = loadCollection("errors");
    const idx = errors.findIndex((e) => e.id === numId);
    if (idx === -1) throw new Error("Erreur introuvable");
    errors[idx] = { ...errors[idx], ...payload };
    saveCollection("errors", errors);
    return { ...errors[idx], category: findCategory(errors[idx].category_id) };
  },

  async deleteGameError(id) {
    const numId = Number(id);
    saveCollection(
      "errors",
      loadCollection("errors").filter((e) => e.id !== numId)
    );
  },

  // marqueurs de plateau (symboles libres façon OGS, indépendants des erreurs)
  async listMarkers(gameId) {
    const numId = Number(gameId);
    return loadCollection("markers").filter((m) => m.game_id === numId);
  },

  async createMarker(gameId, payload) {
    const numGameId = Number(gameId);
    const markers = loadCollection("markers");
    const marker = {
      id: nextId("markers"),
      game_id: numGameId,
      move_number: payload.move_number,
      row: payload.row,
      col: payload.col,
      symbol: payload.symbol,
      label: payload.label || null,
    };
    markers.push(marker);
    saveCollection("markers", markers);
    return marker;
  },

  async deleteMarker(id) {
    const numId = Number(id);
    saveCollection(
      "markers",
      loadCollection("markers").filter((m) => m.id !== numId)
    );
  },

  // dashboard
  async getPareto(filters = {}) {
    const games = loadCollection("games");
    const gameById = new Map(games.map((g) => [g.id, g]));
    let errors = loadCollection("errors");

    errors = errors.filter((e) => {
      const g = gameById.get(e.game_id);
      if (!g) return false;
      if (filters.date_from && !(g.date_played && g.date_played >= filters.date_from)) return false;
      if (filters.date_to && !(g.date_played && g.date_played <= filters.date_to)) return false;
      if (filters.user_color && g.user_color !== filters.user_color) return false;
      if (filters.platform && !(g.platform || "").toLowerCase().includes(filters.platform.toLowerCase())) return false;
      if (filters.phase && e.phase !== filters.phase) return false;
      if (filters.severity && e.severity !== filters.severity) return false;
      return true;
    });

    const counts = new Map();
    for (const e of errors) {
      counts.set(e.category_id, (counts.get(e.category_id) || 0) + 1);
    }
    const entries = [...counts.entries()]
      .map(([categoryId, count]) => {
        const cat = findCategory(categoryId);
        return { category_id: categoryId, category_name: cat ? cat.name : "?", color: cat ? cat.color : "#999", count };
      })
      .sort((a, b) => b.count - a.count);
    return entries;
  },

  async getPhaseSeverity(filters = {}) {
    const games = loadCollection("games");
    const gameById = new Map(games.map((g) => [g.id, g]));
    let errors = loadCollection("errors");
    errors = errors.filter((e) => {
      const g = gameById.get(e.game_id);
      if (!g) return false;
      if (filters.date_from && !(g.date_played && g.date_played >= filters.date_from)) return false;
      if (filters.date_to && !(g.date_played && g.date_played <= filters.date_to)) return false;
      if (filters.user_color && g.user_color !== filters.user_color) return false;
      if (filters.platform && !(g.platform || "").toLowerCase().includes(filters.platform.toLowerCase())) return false;
      return true;
    });
    const counts = new Map();
    for (const e of errors) {
      const key = `${e.phase}|${e.severity}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => {
      const [phase, severity] = key.split("|");
      return { phase, severity, count };
    });
  },

  async getRankHistory() {
    return [...loadCollection("rank_history")].sort((a, b) => (a.date < b.date ? -1 : 1));
  },

  async createRankEntry(payload) {
    const history = loadCollection("rank_history");
    const entry = {
      id: nextId("rank_history"),
      date: payload.date,
      rank: payload.rank,
      rank_numeric: rankToNumeric(payload.rank) || 0,
      source: "manual",
      game_id: null,
    };
    history.push(entry);
    saveCollection("rank_history", history);
    return entry;
  },
};

function suggestPhase(moveNumber) {
  if (moveNumber <= 50) return "fuseki";
  if (moveNumber <= 150) return "milieu";
  return "yose";
}

function showToast(message, isError) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = "toast show" + (isError ? " error" : "");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
