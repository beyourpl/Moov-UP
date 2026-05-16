import specialtyFr from "./specialtyLabels.fr.json" with { type: "json" };
import specialtyEn from "./specialtyLabels.en.json" with { type: "json" };
import specialtyAr from "./specialtyLabels.ar.json" with { type: "json" };
import specialtyZh from "./specialtyLabels.zh.json" with { type: "json" };
import specialtyHi from "./specialtyLabels.hi.json" with { type: "json" };
import specialtyJa from "./specialtyLabels.ja.json" with { type: "json" };
import { canonicalLanguageForTexts } from "./translations.js";

/**
 * Libellés Q4 (spécialités) : FR/AR/ZH/HI/JA lorsque disponibles, sinon EN.
 */
export function getSpecialtyChoiceText(language, domain, value, fallback = {}) {
  const lang = canonicalLanguageForTexts(language);
  const pack =
    lang === "fr"
      ? specialtyFr
      : lang === "ar"
        ? specialtyAr
        : lang === "zh"
          ? specialtyZh
          : lang === "hi"
            ? specialtyHi
            : lang === "ja"
              ? specialtyJa
              : specialtyEn;
  const domainKey = domain === "communication" ? "creative" : domain;
  const row = pack[domainKey]?.[value];
  if (row?.title != null && row.title !== "" && row?.sub != null && row.sub !== "") {
    return { title: row.title, sub: row.sub };
  }
  return { title: fallback.title ?? "", sub: fallback.sub ?? "" };
}
