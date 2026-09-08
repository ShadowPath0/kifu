let activeWeek = null;

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

// Comme sur l'onglet Parties pro : pour mémoriser une partie il faut d'abord pouvoir la
// revoir tranquillement (mode normal) avant de se tester en Deviner le coup.
function challengeActionHtml(c) {
  if (c.type === "memorize") {
    const game = (typeof PRO_GAMES !== "undefined" ? PRO_GAMES : []).find((g) => g.id === c.proGameId);
    if (!game) return "";
    const range = c.fromMove || c.toMove ? `&from=${c.fromMove || 1}&to=${c.toMove || 9999}` : "";
    return (
      `<a class="btn" href="pro-game.html?id=${encodeURIComponent(c.proGameId)}&mode=normal">${t("challenges.review")}</a>` +
      `<a class="btn primary" href="pro-game.html?id=${encodeURIComponent(c.proGameId)}&mode=guess${range}">${t("challenges.play")}</a>`
    );
  }
  if (c.type === "tsumego" && c.url) {
    return `<a class="btn primary" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${t("challenges.open")}</a>`;
  }
  return "";
}

// Groupe les défis par semaine (un onglet par semaine, la plus récente en premier) au
// lieu d'une longue liste plate — plus lisible dès qu'il y a plusieurs semaines d'archivées.
function groupByWeek(list) {
  const order = []; // ordre d'apparition des libellés de semaine
  const byWeek = new Map();
  for (const c of [...list].sort((a, b) => (a.id < b.id ? 1 : -1))) {
    if (!byWeek.has(c.weekLabel)) {
      byWeek.set(c.weekLabel, []);
      order.push(c.weekLabel);
    }
    byWeek.get(c.weekLabel).push(c);
  }
  return order.map((week) => ({ week, items: byWeek.get(week) }));
}

function renderChallenges() {
  const listEl = document.getElementById("challenges-list");
  const tabsEl = document.getElementById("challenges-tabs");

  if (!CHALLENGES.length) {
    tabsEl.innerHTML = "";
    listEl.innerHTML = `<div class="panel muted">${t("challenges.empty")}</div>`;
    return;
  }

  const groups = groupByWeek(CHALLENGES);
  if (!activeWeek || !groups.some((g) => g.week === activeWeek)) activeWeek = groups[0].week;

  tabsEl.innerHTML = groups
    .map((g) => `<button type="button" class="tab-btn${g.week === activeWeek ? " active" : ""}" data-week="${escapeHtml(g.week)}">${escapeHtml(g.week)}</button>`)
    .join("");
  tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeWeek = btn.dataset.week;
      renderChallenges();
    });
  });

  const done = new Set(doneIds());
  const activeGroup = groups.find((g) => g.week === activeWeek);

  listEl.innerHTML = activeGroup.items
    .map((c) => {
      const isDone = done.has(c.id);
      return `
      <div class="panel" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div class="muted" style="font-size:0.78rem;"><span class="challenge-type-badge">${t("challenges.type." + c.type)}</span></div>
          <h2 style="margin:4px 0 6px;">${escapeHtml(c.title)}</h2>
          <p class="muted" style="margin:0;">${escapeHtml(c.description)}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">${challengeActionHtml(c)}</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;">
            <input type="checkbox" data-done="${c.id}" ${isDone ? "checked" : ""} />
            ${t("challenges.markDone")}
          </label>
        </div>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll("input[data-done]").forEach((cb) => {
    cb.addEventListener("change", () => setDone(cb.dataset.done, cb.checked));
  });
}
