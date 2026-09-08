// Système de langue FR/EN, 100% client (pas de backend) : un dictionnaire par langue,
// une préférence par navigateur (localStorage), et deux façons de l'utiliser :
//  - HTML statique : attribut data-i18n="clé" (contenu texte), data-i18n-placeholder / -title
//    pour les attributs placeholder/title. Appliqué automatiquement au chargement de chaque page.
//  - HTML généré en JS : appeler t("clé", { var: valeur }) au moment de construire la chaîne.

const I18N_LANG_KEY = "kifu_v1_lang";

const I18N = {
  fr: {
    "nav.dashboard": "Dashboard",
    "nav.import": "Importer",
    "nav.games": "Parties",
    "nav.proGames": "Parties pro",
    "nav.progression": "Progression",
    "nav.reports": "Rapports",
    "nav.categories": "Étiquettes",
    "nav.data": "Sauvegarde",

    "dashboard.title": "Dashboard",
    "dashboard.filters.from": "Du",
    "dashboard.filters.to": "Au",
    "dashboard.filters.color": "Couleur",
    "dashboard.filters.colorAll": "Toutes",
    "dashboard.filters.colorBlack": "Noir",
    "dashboard.filters.colorWhite": "Blanc",
    "dashboard.filters.phase": "Phase",
    "dashboard.filters.phaseAll": "Toutes",
    "dashboard.filters.phaseFuseki": "Fuseki",
    "dashboard.filters.phaseMilieu": "Milieu",
    "dashboard.filters.phaseYose": "Yose",
    "dashboard.filters.severity": "Sévérité",
    "dashboard.filters.severityAll": "Toutes",
    "dashboard.filters.severityMineure": "Mineure",
    "dashboard.filters.severityMoyenne": "Moyenne",
    "dashboard.filters.severityCritique": "Critique",
    "dashboard.filters.platform": "Plateforme",
    "dashboard.filters.platformPlaceholder": "ex : KGS",
    "dashboard.filters.apply": "Filtrer",
    "dashboard.filters.last30d": "30 derniers jours",
    "dashboard.filters.reset": "Tout l'historique",
    "dashboard.pareto.title": "Pareto des erreurs",
    "dashboard.pareto.empty": "Aucune erreur taguée sur cette période.",
    "dashboard.recent.title": "Parties récentes",
    "dashboard.recent.empty": "Aucune partie encore importée.",
    "dashboard.recent.import": "+ Importer une partie",
    "dashboard.heatmap.title": "Heatmap phase × sévérité",
    "dashboard.heatmap.empty": "Aucune erreur taguée sur cette période.",
    "dashboard.stat.games": "Parties",
    "dashboard.stat.errors": "Erreurs taguées",
    "dashboard.stat.errorsPerGame": "Erreurs / partie",
    "dashboard.errorCount": "{n} erreur(s)",
    "dashboard.loadError": "Erreur de chargement : {msg}",

    "proGames.title": "Parties pro",
    "proGames.intro": "Bibliothèque commune de parties professionnelles/historiques, la même pour tout le monde. Rejouez-les normalement, ou testez-vous en mode « Deviner le coup ».",
    "proGames.replay": "Rejouer",
    "proGames.guess": "🎯 Deviner le coup",
    "proGames.notFound": "Partie pro introuvable.",
    "proGame.back": "← Retour aux parties pro",
    "proGame.normalLabelInitial": "Coup 0 (position initiale)",
    "proGame.normalLabel": "Coup {n} — {color}",
    "proGame.normalLabelPass": "Coup {n} — {color} (passe)",
    "proGame.normalHint": "⌨ Flèches (←↑ précédent, →↓ suivant) · Début/Fin (premier/dernier coup)",
    "proGame.guessTitle": "🎯 Deviner le coup",
    "proGame.guessPrompt": "Coup {n} — {color} à jouer. Cliquez sur le plateau pour proposer un coup. ({pct}% d'erreur)",
    "proGame.guessPromptRetry": "Coup {n} — {color} à jouer. ({pct}% d'erreur)",
    "proGame.correct": "✅ Correct !",
    "proGame.wrong": "❌ Ce n'est pas le bon coup, réessayez.",
    "proGame.errorSoFar": "{pct}% d'erreur jusqu'ici",
    "proGame.finishBtn": "Terminer la session",
    "proGame.sessionOver": "Session terminée.",
    "proGame.result": "Résultat : {correct} coup(s) trouvé(s) en {total} essai(s) ({pct}% d'erreur)",
    "proGame.resultEmpty": "Aucun coup deviné avant l'arrêt de la session.",
    "proGame.history": "Historique",
    "proGame.historyEmpty": "Aucune tentative enregistrée pour l'instant.",
    "proGame.historyRow": "{correct} coup(s) en {total} essai(s) ({pct}% d'erreur)",
    "colorBlack": "Noir",
    "colorWhite": "Blanc",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.import": "Import",
    "nav.games": "Games",
    "nav.proGames": "Pro games",
    "nav.progression": "Progress",
    "nav.reports": "Reports",
    "nav.categories": "Tags",
    "nav.data": "Backup",

    "dashboard.title": "Dashboard",
    "dashboard.filters.from": "From",
    "dashboard.filters.to": "To",
    "dashboard.filters.color": "Color",
    "dashboard.filters.colorAll": "All",
    "dashboard.filters.colorBlack": "Black",
    "dashboard.filters.colorWhite": "White",
    "dashboard.filters.phase": "Phase",
    "dashboard.filters.phaseAll": "All",
    "dashboard.filters.phaseFuseki": "Fuseki",
    "dashboard.filters.phaseMilieu": "Middlegame",
    "dashboard.filters.phaseYose": "Endgame",
    "dashboard.filters.severity": "Severity",
    "dashboard.filters.severityAll": "All",
    "dashboard.filters.severityMineure": "Minor",
    "dashboard.filters.severityMoyenne": "Medium",
    "dashboard.filters.severityCritique": "Critical",
    "dashboard.filters.platform": "Platform",
    "dashboard.filters.platformPlaceholder": "e.g. KGS",
    "dashboard.filters.apply": "Filter",
    "dashboard.filters.last30d": "Last 30 days",
    "dashboard.filters.reset": "All time",
    "dashboard.pareto.title": "Error Pareto",
    "dashboard.pareto.empty": "No tagged errors in this period.",
    "dashboard.recent.title": "Recent games",
    "dashboard.recent.empty": "No game imported yet.",
    "dashboard.recent.import": "+ Import a game",
    "dashboard.heatmap.title": "Phase × severity heatmap",
    "dashboard.heatmap.empty": "No tagged errors in this period.",
    "dashboard.stat.games": "Games",
    "dashboard.stat.errors": "Tagged errors",
    "dashboard.stat.errorsPerGame": "Errors / game",
    "dashboard.errorCount": "{n} error(s)",
    "dashboard.loadError": "Loading error: {msg}",

    "proGames.title": "Pro games",
    "proGames.intro": "Shared library of professional/historical games, the same for everyone. Replay them normally, or test yourself in \"Guess the move\" mode.",
    "proGames.replay": "Replay",
    "proGames.guess": "🎯 Guess the move",
    "proGames.notFound": "Pro game not found.",
    "proGame.back": "← Back to pro games",
    "proGame.normalLabelInitial": "Move 0 (starting position)",
    "proGame.normalLabel": "Move {n} — {color}",
    "proGame.normalLabelPass": "Move {n} — {color} (pass)",
    "proGame.normalHint": "⌨ Arrows (←↑ previous, →↓ next) · Home/End (first/last move)",
    "proGame.guessTitle": "🎯 Guess the move",
    "proGame.guessPrompt": "Move {n} — {color} to play. Click on the board to propose a move. ({pct}% error)",
    "proGame.guessPromptRetry": "Move {n} — {color} to play. ({pct}% error)",
    "proGame.correct": "✅ Correct!",
    "proGame.wrong": "❌ Not the right move, try again.",
    "proGame.errorSoFar": "{pct}% error so far",
    "proGame.finishBtn": "End session",
    "proGame.sessionOver": "Session over.",
    "proGame.result": "Result: {correct} move(s) found in {total} attempt(s) ({pct}% error)",
    "proGame.resultEmpty": "No move guessed before the session was stopped.",
    "proGame.history": "History",
    "proGame.historyEmpty": "No attempt recorded yet.",
    "proGame.historyRow": "{correct} move(s) in {total} attempt(s) ({pct}% error)",
    "colorBlack": "Black",
    "colorWhite": "White",
  },
};

function getLang() {
  const stored = localStorage.getItem(I18N_LANG_KEY);
  if (stored === "fr" || stored === "en") return stored;
  return navigator.language && navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function setLang(lang) {
  localStorage.setItem(I18N_LANG_KEY, lang);
  location.reload();
}

function t(key, vars) {
  const lang = getLang();
  let str = (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
  if (vars) {
    for (const k of Object.keys(vars)) str = str.split(`{${k}}`).join(vars[k]);
  }
  return str;
}

function applyStaticTranslations(root) {
  (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  (root || document).querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  (root || document).querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

document.addEventListener("DOMContentLoaded", () => applyStaticTranslations());
