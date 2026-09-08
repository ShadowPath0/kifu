let game, boardData, goban, mode;
let currentMoveIndex = 0;

// ---------- mode "deviner le coup" ----------
let guessScore = { correct: 0, total: 0 };
let guessFinished = false;
let guessAdvancing = false; // true pendant le court délai entre un bon coup et le suivant
let guessFromMove = 1;
let guessToMove = Infinity; // permet de scoper un défi à une plage de coups (ex : mémoriser les coups 1 à 20)

document.addEventListener("DOMContentLoaded", () => {
  renderNav("pro-games");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  mode = params.get("mode") === "guess" ? "guess" : "normal";
  game = PRO_GAMES.find((g) => g.id === id);
  if (!game) {
    document.querySelector("main").innerHTML = `<div class='panel'>${t("proGames.notFound")}</div>`;
    return;
  }
  const fromParam = parseInt(params.get("from"), 10);
  const toParam = parseInt(params.get("to"), 10);
  if (!isNaN(fromParam) && fromParam > 0) guessFromMove = fromParam;
  if (!isNaN(toParam) && toParam > 0) guessToMove = toParam;

  document.getElementById("pg-title").textContent = game.title;
  document.getElementById("pg-summary").textContent =
    `${game.black} (${game.blackRank || "?"}) vs ${game.white} (${game.whiteRank || "?"}) · ${game.date || ""} · ${game.result || ""}`;

  boardData = computeBoardStates(game.sgf);
  goban = new Goban(document.getElementById("goban-canvas"), boardData.size);

  if (mode === "normal") {
    setupNormalMode();
  } else {
    setupGuessMode();
  }
});

// ---------- mode normal (rejouer librement) ----------

