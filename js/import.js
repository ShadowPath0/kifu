let sgfContent = null;
let sgfBlackPlayer = null;
let sgfWhitePlayer = null;

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

  document.getElementById("f-color").addEventListener("change", (e) => {
    if (!sgfBlackPlayer && !sgfWhitePlayer) return;
    const opponent = e.target.value === "black" ? sgfWhitePlayer : e.target.value === "white" ? sgfBlackPlayer : null;
    if (opponent) document.getElementById("f-opponent").value = opponent;
  });

  const linkInput = document.getElementById("external-link");
  linkInput.addEventListener("blur", () => tryFetchFromLink(linkInput.value.trim()));
});

async function tryFetchFromLink(url) {
  const statusEl = document.getElementById("link-status");
  if (!url) {
    statusEl.textContent = "";
    return;
  }
  if (sgfContent) return; // un fichier a déjà été importé, on ne l'écrase pas
  if (!isSupportedSgfLink(url)) {
    statusEl.textContent = "";
    return;
  }
  statusEl.textContent = t("import.linkFetching");
  const fetched = await fetchSgfFromLink(url);
  if (!fetched) {
    statusEl.textContent = t("import.linkFailed");
    return;
  }
  sgfContent = fetched;
  document.getElementById("sgf-status").textContent = t("import.linkFetched");
  statusEl.textContent = t("import.linkFetchedStatus");
  if (!document.getElementById("f-platform").value) document.getElementById("f-platform").value = "OGS";
  try {
    const preview = await api.parseSgf(sgfContent);
    fillFromPreview(preview);
    showToast(t("import.linkPrefilled"));
  } catch (_) {
    /* on garde quand même le SGF même si le pré-remplissage échoue */
  }
}

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith(".sgf")) {
    document.getElementById("sgf-status").textContent = t("import.sgfNotSgf");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    sgfContent = reader.result;
    document.getElementById("sgf-status").textContent = t("import.sgfLoaded", { name: file.name });
    try {
      const preview = await api.parseSgf(sgfContent);
      fillFromPreview(preview);
      showToast(t("import.sgfParsed"));
    } catch (err) {
      document.getElementById("sgf-status").textContent = t("import.sgfLoadedButError", { name: file.name, msg: err.message });
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
  sgfBlackPlayer = p.black_player || null;
  sgfWhitePlayer = p.white_player || null;
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
    black_player: sgfBlackPlayer,
    white_player: sgfWhitePlayer,
  };

  try {
    const game = await api.createGame(payload);
    showToast(t("import.saved"));
    window.location.href = `game.html?id=${game.id}`;
  } catch (err) {
    errEl.textContent = t("import.error", { msg: err.message });
  }
}
