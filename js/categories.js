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
      <td><input type="text" value="${escapeHtml(categoryDisplayName(c))}" data-id="${c.id}" class="rename-input" style="border:none;background:transparent;padding:0;font-size:0.9rem;" /></td>
      <td>${c.is_preset ? `<span class="muted">${t("categories.preset")}</span>` : `<span class="muted">${t("categories.custom")}</span>`}</td>
      <td><button class="danger icon-btn" data-id="${c.id}">${t("categories.delete")}</button></td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".rename-input").forEach((input) => {
    input.addEventListener("change", async () => {
      try {
        const cat = cats.find((c) => c.id === parseInt(input.dataset.id, 10));
        // Un préréglage renommé n'est plus "le préréglage" : on décroche sa clé de
        // traduction pour que ce soit bien le nouveau nom qui s'affiche, dans les deux langues.
        const payload = { name: input.value };
        if (cat && cat.is_preset && cat.key && input.value !== cat.name) payload.key = null;
        await api.updateCategory(input.dataset.id, payload);
        showToast(t("categories.renamed"));
      } catch (err) {
        showToast(t("categories.error", { msg: err.message }), true);
        loadCategories();
      }
    });
  });
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(t("categories.deleteConfirm"))) return;
      try {
        await api.deleteCategory(btn.dataset.id);
        loadCategories();
        showToast(t("categories.deleted"));
      } catch (err) {
        showToast(t("categories.error", { msg: err.message }), true);
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
    errEl.textContent = t("categories.nameRequired");
    return;
  }
  try {
    await api.createCategory({ name, color });
    document.getElementById("new-name").value = "";
    loadCategories();
    showToast(t("categories.added"));
  } catch (err) {
    errEl.textContent = t("categories.error", { msg: err.message });
  }
}
