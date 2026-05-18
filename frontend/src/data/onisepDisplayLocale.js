/** Règles d’affichage ONISEP (formations) hors français — complété par l’API /localize pour les libellés. */

const FORMATION_TYPE_EN = {
  "formation d'école spécialisée": "Specialized school program",
  "formation d'école spécialisee": "Specialized school program",
  "diplôme d'institut d'études politiques": "Political studies institute degree",
  "diplome d'institut d'etudes politiques": "Political studies institute degree",
};

function translateNiveauLine(text, lang) {
  if (!text || lang === "fr") return text;
  if (lang !== "en") return text;
  const low = String(text).trim().toLowerCase();
  if (FORMATION_TYPE_EN[low]) return FORMATION_TYPE_EN[low];
  return String(text)
    .replace(/\bbac\s*\+\s*(\d+)\b/gi, "Level Bac+$1")
    .replace(/^bac$/i, "High school diploma (Bac)")
    .replace(/(\d+)\s*ans?\b/gi, "$1 years")
    .replace(/durée\s*:\s*/gi, "Duration: ");
}

function localizeFormation(f, lang) {
  if (!f || lang === "fr") return f;
  const out = { ...f };
  for (const key of ["type_formation", "niveau_sortie", "niveau_label", "resume", "domain_label", "duree"]) {
    if (typeof out[key] === "string" && out[key].trim()) {
      out[key] = translateNiveauLine(out[key], lang);
    }
  }
  return out;
}

export function applyRuleBasedRecommendations(recs, language) {
  const lang = String(language || "fr").split("-")[0].toLowerCase() || "fr";
  if (lang === "fr" || !Array.isArray(recs)) return recs;
  return recs.map((hit) => {
    if (!hit || typeof hit !== "object") return hit;
    const formations = Array.isArray(hit.formations)
      ? hit.formations.map((f) => localizeFormation(f, lang))
      : hit.formations;
    return { ...hit, formations };
  });
}
