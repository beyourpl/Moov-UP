import { useSyncExternalStore } from "react";
import { getUiSnapshot, subscribeUiPreferences } from "../data/uiPreferences.js";
import { getText } from "../data/translations.js";

function subscribeToLanguage(callback) {
  return subscribeUiPreferences(callback);
}

export function useTranslation() {
  const { language } = useSyncExternalStore(subscribeToLanguage, getUiSnapshot, getUiSnapshot);
  
  const t = (scope, key, fallback) => getText(language, scope, key, fallback);
  
  return { language, t };
}