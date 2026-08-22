let sgfContent = null;

document.addEventListener("DOMContentLoaded", () => {
  renderNav("import");

  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("sgf-input");

  dropzone.addEventListener("click", (e) => {
    if (e.target.tagName !== "LABEL") input.click();
  });
  input.addEventListener("change", () => {
    if (input.files[0]) handleFile(input.files[0]);
  });
  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  document.getElementById("submit-btn").addEventListener("click", submitGame);
});

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith(".sgf")) {
    document.getElementById("sgf-status").textContent = "Ce fichier n'a pas l'extension .sgf";
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    sgfContent = reader.result;
    document.getElementById("sgf-status").textContent = `Fichier chargé : ${file.name}`;
    try {
      const preview = await api.parseSgf(sgfContent);
      fillFromPreview(preview);
      showToast("SGF analysé, formulaire pré-rempli");
    } catch (err) {
      document.getElementById("sgf-status").textContent =
        `Fichier chargé (${file.name}) mais parsing impossible : ${err.message}`;
    }
  };
  reader.readAsText(file);
}

function fillFromPreview(p) {
  if (p.title) document.getElementById("f-title").value = p.title;
  if (p.date_played) document.getElementById("f-date").value = p.date_played;
  if (p.opponent_name) document.getElementById("f-opponent").value = p.opponent_name;
  if (p.result) document.getElementById("f-result").value = p.result;
  if (p.komi !== null && p.komi !== undefined) document.getElementById("f-komi").value = p.komi;
}

async function submitGame() {
  const errEl = document.getElementById("form-error");
  errEl.textContent = "";

  const payload = {
    title: document.getElementById("f-title").value || null,
    date_played: document.getElementById("f-date").value || null,
    opponent_name: document.getElementById("f-opponent").value || null,
    opponent_rank: document.getElementById("f-opponent-rank").value || null,
    user_color: document.getElementById("f-color").value || null,
    user_rank_at_time: document.getElementById("f-user-rank").value || null,
    komi: document.getElementById("f-komi").value
      ? parseFloat(document.getElementById("f-komi").value)
      : null,
    result: document.getElementById("f-result").value || null,
    time_control: document.getElementById("f-time-control").value || null,
    platform: document.getElementById("f-platform").value || null,
    comment: document.getElementById("f-comment").value || null,
    external_link: document.getElementById("external-link").value || null,
    sgf_content: sgfContent,
  };

  try {
    const game = await api.createGame(payload);
    showToast("Partie enregistrée");
    window.location.href = `game.html?id=${game.id}`;
  } catch (err) {
    errEl.textContent = "Erreur : " + err.message;
  }
}
