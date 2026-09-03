const PHASE_LABEL = { fuseki: "Fuseki", milieu: "Milieu", yose: "Yose" };
const COLOR_LABEL = { black: "Noir", white: "Blanc" };

let gameId, game, categories, boardData, errors, goban;
let currentMoveIndex = 0;
let pendingSuggestedMoves = [];
let pickingMode = false;
let editingErrorId = null;
let markers = [];
let markerTool = null;
let branches = [];
let branchMode = null; // null | "creating" | "viewing"
let branchDraftMoves = [];
let branchDraftBoard = null;
let branchNextColor = null;
let branchAnchorIndex = null;
let viewingBranch = null;
let branchViewStates = null;
let branchViewIndex = 0;
let remoteDraftAnchor = null;
let remoteDraftMoves = [];
let remoteDraftBoard = null;
let activeBranchId = null;
let pendingBranchSync = false;

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
  const roomCode = params.get("room");

  document.getElementById("am-cancel").addEventListener("click", closeAnnotateModal);
  document.getElementById("am-save").addEventListener("click", saveAnnotation);
  document.getElementById("room-leave-btn").addEventListener("click", leaveRoom);
  document.getElementById("room-copy-btn").addEventListener("click", copyRoomLink);
  document.getElementById("room-modal-close-btn").addEventListener("click", () =>
    document.getElementById("room-share-modal").classList.add("hidden")
  );
  wireRoomHandlers();

  if (gameId) {
    await loadOwnedGame();
    document.getElementById("share-room-btn").addEventListener("click", createRoomFlow);
    if (roomCode) await hostExistingRoom(roomCode);
  } else if (roomCode) {
    enterGuestMode(roomCode);
  } else {
    document.body.innerHTML = "<main><p>Aucune partie spécifiée.</p></main>";
  }
});

