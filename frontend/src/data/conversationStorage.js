const KEY = "moovup_last_conversation_id";

export function setLastConversationId(id) {
  try {
    if (id == null || Number.isNaN(Number(id))) return;
    localStorage.setItem(KEY, String(id));
  } catch {
    /* ignore */
  }
}

export function getLastConversationId() {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function clearLastConversationId() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
