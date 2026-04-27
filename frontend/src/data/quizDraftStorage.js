import { getSession } from "./authStorage.js";

const PREFIX = "moovup_quiz_draft_v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function draftKey() {
  const s = getSession();
  const id = (s?.email || s?.pseudo || "session").trim() || "session";
  return `${PREFIX}_${id}`;
}

export function loadQuizDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (typeof data.savedAt === "number" && Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(draftKey());
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** @param {{ answers: Record<string, string>, stepIndex: number, phase: string }} payload */
export function saveQuizDraft(payload) {
  try {
    localStorage.setItem(
      draftKey(),
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearQuizDraft() {
  try {
    localStorage.removeItem(draftKey());
  } catch {
    /* ignore */
  }
}
