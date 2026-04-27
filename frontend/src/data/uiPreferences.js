const THEME_KEY = "moovup_theme";
const LANGUAGE_KEY = "moovup_language";
const QUIZ_TICK_KEY = "moovup_quiz_tick_sound";
const UI_EVENT = "moovup-ui-change";
const FALLBACK_THEME = "dark";
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
  return readStorage(THEME_KEY, FALLBACK_THEME);
}

export function setThemePreference(theme) {
  writeStorage(THEME_KEY, theme);
  cachedSnapshot = null;
  window.dispatchEvent(new Event(UI_EVENT));
}

export function getLanguagePreference() {
  const language = readStorage(LANGUAGE_KEY, FALLBACK_LANGUAGE);
  return language === "universal" ? "fr" : language;
}

export function setLanguagePreference(language) {
  writeStorage(LANGUAGE_KEY, language);
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