async function loadOwnedGame() {
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

  if (game.sgf_content) {
    try {
      boardData = await api.getBoardStates(gameId);
      markers = await api.listMarkers(gameId);
      branches = await api.listBranches(gameId);
      document.getElementById("goban-section").classList.remove("hidden");
      document.getElementById("sgf-sidebar-tools").classList.remove("hidden");
      document.getElementById("share-room-btn").classList.remove("hidden");
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
}

// ---------- meta ----------

function renderMeta() {
  document.getElementById("meta-title").textContent = game.title;
  const bits = [];
  if (game.black_player || game.white_player) {
    bits.push(`Noir : ${game.black_player || "?"} · Blanc : ${game.white_player || "?"}`);
    if (game.opponent_rank) bits.push(`Adversaire ${game.opponent_rank}`);
  } else if (game.opponent_name) {
    bits.push(`vs ${game.opponent_name}${game.opponent_rank ? " (" + game.opponent_rank + ")" : ""}`);
  }
  if (game.date_played) bits.push(game.date_played);
  if (game.user_color) bits.push(`Vous jouiez ${COLOR_LABEL[game.user_color]}${game.user_rank_at_time ? " — " + game.user_rank_at_time : ""}`);
  if (game.result) bits.push(`Résultat : ${game.result}`);
  if (game.komi !== null && game.komi !== undefined) bits.push(`Komi ${game.komi}`);
  if (game.time_control) bits.push(game.time_control);
  if (game.platform) bits.push(game.platform);
  document.getElementById("meta-summary").textContent = bits.join(" · ");

  const extEl = document.getElementById("meta-external");
  if (game.external_link) {
    const canAutoImport = !game.sgf_content && typeof isSupportedSgfLink === "function" && isSupportedSgfLink(game.external_link);
    extEl.innerHTML =
      `<a href="${escapeHtml(game.external_link)}" target="_blank" rel="noopener">Ouvrir la review externe ↗</a>` +
      (canAutoImport ? ` · <button id="retro-import-btn" class="icon-btn">🔄 Importer le SGF dans Kifu</button>` : "");
    if (canAutoImport) {
      document.getElementById("retro-import-btn").addEventListener("click", retroImportSgf);
    }
  } else {
    extEl.innerHTML = "";
  }

  document.getElementById("comment-text").value = game.comment || "";
}

async function retroImportSgf() {
  const btn = document.getElementById("retro-import-btn");
  btn.disabled = true;
  btn.textContent = "Récupération…";
  const fetched = await fetchSgfFromLink(game.external_link);
  if (!fetched) {
    showToast("Impossible de récupérer le SGF depuis ce lien", true);
    btn.disabled = false;
    btn.textContent = "🔄 Importer le SGF dans Kifu";
    return;
  }
  game = { ...game, ...(await api.updateGame(gameId, { sgf_content: fetched })) };
  showToast("SGF importé — rechargement du plateau…");
  location.reload();
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
  renderQuickTagRow();
}

// ---------- tag rapide (1 clic, sans modal) ----------

let quickTagSeverity = "moyenne";

function renderQuickTagRow() {
  const el = document.getElementById("quick-tag-select");
  if (!el) return;
  el.innerHTML =
    `<option value="" selected disabled>+ Annoter ce coup…</option>` +
    categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

function updateSeverityPickerUI() {
  document.querySelectorAll("#quick-severity-picker button").forEach((b) => {
    b.classList.toggle("active", b.dataset.sev === quickTagSeverity);
  });
}

async function submitNewError(payload) {
  if (Room.active && !Room.isOwner) {
    Room.send("intent:create-error", payload);
    showToast("Envoyé à l'hôte…");
    return null;
  }
  const created = await api.createGameError(gameId, payload);
  errors.push(created);
  if (Room.active) Room.send("sync:error-created", { error: created });
  return created;
}

async function quickTagCurrentMove(categoryId) {
  if (!guardController()) return;
  const payload = {
    category_id: categoryId,
    move_number: currentMoveIndex,
    phase: suggestPhase(currentMoveIndex),
    severity: quickTagSeverity,
    note: null,
    suggested_moves: [],
  };
  try {
    await submitNewError(payload);
    if (boardData) setMoveIndex(currentMoveIndex);
    showToast("Erreur annotée");
  } catch (err) {
    showToast("Erreur : " + err.message, true);
  }
}

// ---------- salle de review partagée ----------

function guardController() {
  if (Room.active && !Room.isController()) {
    showToast("Vous n'avez pas le contrôle de la review.", true);
    return false;
  }
  return true;
}

async function createRoomFlow() {
  const btn = document.getElementById("share-room-btn");
  btn.disabled = true;
  try {
    const code = Room.randomCode();
    await Room.connect(code, "Hôte");
    Room.isOwner = true;
    Room.setController(Room.participantId);
    history.replaceState(null, "", `game.html?id=${gameId}&room=${code}`);
    const url = `${location.origin}${location.pathname}?room=${code}`;
    document.getElementById("room-link-input").value = url;
    document.getElementById("room-share-modal").classList.remove("hidden");
    document.getElementById("room-banner").classList.remove("hidden");
    updateRoomUI();
  } catch (err) {
    showToast("Impossible de créer la salle : " + err.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function hostExistingRoom(code) {
  try {
    await Room.connect(code, "Hôte");
    Room.isOwner = true;
    Room.setController(Room.participantId);
    document.getElementById("room-banner").classList.remove("hidden");
    updateRoomUI();
  } catch (err) {
    showToast("Reconnexion à la salle impossible : " + err.message, true);
  }
}

function copyRoomLink() {
  const input = document.getElementById("room-link-input");
  input.select();
  navigator.clipboard?.writeText(input.value).then(
    () => showToast("Lien copié"),
    () => showToast("Copie impossible, sélectionnez et copiez manuellement", true)
  );
}

function enterGuestMode(code) {
  document.getElementById("meta-panel").classList.add("hidden");
  document.getElementById("board-panel").classList.add("hidden");
  document.getElementById("guest-join-panel").classList.remove("hidden");
  document.getElementById("guest-join-btn").addEventListener("click", async () => {
    const name = document.getElementById("guest-name-input").value.trim() || "Invité";
    document.getElementById("guest-join-panel").classList.add("hidden");
    document.getElementById("guest-waiting").classList.remove("hidden");
    try {
      await Room.connect(code, name);
      Room.send("snapshot-request", {});
    } catch (err) {
      document.getElementById("guest-waiting").textContent = "Erreur : " + err.message;
    }
  });
}

function applySnapshot(data) {
  game = data.game;
  categories = data.categories;
  errors = game.errors || [];
  markers = data.markers || [];
  branches = data.branches || [];
  Room.setController(data.controllerId);

  document.getElementById("guest-waiting").classList.add("hidden");
  document.getElementById("meta-panel").classList.remove("hidden");
  document.getElementById("board-panel").classList.remove("hidden");
  document.getElementById("room-banner").classList.remove("hidden");
  document.getElementById("meta-edit-btn").classList.add("hidden");
  document.getElementById("meta-delete-btn").classList.add("hidden");
  document.getElementById("comment-save-btn").classList.add("hidden");
  document.getElementById("comment-text").disabled = true;

  renderMeta();
  populateCategorySelect();

  if (game.sgf_content) {
    boardData = computeBoardStates(game.sgf_content);
    document.getElementById("goban-section").classList.remove("hidden");
    document.getElementById("sgf-sidebar-tools").classList.remove("hidden");
    goban = new Goban(document.getElementById("goban-canvas"), boardData.size);
    setupBoardControls();
    setMoveIndex(data.currentMoveIndex);
  } else {
    document.getElementById("no-sgf-msg").classList.remove("hidden");
    setupManualErrors();
  }
  updateRoomUI();
}

function buildSnapshot() {
  return {
    game,
    categories,
    markers,
    branches,
    currentMoveIndex,
    controllerId: Room.controllerId,
  };
}

let lastParticipants = [];

function updateRoomUI() {
  const isController = Room.isController();
  document.getElementById("room-status").textContent = Room.active
    ? isController
      ? " — vous avez le contrôle"
      : " — vous regardez"
    : "";
  document
    .querySelectorAll("#ctl-first,#ctl-prev,#ctl-next,#ctl-last,#ctl-slider,#ctl-jump,#annotate-btn,.marker-btn")
    .forEach((el) => {
      if (Room.active) el.disabled = !isController;
      else el.disabled = false;
    });
  renderParticipants(lastParticipants);
}

function renderParticipants(list) {
  const el = document.getElementById("room-participants");
  el.innerHTML = list
    .map((p) => {
      const isCtrl = p.id === Room.controllerId;
      const isSelf = p.id === Room.participantId;
      const canHandOff = Room.isController() && !isSelf;
      const canReclaim = !isCtrl && isSelf;
      return `
        <div class="participant-row">
          <span>${escapeHtml(p.name)}${isSelf ? " (vous)" : ""}</span>
          ${isCtrl ? '<span class="badge-controller">CONTRÔLE</span>' : ""}
          ${canHandOff ? `<button data-handoff="${escapeHtml(p.id)}">Donner le contrôle</button>` : ""}
          ${canReclaim ? `<button data-handoff="${escapeHtml(p.id)}">Reprendre le contrôle</button>` : ""}
        </div>`;
    })
    .join("");
  el.querySelectorAll("button[data-handoff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newControllerId = btn.dataset.handoff;
      Room.setController(newControllerId);
      Room.send("control-transfer", { newControllerId });
      updateRoomUI();
    });
  });
}

function leaveRoom() {
  Room.leave();
  document.getElementById("room-banner").classList.add("hidden");
  updateRoomUI();
  showToast("Vous avez quitté la salle");
}

function wireRoomHandlers() {
  Room.on("snapshot-request", () => {
    if (Room.isOwner) Room.send("snapshot", buildSnapshot());
  });
  Room.on("snapshot", applySnapshot);

  Room.on("sync:move", ({ moveIndex }) => setMoveIndex(moveIndex));

  Room.on("intent:create-error", async (payload) => {
    if (!Room.isOwner) return;
    const created = await api.createGameError(gameId, payload);
    errors.push(created);
    setMoveIndex(currentMoveIndex);
    Room.send("sync:error-created", { error: created });
  });
  Room.on("sync:error-created", ({ error }) => {
    if (!errors.some((e) => e.id === error.id)) errors.push(error);
    setMoveIndex(currentMoveIndex);
  });

  Room.on("intent:update-error", async ({ id, payload }) => {
    if (!Room.isOwner) return;
    const updated = await api.updateGameError(id, payload);
    const idx = errors.findIndex((e) => e.id === id);
    if (idx !== -1) errors[idx] = updated;
    setMoveIndex(currentMoveIndex);
    Room.send("sync:error-updated", { error: updated });
  });
  Room.on("sync:error-updated", ({ error }) => {
    const idx = errors.findIndex((e) => e.id === error.id);
    if (idx !== -1) errors[idx] = error;
    setMoveIndex(currentMoveIndex);
  });

  Room.on("intent:delete-error", async ({ id }) => {
    if (!Room.isOwner) return;
    await api.deleteGameError(id);
    errors = errors.filter((e) => e.id !== id);
    setMoveIndex(currentMoveIndex);
    Room.send("sync:error-deleted", { id });
  });
  Room.on("sync:error-deleted", ({ id }) => {
    errors = errors.filter((e) => e.id !== id);
    setMoveIndex(currentMoveIndex);
  });

  Room.on("intent:create-marker", async (payload) => {
    if (!Room.isOwner) return;
    const created = await api.createMarker(gameId, payload);
    markers.push(created);
    setMoveIndex(currentMoveIndex);
    Room.send("sync:marker-created", { marker: created });
  });
  Room.on("sync:marker-created", ({ marker }) => {
    if (!markers.some((m) => m.id === marker.id)) markers.push(marker);
    setMoveIndex(currentMoveIndex);
  });

  Room.on("intent:delete-marker", async ({ id }) => {
    if (!Room.isOwner) return;
    await api.deleteMarker(id);
    markers = markers.filter((m) => m.id !== id);
    setMoveIndex(currentMoveIndex);
    Room.send("sync:marker-deleted", { id });
  });
  Room.on("sync:marker-deleted", ({ id }) => {
    markers = markers.filter((m) => m.id !== id);
    setMoveIndex(currentMoveIndex);
  });

  Room.on("intent:create-branch", async (payload) => {
    if (!Room.isOwner) return;
    const created = await api.createBranch(gameId, payload);
    branches.push(created);
    renderBranchesList();
    Room.send("sync:branch-created", { branch: created });
  });
  Room.on("sync:branch-created", ({ branch }) => {
    if (!branches.some((b) => b.id === branch.id)) branches.push(branch);
    renderBranchesList();
    if (branchMode === "creating" && activeBranchId == null && pendingBranchSync) {
      activeBranchId = branch.id;
      pendingBranchSync = false;
      if (branchDraftMoves.length !== branch.moves.length) {
        Room.send("intent:update-branch", {
          id: activeBranchId,
          payload: { anchor_move_number: branchAnchorIndex, moves: branchDraftMoves },
        });
      }
    }
  });

  Room.on("intent:update-branch", async ({ id, payload }) => {
    if (!Room.isOwner) return;
    const updated = await api.updateBranch(id, payload);
    const idx = branches.findIndex((b) => b.id === id);
    if (idx !== -1) branches[idx] = updated;
    renderBranchesList();
    Room.send("sync:branch-updated", { branch: updated });
  });
  Room.on("sync:branch-updated", ({ branch }) => {
    const idx = branches.findIndex((b) => b.id === branch.id);
    if (idx !== -1) branches[idx] = branch;
    else branches.push(branch);
    renderBranchesList();
  });

  Room.on("intent:delete-branch", async ({ id }) => {
    if (!Room.isOwner) return;
    await api.deleteBranch(id);
    branches = branches.filter((b) => b.id !== id);
    renderBranchesList();
    Room.send("sync:branch-deleted", { id });
  });
  Room.on("sync:branch-deleted", ({ id }) => {
    branches = branches.filter((b) => b.id !== id);
    if (viewingBranch && viewingBranch.id === id) exitBranchView();
    else renderBranchesList();
  });

  Room.on("branch-draft-start", ({ anchorMoveIndex }) => {
    remoteDraftAnchor = anchorMoveIndex;
    remoteDraftMoves = [];
    remoteDraftBoard = stonesToBoard(boardData.states[anchorMoveIndex], boardData.size);
    redrawRemoteDraft();
  });
  Room.on("branch-draft-move", ({ row, col, color }) => {
    if (!remoteDraftBoard) return;
    playMove(remoteDraftBoard, row, col, color, boardData.size);
    remoteDraftMoves.push({ row, col, color });
    redrawRemoteDraft();
  });
  Room.on("branch-draft-undo", () => {
    if (!remoteDraftBoard) return;
    remoteDraftMoves.pop();
    remoteDraftBoard = stonesToBoard(boardData.states[remoteDraftAnchor], boardData.size);
    for (const mv of remoteDraftMoves) playMove(remoteDraftBoard, mv.row, mv.col, mv.color, boardData.size);
    redrawRemoteDraft();
  });
  Room.on("branch-draft-end", () => {
    remoteDraftAnchor = null;
    remoteDraftMoves = [];
    remoteDraftBoard = null;
    setMoveIndex(currentMoveIndex);
  });

  Room.on("control-transfer", ({ newControllerId }) => {
    Room.setController(newControllerId);
    updateRoomUI();
  });

  Room.on("participants", (list) => {
    lastParticipants = list;
    renderParticipants(list);
  });
}

// ---------- board / goban ----------

function setupBoardControls() {
  const slider = document.getElementById("ctl-slider");
  slider.max = boardData.states.length - 1;
  slider.addEventListener("input", () => navigateTo(parseInt(slider.value, 10)));
  document.getElementById("ctl-first").addEventListener("click", () => navigateTo(0));
  document.getElementById("ctl-prev").addEventListener("click", () => stepMove(-1));
  document.getElementById("ctl-next").addEventListener("click", () => stepMove(1));
  document.getElementById("ctl-last").addEventListener("click", () => navigateTo(boardData.states.length - 1));
  document.addEventListener("keydown", (e) => {
    if (!boardData) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      stepMove(-1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      stepMove(1);
    } else if (e.key === "Home") {
      e.preventDefault();
      navigateTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      navigateTo(boardData.states.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleEscape();
    }
  });
  document.getElementById("ctl-jump").addEventListener("change", (e) => {
    const n = parseInt(e.target.value, 10);
    if (!isNaN(n)) navigateTo(Math.max(0, Math.min(boardData.states.length - 1, n)));
  });
  document.getElementById("goban-canvas").addEventListener("click", (e) => {
    if (e.shiftKey) {
      handleShiftClickJump(e);
      return;
    }
    if (branchMode === "viewing") return;
    if (!guardController()) return;
    if (pickingMode) {
      togglePickedPoint(e);
    } else if (markerTool) {
      handleMarkerClick(e);
    } else {
      handleSequenceClick(e);
    }
  });
  document.getElementById("annotate-btn").addEventListener("click", () => {
    if (!guardController()) return;
    openAnnotateModal(currentMoveIndex);
  });
  document.querySelectorAll("#quick-severity-picker button").forEach((btn) => {
    btn.addEventListener("click", () => {
      quickTagSeverity = btn.dataset.sev;
      updateSeverityPickerUI();
    });
  });
  updateSeverityPickerUI();
  document.getElementById("quick-tag-select").addEventListener("change", (e) => {
    const categoryId = parseInt(e.target.value, 10);
    e.target.value = "";
    if (!isNaN(categoryId)) quickTagCurrentMove(categoryId);
  });
  document.getElementById("am-pick-suggestions-btn").addEventListener("click", startPickingSuggestions);
  document.getElementById("picking-done-btn").addEventListener("click", finishPickingSuggestions);

  document.querySelectorAll(".marker-btn[data-symbol]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!guardController()) return;
      markerTool = markerTool === btn.dataset.symbol ? null : btn.dataset.symbol;
      updateMarkerToolbarUI();
    });
  });

  document.getElementById("branch-undo-btn").addEventListener("click", undoBranchMove);
  document.getElementById("sequence-done-btn").addEventListener("click", finishSequence);
  document.getElementById("branch-view-exit").addEventListener("click", exitBranchView);
  document.getElementById("branch-view-first").addEventListener("click", () => {
    branchViewIndex = 0;
    renderBranchView();
  });
  document.getElementById("branch-view-prev").addEventListener("click", () => {
    branchViewIndex = Math.max(0, branchViewIndex - 1);
    renderBranchView();
  });
  document.getElementById("branch-view-next").addEventListener("click", () => {
    branchViewIndex = Math.min(branchViewStates.length - 1, branchViewIndex + 1);
    renderBranchView();
  });
  document.getElementById("branch-view-last").addEventListener("click", () => {
    branchViewIndex = branchViewStates.length - 1;
    renderBranchView();
  });
  document.getElementById("move-tree-wrap").addEventListener("click", handleMoveTreeClick);
}

function navigateTo(i) {
  if (!guardController()) {
    document.getElementById("ctl-slider").value = currentMoveIndex;
    return;
  }
  if (branchMode === "creating") finishSequence();
  if (branchMode === "viewing") exitBranchView();
  setMoveIndex(i);
  if (Room.active) Room.send("sync:move", { moveIndex: i });
}

// ◀/▶ et flèches clavier : contextuels. En train de composer une séquence,
// "précédent" annule juste le dernier coup posé (au lieu de tout quitter).
// En train de regarder une variante enregistrée, on avance/recule DANS la
// variante — revenir avant son premier coup en ressort naturellement vers la
// ligne principale, au lieu de faire disparaître toute la variante d'un coup.
function stepMove(delta) {
  if (!guardController()) return;
  if (branchMode === "creating") {
    if (delta < 0) undoBranchMove();
    return;
  }
  if (branchMode === "viewing") {
    const target = branchViewIndex + delta;
    if (target < 0) {
      exitBranchView();
      return;
    }
    branchViewIndex = Math.max(0, Math.min(branchViewStates.length - 1, target));
    renderBranchView();
    return;
  }
  navigateTo(Math.max(0, Math.min(boardData.states.length - 1, currentMoveIndex + delta)));
}

// Shift + clic sur une pierre visible = saute directement au coup où elle a
// été jouée (recherche du coup le plus récent à ce point, en remontant depuis
// la position actuelle).
function handleShiftClickJump(clickEvent) {
  if (!boardData || !guardController()) return;
  const pos = goban.pixelToPos(clickEvent.offsetX, clickEvent.offsetY);
  if (!pos) return;
  const fromIndex = branchMode === "viewing" ? viewingBranch.anchor_move_number : currentMoveIndex;
  for (let i = fromIndex; i >= 1; i--) {
    const mv = boardData.moves[i];
    if (mv && !mv.pass && mv.row === pos.row && mv.col === pos.col) {
      if (branchMode === "viewing") exitBranchView();
      navigateTo(i);
      return;
    }
  }
  showToast("Aucun coup à ce point avant la position actuelle", true);
}

// Échap : sort proprement de quoi que ce soit soit en cours (modal, mode
// symbole, coup recommandé, composition/visualisation de séquence), du plus
// "au-dessus" au plus "en-dessous".
function handleEscape() {
  if (pickingMode) {
    finishPickingSuggestions();
    return;
  }
  if (!document.getElementById("annotate-modal").classList.contains("hidden")) {
    closeAnnotateModal();
    return;
  }
  if (markerTool) {
    markerTool = null;
    updateMarkerToolbarUI();
    return;
  }
  if (branchMode === "creating") {
    finishSequence();
    return;
  }
  if (branchMode === "viewing") {
    exitBranchView();
  }
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
    .filter((e) => e.move_number === i)
    .map((e) => {
      const mv = boardData.moves[e.move_number];
      if (!mv || mv.pass) return null;
      return { row: mv.row, col: mv.col, color: e.category.color, severity: e.severity };
    })
    .filter(Boolean);
}

function suggestionMarkersFor(i) {
  return errors
    .filter((e) => e.move_number === i)
    .flatMap((e) => (e.suggested_moves || []).map((p) => ({ row: p.row, col: p.col, label: formatCoord(p.row, p.col) })));
}

function symbolMarkersFor(i) {
  return markers.filter((m) => m.move_number === i);
}

let listRenderQueued = false;
function scheduleListRender() {
  if (listRenderQueued) return;
  listRenderQueued = true;
  requestAnimationFrame(() => {
    listRenderQueued = false;
    renderErrorList();
    renderBranchesList();
  });
}

function setMoveIndex(i) {
  currentMoveIndex = i;
  document.getElementById("ctl-slider").value = i;
  const move = boardData.moves[i];
  document.getElementById("ctl-move-label").textContent =
    i === 0 ? "Coup 0 (position initiale)" : `Coup ${i} — ${move.color === "b" ? "Noir" : "Blanc"}${move.pass ? " (passe)" : ""}`;

  goban.draw(boardData.states[i], move, errorRingMarkers(i), suggestionMarkersFor(i), symbolMarkersFor(i));
  // Le rendu de la liste d'erreurs et de l'arbre des variantes reconstruit du DOM/SVG
  // en entier (potentiellement des centaines d'éléments sur une longue partie). En
  // rafale de touches (flèches maintenues), ça sature le thread principal et le
  // navigateur ne peut peindre que l'état final : les coups intermédiaires semblent
  // "sautés" à l'écran alors que la logique interne est correcte. On repousse donc
  // ce rendu lourd à la prochaine frame et on le fusionne si plusieurs coups
  // s'enchaînent avant qu'elle n'arrive.
  scheduleListRender();
}

// ---------- branches / variantes (poser des pierres façon OGS) ----------

function renderBranchesList() {
  const el = document.getElementById("branches-list");
  if (!el) return;
  const atMove = branches.filter((b) => b.anchor_move_number === currentMoveIndex);
  el.innerHTML = atMove
    .map(
      (b) =>
        `<span class="branch-chip" data-view="${b.id}">🌿 ${escapeHtml(b.name)} (${b.moves.length} coup${b.moves.length > 1 ? "s" : ""}) <button data-del-branch="${b.id}">✕</button></span>`
    )
    .join("");
  el.querySelectorAll(".branch-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const branch = branches.find((b) => b.id === parseInt(chip.dataset.view, 10));
      if (branch) enterBranchView(branch);
    });
  });
  el.querySelectorAll("button[data-del-branch]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteBranch(parseInt(btn.dataset.delBranch, 10));
    });
  });
  renderMoveTree();
}

