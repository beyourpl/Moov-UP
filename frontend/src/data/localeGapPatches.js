import gapsEn from "./gaps-en-fallback.json" with { type: "json" };
import gapStringTranslations from "./gapStringTranslations.json" with { type: "json" };

const TARGET_LANGS = ["es", "zh", "hi", "ar", "pt", "ru", "de", "ja"];

function translateGapString(enValue, lang) {
  if (!enValue || lang === "en") return enValue;
  const row = gapStringTranslations[enValue];
  if (row?.[lang]) return row[lang];
  return enValue;
}

/** Complète TEXTS avec les clés manquantes (évite le repli anglais de getText). */
export function applyLocaleGapPatches(TEXTS) {
  for (const lang of TARGET_LANGS) {
    const scopes = gapsEn[lang];
    if (!scopes) continue;
    for (const [scope, keys] of Object.entries(scopes)) {
      if (!TEXTS[lang]) TEXTS[lang] = {};
      if (!TEXTS[lang][scope]) TEXTS[lang][scope] = {};
      for (const [key, enValue] of Object.entries(keys)) {
        if (TEXTS[lang][scope][key] === undefined) {
          TEXTS[lang][scope][key] = translateGapString(enValue, lang);
        }
      }
    }
  }
}
