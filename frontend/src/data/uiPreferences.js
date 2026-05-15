import { SUPPORTED_LANGUAGES } from "./translations.js";

/** Choix utilisateur explicite uniquement ; absent = thème clair (ne pas relire l’ancienne clé `moovup_theme`). */
const THEME_CHOICE_KEY = "moovup_theme_choice_v1";
const LEGACY_THEME_KEY = "moovup_theme";
const LANGUAGE_KEY = "moovup_language";
const QUIZ_TICK_KEY = "moovup_quiz_tick_sound";
const UI_EVENT = "moovup-ui-change";
const FALLBACK_LANGUAGE = "fr";
const FALLBACK_QUIZ_TICK = "1";

function readStorage(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Some browsers block localStorage in private or restricted modes.
  }
}

export function getThemePreference() {
  const raw = readStorage(THEME_CHOICE_KEY, "").trim().toLowerCase();
  return raw === "dark" ? "dark" : "light";
}

export function setThemePreference(theme) {
  const normalized = String(theme ?? "").trim().toLowerCase() === "dark" ? "dark" : "light";
  writeStorage(THEME_CHOICE_KEY, normalized);
  try {
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // ignore
  }
  cachedSnapshot = null;
  window.dispatchEvent(new Event(UI_EVENT));
}

const COMMON_LANGUAGE_TAGS = Object.freeze({
  arabic: "ar",
  english: "en",
  french: "fr",
  spanish: "es",
  español: "es",
  chinese: "zh",
  hindi: "hi",
  japanese: "ja",
  nihongo: "ja",
  日本語: "ja",
  portuguese: "pt",
  português: "pt",
  portugues: "pt",
  deutsch: "de",
  german: "de",
  russian: "ru",
  rus: "ru",
});

function normalizeLanguageCode(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return FALLBACK_LANGUAGE;
  if (SUPPORTED_LANGUAGES.includes(s)) return s;
  const fromName = COMMON_LANGUAGE_TAGS[s];
  if (fromName && SUPPORTED_LANGUAGES.includes(fromName)) return fromName;
  const primary = s.split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(primary)) return primary;
  return FALLBACK_LANGUAGE;
}

export function getLanguagePreference() {
  const language = readStorage(LANGUAGE_KEY, FALLBACK_LANGUAGE).trim();
  if (language.toLowerCase() === "universal") return "fr";
  return normalizeLanguageCode(language);
}

export function setLanguagePreference(language) {
  const raw = String(language ?? "").trim();
  if (raw.toLowerCase() === "universal") {
    writeStorage(LANGUAGE_KEY, "universal");
  } else {
    writeStorage(LANGUAGE_KEY, normalizeLanguageCode(raw));
  }
  cachedSnapshot = null;
  window.dispatchEvent(new Event(UI_EVENT));
}

/** Son court à chaque nouvelle réponse validée (questionnaire). Activé par défaut. */
export function getQuizTickSoundEnabled() {
  return readStorage(QUIZ_TICK_KEY, FALLBACK_QUIZ_TICK) !== "0";
}

export function setQuizTickSoundEnabled(enabled) {
  writeStorage(QUIZ_TICK_KEY, enabled ? "1" : "0");
  cachedSnapshot = null;
  window.dispatchEvent(new Event(UI_EVENT));
}

export function subscribeUiPreferences(callback) {
  window.addEventListener(UI_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UI_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedSnapshot = null;

export function getUiSnapshot() {
  if (!cachedSnapshot) {
    cachedSnapshot = {
      theme: getThemePreference(),
      language: getLanguagePreference(),
      quizTickSound: getQuizTickSoundEnabled(),
    };
  }
  return cachedSnapshot;
}