// ---------- arbre des variantes (façon OGS) ----------

const MOVE_TREE_X_STEP = 15;
const MOVE_TREE_MARGIN_X = 12;

// Estimation grossière de la largeur d'une étiquette en pixels (police 10px) : sans
// mesure DOM réelle disponible au moment du calcul de layout, ~6.2px/caractère est
// une approximation raisonnable pour une police sans-serif à cette taille.
function estimateLabelWidth(text) {
  return 8 + text.length * 6.2;
}

// Empile les branches par "lane" (rangée) en évitant les chevauchements horizontaux.
// Chaque lane doit rester libre jusqu'à la fin de l'ÉTIQUETTE de la branche (pas
// seulement ses pierres) : le nom d'une variante s'affiche après ses pierres, donc
// l'ignorer ici faisait chevaucher l'étiquette d'une branche avec les pierres de la
// branche suivante placée dans la même lane.
function layoutBranchLanes(branchList, colX) {
  const sorted = [...branchList].sort((a, b) => a.anchor_move_number - b.anchor_move_number);
  const laneEnds = []; // laneEnds[i] = position x (px) libérée par cette lane
  const placed = [];
  for (const b of sorted) {
    const startX = colX(b.anchor_move_number);
    const endX = colX(b.anchor_move_number + b.moves.length);
    const labelEndX = endX + estimateLabelWidth(b.name);
    let lane = laneEnds.findIndex((end) => end < startX);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(labelEndX);
    } else {
      laneEnds[lane] = labelEndX;
    }
    placed.push({ branch: b, lane });
  }
  return { placed, laneCount: laneEnds.length };
}

