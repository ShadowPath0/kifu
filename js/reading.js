document.addEventListener("DOMContentLoaded", () => {
  renderNav("reading");
  renderList();
});

function renderList() {
  const el = document.getElementById("reading-list");
  const sequences = loadCollection("reading_sequences");

  if (!sequences.length) {
    el.innerHTML = `<div class="panel muted">${t("reading.empty")}</div>`;
    return;
  }

  el.innerHTML = [...sequences]
    .reverse()
    .map(
      (s) => `
      <div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 4px;">${escapeHtml(s.name)}</h2>
          <div class="muted">${escapeHtml(t("reading.card.info", { game: s.gameTitle, n: s.moves.length, from: s.anchorMoveNumber }))}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <a class="btn primary" href="reading-train.html?id=${s.id}">${t("reading.train")}</a>
          <button class="danger icon-btn" data-del="${s.id}">${t("categories.delete")}</button>
        </div>
      </div>`
    )
    .join("");

  el.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm(t("reading.deleteConfirm"))) return;
      const id = parseInt(btn.dataset.del, 10);
      saveCollection("reading_sequences", loadCollection("reading_sequences").filter((s) => s.id !== id));
      renderList();
    });
  });
}
