import specialtyFr from "./specialtyLabels.fr.json" with { type: "json" };
import specialtyEn from "./specialtyLabels.en.json" with { type: "json" };
import specialtyAr from "./specialtyLabels.ar.json" with { type: "json" };
import specialtyEs from "./specialtyLabels.es.json" with { type: "json" };
import specialtyPt from "./specialtyLabels.pt.json" with { type: "json" };
import specialtyRu from "./specialtyLabels.ru.json" with { type: "json" };
import specialtyDe from "./specialtyLabels.de.json" with { type: "json" };
import specialtyZh from "./specialtyLabels.zh.json" with { type: "json" };
import specialtyHi from "./specialtyLabels.hi.json" with { type: "json" };
import specialtyJa from "./specialtyLabels.ja.json" with { type: "json" };
import { canonicalLanguageForTexts } from "./translations.js";

const SPECIALTY_PACKS = {
  fr: specialtyFr,
  en: specialtyEn,
  ar: specialtyAr,
  es: specialtyEs,
  pt: specialtyPt,
  ru: specialtyRu,
  de: specialtyDe,
  zh: specialtyZh,
  hi: specialtyHi,
  ja: specialtyJa,
};

/**
 * Libellés Q4 (spécialités) — pack par langue UI, repli EN si absent.
 */
export function getSpecialtyChoiceText(language, domain, value, fallback = {}) {
  const lang = canonicalLanguageForTexts(language);
  const pack = SPECIALTY_PACKS[lang] ?? specialtyEn;
  const domainKey = domain === "communication" ? "creative" : domain;
  const row = pack[domainKey]?.[value];
  if (row?.title != null && row.title !== "" && row?.sub != null && row.sub !== "") {
    return { title: row.title, sub: row.sub };
  }
  return { title: fallback.title ?? "", sub: fallback.sub ?? "" };
}