function renderMoveTree() {
  const wrap = document.getElementById("move-tree-wrap");
  if (!wrap || !boardData) return;

  const moveCount = boardData.states.length - 1;
  const xStep = MOVE_TREE_X_STEP;
  const marginX = MOVE_TREE_MARGIN_X;
  const mainY = 14;
  const laneGap = 18;
  const r = 5;
  const rSmall = 4;

  const colX = (col) => marginX + col * xStep;

  const { placed, laneCount } = layoutBranchLanes(branches, colX);

  const maxLabelEndX = placed.length
    ? Math.max(...placed.map((p) => colX(p.branch.anchor_move_number + p.branch.moves.length) + estimateLabelWidth(p.branch.name)))
    : 0;
  const width = Math.max(colX(moveCount) + marginX, maxLabelEndX + marginX);
  const height = mainY + (laneCount > 0 ? laneCount * laneGap + 14 : 10);

  let svg = `<svg width="${Math.max(width, 200)}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="inherit">`;

  // ligne principale
  svg += `<line x1="${colX(0)}" y1="${mainY}" x2="${colX(moveCount)}" y2="${mainY}" stroke="#a97c3a" stroke-width="2" />`;

  const viewingAnchor = branchMode === "viewing" && viewingBranch ? viewingBranch.anchor_move_number : null;

  for (let i = 0; i <= moveCount; i++) {
    const x = colX(i);
    const mv = boardData.moves[i];
    const isCurrent = branchMode !== "viewing" && i === currentMoveIndex;
    const isAnchorOfViewed = i === viewingAnchor;
    let fill = "#f5f3ee";
    if (mv && !mv.pass) fill = mv.color === "b" ? "#0a0a0a" : "#ffffff";
    const stroke = mv && !mv.pass && mv.color === "w" ? "#00000055" : "#a97c3a";
    svg += `<circle cx="${x}" cy="${mainY}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1" data-jump="${i}" style="cursor:pointer;">`;
    svg += `<title>Coup ${i}${mv && mv.pass ? " (passe)" : ""}</title></circle>`;
    if (isCurrent || isAnchorOfViewed) {
      svg += `<circle cx="${x}" cy="${mainY}" r="${r + 3}" fill="none" stroke="#6366f1" stroke-width="2" />`;
    }
  }

  for (const { branch, lane } of placed) {
    const y = mainY + laneGap * (lane + 1);
    const startX = colX(branch.anchor_move_number);
    const endX = colX(branch.anchor_move_number + branch.moves.length);
    const isViewingThis = branchMode === "viewing" && viewingBranch && viewingBranch.id === branch.id;

    svg += `<line x1="${startX}" y1="${mainY + r}" x2="${startX}" y2="${y}" stroke="#22c55e" stroke-width="1.5" />`;
    svg += `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="#22c55e" stroke-width="1.5" data-view-branch="${branch.id}" style="cursor:pointer;" />`;

    branch.moves.forEach((mv, j) => {
      const x = colX(branch.anchor_move_number + j + 1);
      const fill = mv.color === "b" ? "#0a0a0a" : "#ffffff";
      const isCurrentInBranch = isViewingThis && branchViewIndex === j + 1;
      svg += `<circle cx="${x}" cy="${y}" r="${rSmall}" fill="${fill}" stroke="#22c55e" stroke-width="1" data-view-branch="${branch.id}" data-branch-index="${j + 1}" style="cursor:pointer;">`;
      svg += `<title>${escapeHtml(branch.name)} — coup ${j + 1}</title></circle>`;
      if (isCurrentInBranch) {
        svg += `<circle cx="${x}" cy="${y}" r="${rSmall + 3}" fill="none" stroke="#6366f1" stroke-width="2" />`;
      }
    });

    svg += `<text x="${endX + 6}" y="${y + 3}" font-size="10" fill="#166534" data-view-branch="${branch.id}" style="cursor:pointer;">${escapeHtml(branch.name)}</text>`;
  }

  svg += `</svg>`;
  wrap.innerHTML = svg;

  // Fait suivre le scroll horizontal de l'arbre sur le coup courant (comme OGS),
  // sinon sur une longue partie il faut chercher la position à la main à chaque coup.
  const targetX =
    branchMode === "viewing" && viewingBranch
      ? colX(viewingBranch.anchor_move_number + branchViewIndex)
      : colX(currentMoveIndex);
  wrap.scrollLeft = Math.max(0, Math.min(wrap.scrollWidth - wrap.clientWidth, targetX - wrap.clientWidth / 2));
}

