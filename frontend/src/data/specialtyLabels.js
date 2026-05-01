import specialtyFr from "./specialtyLabels.fr.json" with { type: "json" };
import specialtyEn from "./specialtyLabels.en.json" with { type: "json" };

/**
 * Libellés Q4 (spécialités) : FR pour la langue fr, EN pour toutes les autres locales.
 */
export function getSpecialtyChoiceText(language, domain, value, fallback = {}) {
  const pack = language === "fr" ? specialtyFr : specialtyEn;
  const row = pack[domain]?.[value];
  if (row?.title != null && row.title !== "" && row?.sub != null && row.sub !== "") {
    return { title: row.title, sub: row.sub };
  }
  return { title: fallback.title ?? "", sub: fallback.sub ?? "" };
}
