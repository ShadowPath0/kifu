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

// Le libellé de semaine est composé à l'affichage (pas stocké en dur en français dans
// les données) pour qu'il se traduise correctement en anglais.
function weekTabLabel(weekDate) {
  const locale = getLang() === "en" ? "en-US" : "fr-FR";
  const date = new Date(weekDate + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  return t("challenges.weekTabLabel", { date });
}

// Groupe les défis par semaine (un onglet par semaine, la plus récente en premier) au
// lieu d'une longue liste plate — plus lisible dès qu'il y a plusieurs semaines d'archivées.
function groupByWeek(list) {
  const order = []; // ordre d'apparition des dates de semaine
  const byWeek = new Map();
  for (const c of [...list].sort((a, b) => (a.id < b.id ? 1 : -1))) {
    if (!byWeek.has(c.weekDate)) {
      byWeek.set(c.weekDate, []);
      order.push(c.weekDate);
    }
    byWeek.get(c.weekDate).push(c);
  }
  return order.map((weekDate) => ({ weekDate, items: byWeek.get(weekDate) }));
}

function renderChallenges() {
  const listEl = document.getElementById("challenges-list");
  const tabsEl = document.getElementById("challenges-tabs");
  const shareEl = document.getElementById("challenges-share-week");

  if (!CHALLENGES.length) {
    tabsEl.innerHTML = "";
    listEl.innerHTML = `<div class="panel muted">${t("challenges.empty")}</div>`;
    shareEl.innerHTML = "";
    return;
  }

  const groups = groupByWeek(CHALLENGES);
  if (!activeWeek || !groups.some((g) => g.weekDate === activeWeek)) activeWeek = groups[0].weekDate;

  tabsEl.innerHTML = groups
    .map(
      (g) =>
        `<button type="button" class="tab-btn${g.weekDate === activeWeek ? " active" : ""}" data-week="${escapeHtml(g.weekDate)}">${escapeHtml(weekTabLabel(g.weekDate))}</button>`
    )
    .join("");
  tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeWeek = btn.dataset.week;
      renderChallenges();
    });
  });

  const done = new Set(doneIds());
  const activeGroup = groups.find((g) => g.weekDate === activeWeek);
  const allDone = activeGroup.items.every((c) => done.has(c.id));

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
    cb.addEventListener("change", () => {
      setDone(cb.dataset.done, cb.checked);
      renderChallenges();
    });
  });

  // Le partage Discord se fait pour la semaine entière, d'un seul coup, une fois que
  // TOUS les défis de la semaine active sont cochés "Fait !" — pas défi par défi.
  shareEl.innerHTML = allDone
    ? `<button type="button" class="btn primary" id="challenges-share-btn">${t("challenges.shareWeek")}</button>`
    : `<p class="muted" style="font-size:0.85rem;">${t("challenges.shareWeekLocked")}</p>`;
  if (allDone) {
    document.getElementById("challenges-share-btn").addEventListener("click", () => copyDiscordWeekMessage(activeGroup));
  }
}

// Pas de backend, pas de compte : le point Discord se fait "à l'honneur" — on prépare un
// message tout prêt que la personne colle elle-même dans le salon dédié du serveur.
function copyDiscordWeekMessage(group) {
  const list = group.items.map((c) => `• ${c.title}`).join("\n");
  const message = t("challenges.discordWeekMessage", { week: weekTabLabel(group.weekDate), list });
  navigator.clipboard?.writeText(message).then(
    () => showToast(t("challenges.copied")),
    () => showToast(t("challenges.copyFailed"), true)
  );
}