function handleMoveTreeClick(e) {
  const jumpEl = e.target.closest("[data-jump]");
  if (jumpEl) {
    navigateTo(parseInt(jumpEl.dataset.jump, 10));
    return;
  }
  const branchEl = e.target.closest("[data-view-branch]");
  if (branchEl) {
    const branch = branches.find((b) => b.id === parseInt(branchEl.dataset.viewBranch, 10));
    if (!branch) return;
    enterBranchView(branch);
    if (branchEl.dataset.branchIndex) {
      branchViewIndex = parseInt(branchEl.dataset.branchIndex, 10);
      renderBranchView();
    }
  }
}

// Clic direct sur le plateau = pose une pierre de séquence (façon OGS). Démarre
// automatiquement une nouvelle branche au premier clic, l'enregistre au fur et
// à mesure (aucun bouton "créer"/"enregistrer" à cliquer avant).
async function handleSequenceClick(clickEvent) {
  const pos = goban.pixelToPos(clickEvent.offsetX, clickEvent.offsetY);
  if (!pos) return;

  if (branchMode !== "creating") {
    branchMode = "creating";
    branchAnchorIndex = currentMoveIndex;
    branchDraftMoves = [];
    branchDraftBoard = stonesToBoard(boardData.states[currentMoveIndex], boardData.size);
    const lastMainMove = boardData.moves[currentMoveIndex];
    branchNextColor = lastMainMove && lastMainMove.color === "b" ? "w" : "b";
    activeBranchId = null;
    pendingBranchSync = false;
    document.getElementById("sequence-toolbar").classList.remove("hidden");
    if (Room.active) Room.send("branch-draft-start", { anchorMoveIndex: branchAnchorIndex });
  }

  if (branchDraftBoard[pos.row][pos.col] !== null) return;

  const color = branchNextColor;
  playMove(branchDraftBoard, pos.row, pos.col, color, boardData.size);
  branchDraftMoves.push({ row: pos.row, col: pos.col, color });
  branchNextColor = color === "b" ? "w" : "b";
  redrawBranchDraft();
  if (Room.active) Room.send("branch-draft-move", { row: pos.row, col: pos.col, color });
  await persistActiveBranch();
}