function setupNormalMode() {
  document.getElementById("guess-panel").classList.add("hidden");
  document.getElementById("normal-controls").classList.remove("hidden");
  document.getElementById("normal-label").classList.remove("hidden");
  document.getElementById("normal-hint").classList.remove("hidden");

  const slider = document.getElementById("ctl-slider");
  slider.max = boardData.states.length - 1;
  slider.addEventListener("input", () => setNormalIndex(parseInt(slider.value, 10)));
  document.getElementById("ctl-first").addEventListener("click", () => setNormalIndex(0));
  document.getElementById("ctl-prev").addEventListener("click", () => setNormalIndex(Math.max(0, currentMoveIndex - 1)));
  document.getElementById("ctl-next").addEventListener("click", () =>
    setNormalIndex(Math.min(boardData.states.length - 1, currentMoveIndex + 1))
  );
  document.getElementById("ctl-last").addEventListener("click", () => setNormalIndex(boardData.states.length - 1));
  document.addEventListener("keydown", (e) => {
    if (mode !== "normal") return;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setNormalIndex(Math.max(0, currentMoveIndex - 1));
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setNormalIndex(Math.min(boardData.states.length - 1, currentMoveIndex + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setNormalIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setNormalIndex(boardData.states.length - 1);
    }
  });

  setNormalIndex(0);
}

function colorLabel(color) {
  return color === "b" ? t("colorBlack") : t("colorWhite");
}

function setNormalIndex(i) {
  currentMoveIndex = i;
  document.getElementById("ctl-slider").value = i;
  const move = boardData.moves[i];
  document.getElementById("normal-label").textContent =
    i === 0
      ? t("proGame.normalLabelInitial")
      : t(move.pass ? "proGame.normalLabelPass" : "proGame.normalLabel", { n: i, color: colorLabel(move.color) });
  goban.draw(boardData.states[i], move, [], [], []);
}

// ---------- mode "deviner le coup" ----------

function setupGuessMode() {
  document.getElementById("guess-panel").classList.remove("hidden");
  document.getElementById("guess-finish-btn").addEventListener("click", finishGuessSession);
  document.getElementById("goban-canvas").addEventListener("click", handleGuessClick);
  currentMoveIndex = Math.max(0, Math.min(boardData.states.length - 1, guessFromMove - 1));
  renderHistory();
  advanceGuessPrompt();
}

// Avance jusqu'au prochain coup qui nécessite vraiment une devinette (les passes
// s'enchaînent automatiquement, sans quoi il n'y aurait rien à cliquer dessus).
// S'arrête à guessToMove si le défi porte sur une plage de coups précise.
function advanceGuessPrompt() {
  document.getElementById("guess-feedback").innerHTML = "";

  while (boardData.moves[currentMoveIndex + 1] && boardData.moves[currentMoveIndex + 1].pass) {
    currentMoveIndex++;
  }

  const nextMove = currentMoveIndex < guessToMove ? boardData.moves[currentMoveIndex + 1] : null;
  goban.draw(boardData.states[currentMoveIndex], boardData.moves[currentMoveIndex], [], [], []);

  if (!nextMove) {
    finishGuessSession();
    return;
  }

  document.getElementById("guess-status").textContent = t("proGame.guessPrompt", {
    n: currentMoveIndex + 1,
    color: colorLabel(nextMove.color),
    pct: errorPct(),
  });
  document.getElementById("guess-finish-btn").classList.toggle("hidden", guessScore.total === 0);
}

// Ne révèle jamais la solution : un essai faux affiche juste "faux", sans indiquer où
// jouer, et la personne retente jusqu'à trouver le bon point (comme demandé — pas de
// solution donnée, façon Go Magic). Un essai juste pose la pierre et avance seul.
function handleGuessClick(e) {
  if (guessFinished || guessAdvancing) return;
  const pos = goban.pixelToPos(e.offsetX, e.offsetY);
  if (!pos) return;
  const nextMove = boardData.moves[currentMoveIndex + 1];
  if (!nextMove) return;

  const currentStones = boardData.states[currentMoveIndex];
  if (currentStones.some((s) => s.row === pos.row && s.col === pos.col)) return; // point déjà occupé

  guessScore.total++;
  const isCorrect = pos.row === nextMove.row && pos.col === nextMove.col;

  if (isCorrect) {
    guessScore.correct++;
    guessAdvancing = true;
    goban.draw(boardData.states[currentMoveIndex + 1], nextMove, [], [], []);
    document.getElementById("guess-feedback").innerHTML = `<div style="color:#166534;font-weight:600;">${t("proGame.correct")}</div>`;
    document.getElementById("guess-status").textContent = t("proGame.errorSoFar", { pct: errorPct() });
    document.getElementById("guess-finish-btn").classList.toggle("hidden", guessScore.total === 0);
    setTimeout(() => {
      guessAdvancing = false;
      currentMoveIndex++;
      advanceGuessPrompt();
    }, 450);
  } else {
    document.getElementById("guess-feedback").innerHTML = `<div style="color:#b91c1c;font-weight:600;">${t("proGame.wrong")}</div>`;
    document.getElementById("guess-status").textContent = t("proGame.guessPromptRetry", {
      n: currentMoveIndex + 1,
      color: colorLabel(nextMove.color),
      pct: errorPct(),
    });
    document.getElementById("guess-finish-btn").classList.toggle("hidden", guessScore.total === 0);
  }
}

function errorPct() {
  if (!guessScore.total) return 0;
  return Math.round((1 - guessScore.correct / guessScore.total) * 100);
}

function finishGuessSession() {
  guessFinished = true;
  document.getElementById("guess-finish-btn").classList.add("hidden");
  document.getElementById("guess-feedback").innerHTML = "";

  const total = guessScore.total;
  document.getElementById("guess-status").textContent = t("proGame.sessionOver");
  const summaryEl = document.getElementById("guess-summary");
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = total
    ? `<strong>${t("proGame.result", { correct: guessScore.correct, total, pct: errorPct() })}</strong>`
    : `<span class="muted">${t("proGame.resultEmpty")}</span>`;

  if (total > 0) {
    saveGuessResult(total, guessScore.correct);
    renderHistory();
  }
}

function saveGuessResult(total, correct) {
  const key = STORAGE_PREFIX + "progames_stats";
  const all = JSON.parse(localStorage.getItem(key) || "{}");
  const list = all[game.id] || [];
  list.unshift({ date: new Date().toISOString(), total, correct });
  all[game.id] = list.slice(0, 20);
  localStorage.setItem(key, JSON.stringify(all));
}

function renderHistory() {
  const key = STORAGE_PREFIX + "progames_stats";
  const all = JSON.parse(localStorage.getItem(key) || "{}");
  const list = all[game.id] || [];
  const el = document.getElementById("guess-history");
  if (!list.length) {
    el.innerHTML = `<p class="muted">${t("proGame.historyEmpty")}</p>`;
    return;
  }
  el.innerHTML = list
    .map((s) => {
      const errPct = s.total ? Math.round((1 - s.correct / s.total) * 100) : 0;
      const d = new Date(s.date);
      const row = t("proGame.historyRow", { correct: s.correct, total: s.total, pct: errPct });
      return `<div class="error-item" style="cursor:default;"><span class="move-no">${d.toLocaleDateString()}</span><span class="error-item-label">${row}</span></div>`;
    })
    .join("");
}
