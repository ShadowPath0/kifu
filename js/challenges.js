document.addEventListener("DOMContentLoaded", () => {
  renderNav("challenges");
  renderChallenges();
});

function doneIds() {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + "challenges_done") || "[]");
}

function setDone(id, done) {
  const ids = new Set(doneIds());
  if (done) ids.add(id);
  else ids.delete(id);
  localStorage.setItem(STORAGE_PREFIX + "challenges_done", JSON.stringify([...ids]));
}

function challengeActionHtml(c) {
  if (c.type === "memorize") {
    const game = (typeof PRO_GAMES !== "undefined" ? PRO_GAMES : []).find((g) => g.id === c.proGameId);
    if (!game) return "";
    const range = c.fromMove || c.toMove ? `&from=${c.fromMove || 1}&to=${c.toMove || 9999}` : "";
    return `<a class="btn primary" href="pro-game.html?id=${encodeURIComponent(c.proGameId)}&mode=guess${range}">${t("challenges.play")}</a>`;
  }
  if (c.type === "tsumego" && c.url) {
    return `<a class="btn primary" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${t("challenges.open")}</a>`;
  }
  return "";
}

function renderChallenges() {
  const el = document.getElementById("challenges-list");
  const done = new Set(doneIds());
  const sorted = [...CHALLENGES].sort((a, b) => (a.id < b.id ? 1 : -1)); // plus récent (id) en premier

  if (!sorted.length) {
    el.innerHTML = `<div class="panel muted">${t("challenges.empty")}</div>`;
    return;
  }

  el.innerHTML = sorted
    .map((c) => {
      const isDone = done.has(c.id);
      return `
      <div class="panel" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div class="muted" style="font-size:0.78rem;">${escapeHtml(c.weekLabel)} · <span class="challenge-type-badge">${t("challenges.type." + c.type)}</span></div>
          <h2 style="margin:4px 0 6px;">${escapeHtml(c.title)}</h2>
          <p class="muted" style="margin:0;">${escapeHtml(c.description)}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
          ${challengeActionHtml(c)}
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;">
            <input type="checkbox" data-done="${c.id}" ${isDone ? "checked" : ""} />
            ${t("challenges.markDone")}
          </label>
        </div>
      </div>`;
    })
    .join("");

  el.querySelectorAll("input[data-done]").forEach((cb) => {
    cb.addEventListener("change", () => setDone(cb.dataset.done, cb.checked));
  });
}