async function persistActiveBranch() {
  const payload = { anchor_move_number: branchAnchorIndex, moves: [...branchDraftMoves] };
  if (Room.active && !Room.isOwner) {
    if (activeBranchId == null) {
      if (!pendingBranchSync) {
        pendingBranchSync = true;
        Room.send("intent:create-branch", payload);
      }
    } else {
      Room.send("intent:update-branch", { id: activeBranchId, payload });
    }
    return;
  }
  if (activeBranchId == null) {
    const created = await api.createBranch(gameId, payload);
    activeBranchId = created.id;
    branches.push(created);
    if (Room.active) Room.send("sync:branch-created", { branch: created });
  } else {
    const updated = await api.updateBranch(activeBranchId, payload);
    const idx = branches.findIndex((b) => b.id === activeBranchId);
    if (idx !== -1) branches[idx] = updated;
    if (Room.active) Room.send("sync:branch-updated", { branch: updated });
  }
  renderBranchesList();
}

function redrawBranchDraft() {
  const size = boardData.size;
  const stones = boardSnapshot(branchDraftBoard, size);
  const lastMv = branchDraftMoves.length
    ? branchDraftMoves[branchDraftMoves.length - 1]
    : boardData.moves[branchAnchorIndex];
  goban.draw(stones, lastMv, [], [], []);
  document.getElementById("ctl-move-label").textContent = `🌿 Séquence en cours — coup ${branchDraftMoves.length + 1} (${
    branchNextColor === "b" ? "Noir" : "Blanc"
  } à jouer)`;
  document.getElementById("sequence-status").textContent = `🌿 Séquence en cours — ${branchDraftMoves.length} coup${branchDraftMoves.length > 1 ? "s" : ""} (enregistrée automatiquement)`;
}

