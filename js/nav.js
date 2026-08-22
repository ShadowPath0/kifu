function renderNav(active) {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const links = [
    { href: "index.html", label: "Dashboard", key: "dashboard" },
    { href: "import.html", label: "Importer", key: "import" },
    { href: "games.html", label: "Parties", key: "games" },
    { href: "progression.html", label: "Progression", key: "progression" },
    { href: "reports.html", label: "Rapports", key: "reports" },
    { href: "categories.html", label: "Étiquettes", key: "categories" },
    { href: "data.html", label: "Sauvegarde", key: "data" },
  ];
  root.innerHTML =
    `<a class="brand" href="index.html">碁 Kifu</a>` +
    links
      .map(
        (l) =>
          `<a class="nav-link${l.key === active ? " active" : ""}" href="${l.href}">${l.label}</a>`
      )
      .join("");
}
