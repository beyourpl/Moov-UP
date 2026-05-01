/**
 * Retire les liens ONISEP / références en fin de message assistant (affichage chat uniquement).
 */
export function stripTrailingOnisepFromAssistantText(content) {
  if (content == null || typeof content !== "string") return content;
  let s = content.trimEnd();
  const patterns = [
    /\s*\[[^\]]*ONISEP[^\]]*]\([^)]+\)\s*$/i,
    /\s*\[[^\]]*onisep[^\]]*]\([^)]+\)\s*$/i,
    /\s*https?:\/\/[^\s)\\]*onisep[^\s)\\]*\s*$/i,
    /\s*(?:→\s*|—\s*)?Fiche\s+ONISEP[^.!?]*[.!?]?\s*$/i,
    /\s*Voir\s+(?:la\s+)?fiche\s+(?:official\s+)?ONISEP[^.!?]*[.!?]?\s*$/i,
    /\s*(?:En savoir plus|Pour aller plus loin)[^.!?\n]*ONISEP[^.!?]*[.!?]?\s*$/i,
    /\s*Ressource[^.!?\n]*ONISEP[^.!?]*[.!?]?\s*$/i,
    /\s*(?:Learn more|See more)[^.!?\n]*ONISEP[^.!?]*[.!?]?\s*$/i,
    /\s*(?:➜|→)\s*https?:\/\/[^\s]+onisep[^\s]*\s*$/i,
  ];
  let prev;
  do {
    prev = s;
    for (const re of patterns) {
      s = s.replace(re, "").trimEnd();
    }
  } while (s !== prev);
  return s;
}
