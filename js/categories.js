document.addEventListener("DOMContentLoaded", () => {
  renderNav("categories");
  document.getElementById("add-btn").addEventListener("click", addCategory);
  loadCategories();
});

async function loadCategories() {
  const cats = await api.listCategories();
  const tbody = document.getElementById("cat-tbody");
  tbody.innerHTML = "";
  for (const c of cats) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="color-swatch" style="background:${c.color}"></span></td>
      <td><input type="text" value="${escapeHtml(c.name)}" data-id="${c.id}" class="rename-input" style="border:none;background:transparent;padding:0;font-size:0.9rem;" /></td>
      <td>${c.is_preset ? '<span class="muted">preset</span>' : '<span class="muted">perso</span>'}</td>
      <td><button class="danger icon-btn" data-id="${c.id}">Suppr.</button></td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".rename-input").forEach((input) => {
    input.addEventListener("change", async () => {
      try {
        await api.updateCategory(input.dataset.id, { name: input.value });
        showToast("Étiquette renommée");
      } catch (err) {
        showToast("Erreur : " + err.message, true);
        loadCategories();
      }
    });
  });
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cette étiquette ? Les erreurs qui l'utilisent seront affectées.")) return;
      try {
        await api.deleteCategory(btn.dataset.id);
        loadCategories();
        showToast("Étiquette supprimée");
      } catch (err) {
        showToast("Erreur : " + err.message, true);
      }
    });
  });
}

async function addCategory() {
  const errEl = document.getElementById("form-error");
  errEl.textContent = "";
  const name = document.getElementById("new-name").value.trim();
  const color = document.getElementById("new-color").value;
  if (!name) {
    errEl.textContent = "Le nom est requis";
    return;
  }
  try {
    await api.createCategory({ name, color });
    document.getElementById("new-name").value = "";
    loadCategories();
    showToast("Étiquette ajoutée");
  } catch (err) {
    errEl.textContent = "Erreur : " + err.message;
  }
}
