// Récupération automatique du SGF depuis un lien de partie/review en ligne.
// Seule partie du site qui touche le réseau en dehors de la salle de review —
// chargé sur les pages d'import et de fiche partie uniquement.

function parseOgsUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch (_) {
    return null;
  }
  if (!/(^|\.)online-go\.com$/.test(u.hostname)) return null;
  let m = u.pathname.match(/\/game\/(?:view\/)?(\d+)/);
  if (m) return { type: "game", id: m[1] };
  m = u.pathname.match(/\/review\/(\d+)/);
  if (m) return { type: "review", id: m[1] };
  return null;
}

function isSupportedSgfLink(url) {
  return !!parseOgsUrl(url);
}

// Retourne le contenu SGF (string) si récupéré avec succès, sinon null.
// N'échoue jamais bruyamment : un lien non reconnu, une erreur réseau ou un
// contenu invalide renvoient simplement null pour laisser l'appelant basculer
// sur le mode "lien externe" classique.
async function fetchSgfFromLink(url) {
  const parsed = parseOgsUrl(url);
  if (!parsed) return null;
  const endpoint =
    parsed.type === "game"
      ? `https://online-go.com/api/v1/games/${parsed.id}/sgf`
      : `https://online-go.com/api/v1/reviews/${parsed.id}/sgf`;
  let res;
  try {
    res = await fetch(endpoint);
  } catch (_) {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim().startsWith("(")) return null;
  return text;
}
