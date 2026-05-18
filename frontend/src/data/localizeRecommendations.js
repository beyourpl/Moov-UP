import { apiPost } from "./apiClient.js";
import { applyRuleBasedRecommendations } from "./onisepDisplayLocale.js";
import { canonicalLanguageForTexts } from "./translations.js";

const memoryCache = new Map();

function buildCacheKey(lang, recs) {
  const sig = (recs || [])
    .slice(0, 6)
    .map((h) => `${h?.metier?.libelle || ""}|${h?.formations?.length || 0}`)
    .join("::");
  return `${lang}::${sig}`;
}

/**
 * Traduit métiers / formations ONISEP pour l’UI (données source en français).
 * @param {Array} recs
 * @param {string} language
 * @returns {Promise<Array>}
 */
export async function localizeRecommendations(recs, language) {
  const lang = canonicalLanguageForTexts(language);
  if (lang === "fr" || !Array.isArray(recs) || recs.length === 0) {
    return recs;
  }

  const ruled = applyRuleBasedRecommendations(recs, lang);
  const key = buildCacheKey(lang, recs);
  if (memoryCache.has(key)) return memoryCache.get(key);

  try {
    const res = await apiPost("/api/recommendations/localize", {
      recommendations: recs,
      language: lang,
    });
    const out = Array.isArray(res?.recommendations) ? res.recommendations : ruled;
    memoryCache.set(key, out);
    return out;
  } catch {
    return ruled;
  }
}
