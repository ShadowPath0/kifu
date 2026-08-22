const PHASE_LABEL = { fuseki: "Fuseki", milieu: "Milieu", yose: "Yose" };
const COLOR_LABEL = { black: "Noir", white: "Blanc" };

let gameId, game, categories, boardData, errors, goban;
let currentMoveIndex = 0;
let pendingSuggestedMoves = [];
let pickingMode = false;
let editingErrorId = null;
let markers = [];
let markerTool = null;

const MARKER_TOOL_LABEL = {
  triangle: "Triangle",
  square: "Carré",
  circle: "Cercle",
  cross: "Croix",
  letter: "Lettre",
  number: "Chiffre",
  erase: "Effacer",
};

const COL_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
function formatCoord(row, col) {
  return `${COL_LETTERS[col] || "?"}${row + 1}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("games");
  const params = new URLSearchParams(window.location.search);
  gameId = params.get("id");
  if (!gameId) {
    document.body.innerHTML = "<main><p>Aucune partie spécifiée.</p></main>";
    return;
  }

  try {
    [game, categories] = await Promise.all([api.getGame(gameId), api.listCategories()]);
  } catch (err) {
    showToast("Impossible de charger la partie : " + err.message, true);
    return;
  }
  errors = game.errors || [];

  renderMeta();
  setupMetaEdit();
  setupComment();
  populateCategorySelect();
  document.getElementById("am-cancel").addEventListener("click", closeAnnotateModal);
  document.getElementById("am-save").addEventListener("click", saveAnnotation);

  if (game.sgf_content) {
    try {
      boardData = await api.getBoardStates(gameId);
      markers = await api.listMarkers(gameId);
      document.getElementById("goban-section").classList.remove("hidden");
      goban = new Goban(document.getElementById("goban-canvas"), boardData.size);
      setupBoardControls();
      setMoveIndex(boardData.states.length - 1);
    } catch (err) {
      document.getElementById("no-sgf-msg").textContent =
        "Erreur de chargement du plateau : " + err.message;
      document.getElementById("no-sgf-msg").classList.remove("hidden");
      setupManualErrors();
    }
  } else {
    document.getElementById("no-sgf-msg").classList.remove("hidden");
    setupManualErrors();
  }

  document.getElementById("meta-delete-btn").addEventListener("click", deleteGame);
});

// ---------- meta ----------

function renderMeta() {
  document.getElementById("meta-title").textContent = game.title;
  const bits = [];
  if (game.opponent_name) bits.push(`vs ${game.opponent_name}${game.opponent_rank ? " (" + game.opponent_rank + ")" : ""}`);
  if (game.date_played) bits.push(game.date_played);
  if (game.user_color) bits.push(`Vous jouiez ${COLOR_LABEL[game.user_color]}${game.user_rank_at_time ? " — " + game.user_rank_at_time : ""}`);
  if (game.result) bits.push(`Résultat : ${game.result}`);
  if (game.komi !== null && game.komi !== undefined) bits.push(`Komi ${game.komi}`);
  if (game.time_control) bits.push(game.time_control);
  if (game.platform) bits.push(game.platform);
  document.getElementById("meta-summary").textContent = bits.join(" · ");

  const extEl = document.getElementById("meta-external");
  extEl.innerHTML = game.external_link
    ? `<a href="${escapeHtml(game.external_link)}" target="_blank" rel="noopener">Ouvrir la review externe ↗</a>`
    : "";

  document.getElementById("comment-text").value = game.comment || "";
}

function setupMetaEdit() {
  const form = document.getElementById("meta-edit-form");
  document.getElementById("meta-edit-btn").addEventListener("click", () => {
    document.getElementById("e-title").value = game.title || "";
    document.getElementById("e-date").value = game.date_played || "";
    document.getElementById("e-opponent").value = game.opponent_name || "";
    document.getElementById("e-opponent-rank").value = game.opponent_rank || "";
    document.getElementById("e-color").value = game.user_color || "";
    document.getElementById("e-user-rank").value = game.user_rank_at_time || "";
    document.getElementById("e-komi").value = game.komi ?? "";
    document.getElementById("e-result").value = game.result || "";
    document.getElementById("e-time-control").value = game.time_control || "";
    document.getElementById("e-platform").value = game.platform || "";
    document.getElementById("e-external-link").value = game.external_link || "";
    form.classList.remove("hidden");
  });
  document.getElementById("meta-cancel-btn").addEventListener("click", () => form.classList.add("hidden"));
  document.getElementById("meta-save-btn").addEventListener("click", async () => {
    const payload = {
      title: document.getElementById("e-title").value || null,
      date_played: document.getElementById("e-date").value || null,
      opponent_name: document.getElementById("e-opponent").value || null,
      opponent_rank: document.getElementById("e-opponent-rank").value || null,
      user_color: document.getElementById("e-color").value || null,
      user_rank_at_time: document.getElementById("e-user-rank").value || null,
      komi: document.getElementById("e-komi").value ? parseFloat(document.getElementById("e-komi").value) : null,
      result: document.getElementById("e-result").value || null,
      time_control: document.getElementById("e-time-control").value || null,
      platform: document.getElementById("e-platform").value || null,
      external_link: document.getElementById("e-external-link").value || null,
    };
    try {
      game = { ...game, ...(await api.updateGame(gameId, payload)) };
      renderMeta();
      form.classList.add("hidden");
      showToast("Informations mises à jour");
    } catch (err) {
      showToast("Erreur : " + err.message, true);
    }
  });
}

async function deleteGame() {
  if (!confirm("Supprimer définitivement cette partie et ses annotations ?")) return;
  try {
    await api.deleteGame(gameId);
    window.location.href = "games.html";
  } catch (err) {
    showToast("Erreur : " + err.message, true);
  }
}

function setupComment() {
  document.getElementById("comment-save-btn").addEventListener("click", async () => {
    try {
      await api.updateGame(gameId, { comment: document.getElementById("comment-text").value });
      showToast("Commentaire enregistré");
    } catch (err) {
      showToast("Erreur : " + err.message, true);
    }
  });
}

// ---------- categories ----------

function populateCategorySelect() {
  const sel = document.getElementById("am-category");
  sel.innerHTML = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

function categoryById(id) {
  return categories.find((c) => c.id === id);
}

// ---------- board / goban ----------

function setupBoardControls() {
  const slider = document.getElementById("ctl-slider");
  slider.max = boardData.states.length - 1;
  slider.addEventListener("input", () => setMoveIndex(parseInt(slider.value, 10)));
  document.getElementById("ctl-first").addEventListener("click", () => setMoveIndex(0));
  document.getElementById("ctl-prev").addEventListener("click", () => setMoveIndex(Math.max(0, currentMoveIndex - 1)));
  document.getElementById("ctl-next").addEventListener("click", () =>
    setMoveIndex(Math.min(boardData.states.length - 1, currentMoveIndex + 1))
  );
  document.getElementById("ctl-last").addEventListener("click", () => setMoveIndex(boardData.states.length - 1));
  document.getElementById("ctl-jump").addEventListener("change", (e) => {
    const n = parseInt(e.target.value, 10);
    if (!isNaN(n)) setMoveIndex(Math.max(0, Math.min(boardData.states.length - 1, n)));
  });
  document.getElementById("goban-canvas").addEventListener("click", (e) => {
    if (pickingMode) {
      togglePickedPoint(e);
    } else if (markerTool) {
      handleMarkerClick(e);
    } else {
      openAnnotateModal(currentMoveIndex);
    }
  });
  document.getElementById("annotate-btn").addEventListener("click", () => openAnnotateModal(currentMoveIndex));
  document.getElementById("am-pick-suggestions-btn").addEventListener("click", startPickingSuggestions);
  document.getElementById("picking-done-btn").addEventListener("click", finishPickingSuggestions);

  document.querySelectorAll(".marker-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      markerTool = markerTool === btn.dataset.symbol ? null : btn.dataset.symbol;
      updateMarkerToolbarUI();
    });
  });
}

function updateMarkerToolbarUI() {
  document.querySelectorAll(".marker-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.symbol === markerTool);
  });
  document.getElementById("marker-active-label").textContent = markerTool
    ? `Cliquez sur le plateau : ${MARKER_TOOL_LABEL[markerTool]}`
    : "";
}

function errorRingMarkers(i) {
  return errors
    .filter((e) => e.move_number > 0 && e.move_number <= i)
    .map((e) => {
      const mv = boardData.moves[e.move_number];
      if (!mv || mv.pass) return null;
      return { row: mv.row, col: mv.col, color: e.category.color, severity: e.severity };
    })
    .filter(Boolean);
}

function suggestionMarkersFor(i) {
  return errors
    .filter((e) => e.move_number > 0 && e.move_number <= i)
    .flatMap((e) => (e.suggested_moves || []).map((p) => ({ row: p.row, col: p.col, label: formatCoord(p.row, p.col) })));
}

function symbolMarkersFor(i) {
  return markers.filter((m) => m.move_number === i);
}

function setMoveIndex(i) {
  currentMoveIndex = i;
  document.getElementById("ctl-slider").value = i;
  const move = boardData.moves[i];
  document.getElementById("ctl-move-label").textContent =
    i === 0 ? "Coup 0 (position initiale)" : `Coup ${i} — ${move.color === "b" ? "Noir" : "Blanc"}${move.pass ? " (passe)" : ""}`;

  goban.draw(boardData.states[i], move, errorRingMarkers(i), suggestionMarkersFor(i), symbolMarkersFor(i));
  renderErrorList();
}

// ---------- symboles libres (façon OGS) ----------

async function handleMarkerClick(clickEvent) {
  const pos = goban.pixelToPos(clickEvent.offsetX, clickEvent.offsetY);
  if (!pos) return;
  const i = currentMoveIndex;
  const existing = markers.find((m) => m.move_number === i && m.row === pos.row && m.col === pos.col);

  if (existing) {
    await api.deleteMarker(existing.id);
    markers = markers.filter((m) => m.id !== existing.id);
    if (markerTool === "erase" || existing.symbol === markerTool) {
      setMoveIndex(i);
      return;
    }
  } else if (markerTool === "erase") {
    return;
  }

  let label = null;
  if (markerTool === "letter") {
    const count = markers.filter((m) => m.move_number === i && m.symbol === "letter").length;
    label = String.fromCharCode(65 + (count % 26));
  } else if (markerTool === "number") {
    const count = markers.filter((m) => m.move_number === i && m.symbol === "number").length;
    label = String(count + 1);
  }
  const created = await api.createMarker(gameId, { move_number: i, row: pos.row, col: pos.col, symbol: markerTool, label });
  markers.push(created);
  setMoveIndex(i);
}

// ---------- coup(s) recommandé(s) : sélection sur le plateau ----------

function startPickingSuggestions() {
  closeAnnotateModal();
  pickingMode = true;
  markerTool = null;
  updateMarkerToolbarUI();
  document.getElementById("picking-banner").classList.remove("hidden");
  renderPickingBoard();
}

function finishPickingSuggestions() {
  pickingMode = false;
  document.getElementById("picking-banner").classList.add("hidden");
  goban.draw(...lastNormalDrawArgs());
  document.getElementById("annotate-modal").classList.remove("hidden");
  renderSuggestionChips();
}

function lastNormalDrawArgs() {
  const i = currentMoveIndex;
  return [boardData.states[i], boardData.moves[i], errorRingMarkers(i), suggestionMarkersFor(i), symbolMarkersFor(i)];
}

function pickingMoveNumber() {
  return parseInt(document.getElementById("annotate-modal").dataset.moveNumber, 10);
}

function renderPickingBoard() {
  const moveNumber = pickingMoveNumber();
  const preIndex = Math.max(0, moveNumber - 1);
  const state = boardData.states[preIndex];
  const lastMove = boardData.moves[preIndex];
  const suggestions = pendingSuggestedMoves.map((p) => ({ ...p, label: formatCoord(p.row, p.col) }));
  goban.draw(state, lastMove, [], suggestions);
}

function togglePickedPoint(clickEvent) {
  const pos = goban.pixelToPos(clickEvent.offsetX, clickEvent.offsetY);
  if (!pos) return;
  const idx = pendingSuggestedMoves.findIndex((p) => p.row === pos.row && p.col === pos.col);
  if (idx !== -1) pendingSuggestedMoves.splice(idx, 1);
  else pendingSuggestedMoves.push(pos);
  renderPickingBoard();
}

function renderSuggestionChips() {
  const el = document.getElementById("am-suggestions-chips");
  el.innerHTML = pendingSuggestedMoves
    .map(
      (p, idx) =>
        `<span class="chip">${formatCoord(p.row, p.col)} <button data-idx="${idx}" type="button">✕</button></span>`
    )
    .join("");
  el.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingSuggestedMoves.splice(parseInt(btn.dataset.idx, 10), 1);
      renderSuggestionChips();
    });
  });
}

// ---------- annotation ----------

function openAnnotateModal(moveNumber) {
  editingErrorId = null;
  document.getElementById("am-title").textContent = "Annoter une erreur";
  document.getElementById("am-move-no").textContent = moveNumber;
  document.getElementById("am-category").value = categories[0] ? categories[0].id : "";
  document.getElementById("am-phase").value = suggestPhase(moveNumber);
  document.getElementById("am-severity").value = "moyenne";
  document.getElementById("am-note").value = "";
  document.getElementById("am-error").textContent = "";
  document.getElementById("annotate-modal").dataset.moveNumber = moveNumber;
  pendingSuggestedMoves = [];
  document.getElementById("am-suggestions-section").classList.toggle("hidden", !boardData);
  renderSuggestionChips();
  document.getElementById("annotate-modal").classList.remove("hidden");
}

function openEditAnnotateModal(error) {
  editingErrorId = error.id;
  document.getElementById("am-title").textContent = "Modifier l'annotation";
  document.getElementById("am-move-no").textContent = error.move_number;
  document.getElementById("am-category").value = error.category_id;
  document.getElementById("am-phase").value = error.phase;
  document.getElementById("am-severity").value = error.severity;
  document.getElementById("am-note").value = error.note || "";
  document.getElementById("am-error").textContent = "";
  document.getElementById("annotate-modal").dataset.moveNumber = error.move_number;
  pendingSuggestedMoves = (error.suggested_moves || []).map((p) => ({ row: p.row, col: p.col }));
  document.getElementById("am-suggestions-section").classList.toggle("hidden", !boardData);
  renderSuggestionChips();
  document.getElementById("annotate-modal").classList.remove("hidden");
}

function closeAnnotateModal() {
  document.getElementById("annotate-modal").classList.add("hidden");
}

async function saveAnnotation() {
  const moveNumber = parseInt(document.getElementById("annotate-modal").dataset.moveNumber, 10);
  const payload = {
    category_id: parseInt(document.getElementById("am-category").value, 10),
    move_number: moveNumber,
    phase: document.getElementById("am-phase").value,
    severity: document.getElementById("am-severity").value,
    note: document.getElementById("am-note").value || null,
    suggested_moves: pendingSuggestedMoves,
  };
  const wasEditing = !!editingErrorId;
  try {
    if (wasEditing) {
      const updated = await api.updateGameError(editingErrorId, payload);
      const idx = errors.findIndex((e) => e.id === editingErrorId);
      if (idx !== -1) errors[idx] = updated;
    } else {
      const created = await api.createGameError(gameId, payload);
      errors.push(created);
    }
    closeAnnotateModal();
    pendingSuggestedMoves = [];
    editingErrorId = null;
    if (boardData) setMoveIndex(currentMoveIndex);
    else renderManualErrorList();
    showToast(wasEditing ? "Annotation modifiée" : "Erreur annotée");
  } catch (err) {
    document.getElementById("am-error").textContent = "Erreur : " + err.message;
  }
}

async function deleteAnnotation(id) {
  if (!confirm("Supprimer cette annotation ?")) return;
  try {
    await api.deleteGameError(id);
    errors = errors.filter((e) => e.id !== id);
    if (boardData) setMoveIndex(currentMoveIndex);
    else renderManualErrorList();
    showToast("Annotation supprimée");
  } catch (err) {
    showToast("Erreur : " + err.message, true);
  }
}

function errorItemHtml(e) {
  const suggestions = e.suggested_moves || [];
  const suggestionLine = suggestions.length
    ? `<div class="muted">📍 recommandé : ${suggestions.map((p) => formatCoord(p.row, p.col)).join(", ")}</div>`
    : "";
  return `
    <div class="error-item" data-move="${e.move_number}">
      <span class="move-no">#${e.move_number}</span>
      <span class="color-swatch" style="background:${e.category.color}"></span>
      <div style="flex:1;">
        <div>${escapeHtml(e.category.name)}</div>
        <div class="muted">${PHASE_LABEL[e.phase]} · <span class="sev-dot sev-${e.severity}"></span> ${e.severity}</div>
        ${suggestionLine}
      </div>
      <button class="icon-btn" data-edit="${e.id}">✏️</button>
      <button class="icon-btn danger" data-del="${e.id}">✕</button>
    </div>`;
}

function wireErrorItemButtons(el, { withJump } = {}) {
  if (withJump) {
    el.querySelectorAll(".error-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        setMoveIndex(parseInt(item.dataset.move, 10));
      });
    });
  }
  el.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const err = errors.find((x) => x.id === parseInt(btn.dataset.edit, 10));
      if (err) openEditAnnotateModal(err);
    });
  });
  el.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteAnnotation(parseInt(btn.dataset.del, 10));
    });
  });
}

function renderErrorList() {
  const el = document.getElementById("error-list");
  const sorted = [...errors].sort((a, b) => a.move_number - b.move_number);
  el.innerHTML = sorted.length
    ? sorted.map(errorItemHtml).join("")
    : '<p class="muted">Aucune erreur annotée pour l\'instant.</p>';
  wireErrorItemButtons(el, { withJump: true });
}

// ---------- manual mode (no SGF) ----------

function setupManualErrors() {
  document.getElementById("manual-error-section").classList.remove("hidden");
  document.getElementById("annotate-manual-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("manual-move-number").value, 10) || 0;
    openAnnotateModal(n);
  });
  renderManualErrorList();
}

function renderManualErrorList() {
  const el = document.getElementById("error-list-manual");
  const sorted = [...errors].sort((a, b) => a.move_number - b.move_number);
  el.innerHTML = sorted.length
    ? sorted.map(errorItemHtml).join("")
    : '<p class="muted">Aucune erreur annotée pour l\'instant.</p>';
  wireErrorItemButtons(el);
}
