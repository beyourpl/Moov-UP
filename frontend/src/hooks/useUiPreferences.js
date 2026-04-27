import { useSyncExternalStore } from "react";
import { getUiSnapshot, subscribeUiPreferences } from "../data/uiPreferences.js";

export function useUiPreferences() {
  return useSyncExternalStore(subscribeUiPreferences, getUiSnapshot, getUiSnapshot);
}
