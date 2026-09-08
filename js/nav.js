function renderNav(active) {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const links = [
    { href: "index.html", label: t("nav.dashboard"), key: "dashboard" },
    { href: "import.html", label: t("nav.import"), key: "import" },
    { href: "games.html", label: t("nav.games"), key: "games" },
    { href: "pro-games.html", label: t("nav.proGames"), key: "pro-games" },
    { href: "progression.html", label: t("nav.progression"), key: "progression" },
    { href: "reports.html", label: t("nav.reports"), key: "reports" },
    { href: "categories.html", label: t("nav.categories"), key: "categories" },
    { href: "data.html", label: t("nav.data"), key: "data" },
  ];
  const lang = getLang();
  root.innerHTML =
    `<a class="brand" href="index.html">碁 Kifu</a>` +
    links
      .map(
        (l) =>
          `<a class="nav-link${l.key === active ? " active" : ""}" href="${l.href}">${l.label}</a>`
      )
      .join("") +
    `<span class="lang-switch">` +
    `<button type="button" class="lang-btn${lang === "fr" ? " active" : ""}" data-lang="fr">FR</button>` +
    `<button type="button" class="lang-btn${lang === "en" ? " active" : ""}" data-lang="en">EN</button>` +
    `</span>`;
  root.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}