function redrawRemoteDraft() {
  const size = boardData.size;
  const stones = boardSnapshot(remoteDraftBoard, size);
  const lastMv = remoteDraftMoves.length
    ? remoteDraftMoves[remoteDraftMoves.length - 1]
    : boardData.moves[remoteDraftAnchor];
  goban.draw(stones, lastMv, [], [], []);
  const controllerName = (lastParticipants.find((p) => p.id === Room.controllerId) || {}).name || "L'hôte";
  document.getElementById("ctl-move-label").textContent = `🌿 ${controllerName} compose une séquence en direct… (coup ${remoteDraftMoves.length})`;
}

function undoBranchMove() {
  if (branchMode !== "creating" || !branchDraftMoves.length) return;
  branchDraftMoves.pop();
  branchDraftBoard = stonesToBoard(boardData.states[branchAnchorIndex], boardData.size);
  for (const mv of branchDraftMoves) playMove(branchDraftBoard, mv.row, mv.col, mv.color, boardData.size);
  const last = branchDraftMoves[branchDraftMoves.length - 1];
  const anchorMove = boardData.moves[branchAnchorIndex];
  branchNextColor = last ? (last.color === "b" ? "w" : "b") : anchorMove && anchorMove.color === "b" ? "w" : "b";
  redrawBranchDraft();
  if (Room.active) Room.send("branch-draft-undo", {});
  persistActiveBranch();
}

