/**
 * Détecte les réponses de l’ancienne dev-api (« Merci pour ton message… », sans LLM).
 * Utile lorsqu’un ancien processus répond encore sur le port proxifié.
 */
export function detectLegacyCoachStubReply(text) {
  if (text == null || typeof text !== "string") return false;
  const s = text;
  if (!/Merci pour ton message/i.test(s)) return false;
  if (!/pour aller plus loin/i.test(s)) return false;
  if (!/fiches métiers|fiches métier/i.test(s)) return false;
  if (!/ONISEP/i.test(s)) return false;
  return true;
}
