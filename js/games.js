let allGames = [];
let sortKey = "date_played";
let sortDir = -1;

document.addEventListener("DOMContentLoaded", () => {
  renderNav("games");
  document.getElementById("fl-apply").addEventListener("click", loadGames);
  document.getElementById("fl-reset").addEventListener("click", () => {
    document.getElementById("fl-search").value = "";
    document.getElementById("fl-color").value = "";
    document.getElementById("fl-platform").value = "";
    document.getElementById("fl-date-from").value = "";
    document.getElementById("fl-date-to").value = "";
    loadGames();
  });
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = 1;
      }
      renderTable();
    });
  });
  loadGames();
});

async function loadGames() {
  const filters = {
    search: document.getElementById("fl-search").value,
    user_color: document.getElementById("fl-color").value,
    platform: document.getElementById("fl-platform").value,
    date_from: document.getElementById("fl-date-from").value,
    date_to: document.getElementById("fl-date-to").value,
  };
  try {
    allGames = await api.listGames(filters);
    renderTable();
  } catch (err) {
    showToast("Erreur de chargement : " + err.message, true);
  }
}

function renderTable() {
  const rows = [...allGames].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  const tbody = document.getElementById("games-tbody");
  tbody.innerHTML = "";
  document.getElementById("empty-msg").classList.toggle("hidden", rows.length > 0);

  for (const g of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(g.date_played || "—")}</td>
      <td>${escapeHtml(g.opponent_name || "—")}</td>
      <td>${escapeHtml(g.opponent_rank || "—")}</td>
      <td>${g.user_color === "black" ? "Noir" : g.user_color === "white" ? "Blanc" : "—"}</td>
      <td>${escapeHtml(g.result || "—")}</td>
      <td>${escapeHtml(g.platform || "—")}</td>
      <td>${g.error_count}</td>
    `;
    tr.addEventListener("click", () => (window.location.href = `game.html?id=${g.id}`));
    tbody.appendChild(tr);
  }
}