function finishSequence() {
  if (branchMode !== "creating") return;
  branchMode = null;
  activeBranchId = null;
  pendingBranchSync = false;
  document.getElementById("sequence-toolbar").classList.add("hidden");
  setMoveIndex(currentMoveIndex);
  if (Room.active) Room.send("branch-draft-end", {});
}

function enterBranchView(branch) {
  branchMode = "viewing";
  viewingBranch = branch;
  branchViewStates = computeBranchStates(boardData.states[branch.anchor_move_number], boardData.size, branch.moves);
  branchViewIndex = branchViewStates.length - 1;
  document.getElementById("branch-view-toolbar").classList.remove("hidden");
  document.getElementById("branch-view-name").textContent = "🌿 " + branch.name;
  renderBranchView();
}

function renderBranchView() {
  const move =
    branchViewIndex > 0 ? viewingBranch.moves[branchViewIndex - 1] : boardData.moves[viewingBranch.anchor_move_number];
  goban.draw(branchViewStates[branchViewIndex], move, [], [], []);
  document.getElementById("ctl-move-label").textContent = `🌿 ${viewingBranch.name} — coup ${branchViewIndex} / ${viewingBranch.moves.length}`;
}

function exitBranchView() {
  branchMode = null;
  viewingBranch = null;
  document.getElementById("branch-view-toolbar").classList.add("hidden");
  setMoveIndex(currentMoveIndex);
}

async function deleteBranch(id) {
  if (!guardController()) return;
  if (!confirm("Supprimer cette branche ?")) return;
  if (Room.active && !Room.isOwner) {
    Room.send("intent:delete-branch", { id });
  } else {
    await api.deleteBranch(id);
    branches = branches.filter((b) => b.id !== id);
    if (Room.active) Room.send("sync:branch-deleted", { id });
  }
  if (viewingBranch && viewingBranch.id === id) exitBranchView();
  else renderBranchesList();
}

// ---------- symboles libres (façon OGS) ----------

async function performCreateMarker(payload) {
  if (Room.active && !Room.isOwner) {
    Room.send("intent:create-marker", payload);
    return;
  }
  const created = await api.createMarker(gameId, payload);
  markers.push(created);
  if (Room.active) Room.send("sync:marker-created", { marker: created });
}

async function performDeleteMarker(id) {
  if (Room.active && !Room.isOwner) {
    Room.send("intent:delete-marker", { id });
    return;
  }
  await api.deleteMarker(id);
  markers = markers.filter((m) => m.id !== id);
  if (Room.active) Room.send("sync:marker-deleted", { id });
}

async function handleMarkerClick(clickEvent) {
  const pos = goban.pixelToPos(clickEvent.offsetX, clickEvent.offsetY);
  if (!pos) return;
  const i = currentMoveIndex;
  const existing = markers.find((m) => m.move_number === i && m.row === pos.row && m.col === pos.col);

  if (existing) {
    await performDeleteMarker(existing.id);
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
  await performCreateMarker({ move_number: i, row: pos.row, col: pos.col, symbol: markerTool, label });
  setMoveIndex(i);
}

// ---------- coup(s) recommandé(s) : sélection sur le plateau ----------

function startPickingSuggestions() {
  if (!guardController()) return;
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
  if (!guardController()) return;
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
    if (Room.active && !Room.isOwner) {
      Room.send(wasEditing ? "intent:update-error" : "intent:create-error", wasEditing ? { id: editingErrorId, payload } : payload);
      closeAnnotateModal();
      pendingSuggestedMoves = [];
      editingErrorId = null;
      showToast("Envoyé à l'hôte…");
      return;
    }
    if (wasEditing) {
      const updated = await api.updateGameError(editingErrorId, payload);
      const idx = errors.findIndex((e) => e.id === editingErrorId);
      if (idx !== -1) errors[idx] = updated;
      if (Room.active) Room.send("sync:error-updated", { error: updated });
    } else {
      await submitNewError(payload);
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
  if (!guardController()) return;
  if (!confirm("Supprimer cette annotation ?")) return;
  try {
    if (Room.active && !Room.isOwner) {
      Room.send("intent:delete-error", { id });
    } else {
      await api.deleteGameError(id);
      errors = errors.filter((e) => e.id !== id);
      if (Room.active) Room.send("sync:error-deleted", { id });
    }
    if (boardData) setMoveIndex(currentMoveIndex);
    else renderManualErrorList();
    showToast("Annotation supprimée");
  } catch (err) {
    showToast("Erreur : " + err.message, true);
  }
}

function errorItemHtml(e) {
  const suggestions = e.suggested_moves || [];
  const titleBits = [`${PHASE_LABEL[e.phase]} · ${e.severity}`];
  if (suggestions.length) titleBits.push(`Recommandé : ${suggestions.map((p) => formatCoord(p.row, p.col)).join(", ")}`);
  if (e.note) titleBits.push(e.note);
  return `
    <div class="error-item" data-move="${e.move_number}" title="${escapeHtml(titleBits.join(" — "))}">
      <span class="move-no">#${e.move_number}</span>
      <span class="dot" style="background:${e.category.color}"></span>
      <span class="error-item-label">${escapeHtml(e.category.name)}</span>
      <span class="sev-dot sev-${e.severity}"></span>
      <button class="icon-btn" data-edit="${e.id}">✏️</button>
      <button class="icon-btn danger" data-del="${e.id}">✕</button>
    </div>`;
}

function wireErrorItemButtons(el, { withJump } = {}) {
  if (withJump) {
    el.querySelectorAll(".error-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        navigateTo(parseInt(item.dataset.move, 10));
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
    if (!guardController()) return;
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
