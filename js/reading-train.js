let sequence, goban;
let studyIndex = 0;
let studyTimer = null;
let step = 0; // prochain coup à reproduire (index dans sequence.moves)
let score = { correct: 0, total: 0 }; // sur toute la session (chaque clic, bon ou mauvais)
let attempts = 0; // nombre de tentatives complètes de la séquence (réussie ou ratée)
let awaiting = false; // vrai pendant le court flash après un clic

document.addEventListener("DOMContentLoaded", () => {
  renderNav("reading");
  const params = new URLSearchParams(window.location.search);
  const branchId = parseInt(params.get("branchId"), 10);
  const branch = loadCollection("branches").find((b) => b.id === branchId);
  const parentGame = branch ? loadCollection("games").find((g) => g.id === branch.game_id) : null;
  if (!branch || !parentGame || !parentGame.sgf_content) {
    document.querySelector("main").innerHTML = `<div class="panel">${t("reading.notFound")}</div>`;
    return;
  }

  const gameBoardData = computeBoardStates(parentGame.sgf_content);
  sequence = {
    id: branch.id,
    name: branch.name,
    gameTitle: parentGame.title,
    gameId: parentGame.id,
    anchorMoveNumber: branch.anchor_move_number,
    boardSize: gameBoardData.size,
    anchorStones: gameBoardData.states[branch.anchor_move_number],
    moves: branch.moves,
  };

  document.getElementById("rt-title").textContent = sequence.name;
  document.getElementById("rt-summary").textContent = t("reading.summary", {
    game: sequence.gameTitle,
    n: sequence.moves.length,
    from: sequence.anchorMoveNumber,
  });

  goban = new Goban(document.getElementById("goban-canvas"), sequence.boardSize);

  document.getElementById("rt-rewatch-btn").addEventListener("click", startStudy);
  document.getElementById("rt-rewatch-btn2").addEventListener("click", () => {
    document.getElementById("rt-practice-panel").classList.add("hidden");
    document.getElementById("rt-study-panel").classList.remove("hidden");
    startStudy();
  });
  document.getElementById("rt-start-btn").addEventListener("click", startPractice);
  document.getElementById("goban-canvas").addEventListener("click", handlePracticeClick);

  renderHistory();
  startStudy();
});

function colorLabel(color) {
  return color === "b" ? t("colorBlack") : t("colorWhite");
}

// ---------- phase 1 : étude (auto-lecture de la séquence) ----------

function startStudy() {
  clearTimeout(studyTimer);
  studyIndex = 0;
  document.getElementById("rt-start-btn").disabled = true;
  playStudyStep();
}

function playStudyStep() {
  const stonesSoFar = sequence.anchorStones.concat(
    sequence.moves.slice(0, studyIndex).map((m) => ({ row: m.row, col: m.col, color: m.color }))
  );
  const moveNumbers = sequence.moves.slice(0, studyIndex).map((m, i) => ({ row: m.row, col: m.col, number: i + 1 }));
  const lastMove = studyIndex > 0 ? sequence.moves[studyIndex - 1] : null;
  goban.draw(stonesSoFar, lastMove, [], [], [], moveNumbers);

  if (studyIndex === 0) {
    document.getElementById("rt-study-status").textContent = t("reading.study.starting");
  } else if (studyIndex <= sequence.moves.length) {
    document.getElementById("rt-study-status").textContent = t("reading.study.progress", {
      n: studyIndex,
      total: sequence.moves.length,
    });
  }

  if (studyIndex >= sequence.moves.length) {
    document.getElementById("rt-study-status").textContent = t("reading.study.done");
    document.getElementById("rt-start-btn").disabled = false;
    return;
  }
  studyIndex++;
  studyTimer = setTimeout(playStudyStep, 700);
}

// ---------- phase 2 : reproduction (façon Go Magic) ----------

function startPractice() {
  clearTimeout(studyTimer);
  document.getElementById("rt-study-panel").classList.add("hidden");
  document.getElementById("rt-practice-panel").classList.remove("hidden");
  document.getElementById("rt-summary-box").classList.add("hidden");
  step = 0;
  resetBoardToAnchor();
  promptStep();
}

