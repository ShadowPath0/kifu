// Défis communautaires hebdomadaires, embarqués dans le site (même liste pour tout le
// monde, pas de backend). Pour en ajouter un : donner le contenu à Claude.
// type "memorize" : lien vers une partie pro en mode "deviner le coup", éventuellement
//   limité à une plage de coups via fromMove/toMove (mémoriser une séquence précise).
// type "tsumego" : lien externe (problème de lecture/tsumego) + description.
// type "custom" : juste une description libre, pas de lien.

const CHALLENGES = [
  {
    id: "week-2026-09-08",
    weekLabel: "Semaine du 8 septembre 2026",
    title: "Mémoriser l'ouverture de la partie de l'oreille rouge",
    description:
      "Rejouez de mémoire les 20 premiers coups de la célèbre partie de l'oreille rouge (Shusaku vs Gennan Inseki, 1846), en mode Deviner le coup.",
    type: "memorize",
    proGameId: "shusaku-ear-reddening-1846",
    fromMove: 1,
    toMove: 20,
  },
];
