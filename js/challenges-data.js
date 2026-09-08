// Défis communautaires hebdomadaires, embarqués dans le site (même liste pour tout le
// monde, pas de backend). Pour en ajouter un : donner le contenu à Claude.
// type "memorize" : lien vers une partie pro en mode "deviner le coup", éventuellement
//   limité à une plage de coups via fromMove/toMove (mémoriser une séquence précise).
// type "tsumego" : lien externe (problème de lecture/tsumego) + description.
// type "custom" : juste une description libre, pas de lien.

const CHALLENGES = [
  {
    id: "week-2026-09-08-cho-seo",
    weekDate: "2026-09-08",
    title: "Mémoriser Cho Hun-hyeon vs Seo Pong-su (14e Kiwang, 1989)",
    description: "Rejouez de mémoire cette finale du Kiwang, jusqu'au coup 150, en mode Deviner le coup.",
    type: "memorize",
    proGameId: "cho-hunhyeon-seo-pongsu-1989",
    fromMove: 1,
    toMove: 150,
  },
  {
    id: "week-2026-09-08-shin-xie",
    weekDate: "2026-09-08",
    title: "Mémoriser Shin Jinseo vs Xie Ke (Coupe Lanke de Quzhou, 2026)",
    description: "Rejouez de mémoire cette partie récente entre deux 9 dan, jusqu'au coup 150, en mode Deviner le coup.",
    type: "memorize",
    proGameId: "shin-jinseo-xie-ke-2026",
    fromMove: 1,
    toMove: 150,
  },
  {
    id: "week-2026-09-08-mok-lee",
    weekDate: "2026-09-08",
    title: "Mémoriser Mok Jinseok vs Lee Changho",
    description: "Rejouez de mémoire cette partie (elle se termine par abandon au coup 119), en mode Deviner le coup.",
    type: "memorize",
    proGameId: "mok-jinseok-lee-changho",
    fromMove: 1,
    toMove: 150,
  },
];