function resetBoardToAnchor() {
  goban.draw(sequence.anchorStones, null, [], [], []);
}

function promptStep() {
  document.getElementById("rt-feedback").innerHTML = "";
  const move = sequence.moves[step];
  document.getElementById("rt-status").textContent = t("reading.practice.prompt", {
    n: step + 1,
    total: sequence.moves.length,
    color: colorLabel(move.color),
    pct: errorPct(),
  });
}

function errorPct() {
  if (!score.total) return 0;
  return Math.round((1 - score.correct / score.total) * 100);
}

// Comme demandé : les pierres posées disparaissent (pas d'accumulation visuelle qui
// aiderait à mémoriser) et une erreur oblige à recommencer toute la séquence depuis le
// coup 1 — pas juste réessayer le coup en cours (contrairement au mode "Parties pro").
function handlePracticeClick(e) {
  if (awaiting) return;
  const pos = goban.pixelToPos(e.offsetX, e.offsetY);
  if (!pos) return;
  const occupied = sequence.anchorStones.some((s) => s.row === pos.row && s.col === pos.col);
  if (occupied) return;

  const move = sequence.moves[step];
  const isCorrect = pos.row === move.row && pos.col === move.col;
  score.total++;
  awaiting = true;

  if (isCorrect) {
    score.correct++;
    goban.draw(sequence.anchorStones.concat([move]), move, [], [], []);
    document.getElementById("rt-feedback").innerHTML = `<div style="color:#166534;font-weight:600;">${t("proGame.correct")}</div>`;
    setTimeout(() => {
      awaiting = false;
      step++;
      if (step >= sequence.moves.length) {
        finishAttempt(true);
      } else {
        resetBoardToAnchor();
        promptStep();
      }
    }, 450);
  } else {
    document.getElementById("rt-feedback").innerHTML = `<div style="color:#b91c1c;font-weight:600;">${t("reading.practice.wrong")}</div>`;
    setTimeout(() => {
      awaiting = false;
      finishAttempt(false);
    }, 700);
  }
}

function finishAttempt(success) {
  attempts++;
  if (success) {
    document.getElementById("rt-status").textContent = t("reading.practice.success");
    const box = document.getElementById("rt-summary-box");
    box.classList.remove("hidden");
    box.innerHTML = `<strong>${t("reading.practice.successDetail", { attempts, pct: errorPct() })}</strong>`;
    saveResult(true, attempts);
    renderHistory();
    attempts = 0;
    score = { correct: 0, total: 0 };
  } else {
    step = 0;
    resetBoardToAnchor();
    document.getElementById("rt-status").textContent = t("reading.practice.restart", { pct: errorPct() });
    setTimeout(() => promptStep(), 900);
  }
}

function saveResult(success, attemptsUsed) {
  const key = STORAGE_PREFIX + "reading_stats";
  const all = JSON.parse(localStorage.getItem(key) || "{}");
  const list = all[sequence.id] || [];
  list.unshift({ date: new Date().toISOString(), success, attempts: attemptsUsed });
  all[sequence.id] = list.slice(0, 20);
  localStorage.setItem(key, JSON.stringify(all));
}

function renderHistory() {
  const key = STORAGE_PREFIX + "reading_stats";
  const all = JSON.parse(localStorage.getItem(key) || "{}");
  const list = all[sequence.id] || [];
  const el = document.getElementById("rt-history");
  if (!list.length) {
    el.innerHTML = `<p class="muted">${t("reading.historyEmpty")}</p>`;
    return;
  }
  el.innerHTML = list
    .map((s) => {
      const d = new Date(s.date);
      return `<div class="error-item" style="cursor:default;"><span class="move-no">${d.toLocaleDateString()}</span><span class="error-item-label">${t(
        "reading.historyRow",
        { attempts: s.attempts }
      )}</span></div>`;
    })
    .join("");
}
