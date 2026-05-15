import { getSession } from "./authStorage.js";
import { getPartenairesOffer } from "./partenairesSession.js";

/** Messages utilisateur Moov’Coach inclus en offre gratuite (hors Premium B2C). */
export const COACH_FREE_MESSAGE_LIMIT = 8;

/** Analyses CV ou LM « IA » incluses chacune en gratuit (par type). */
export const CV_LM_FREE_ANALYSIS_LIMIT = 3;

function usageStorageKey() {
  const email = getSession()?.email?.toLowerCase()?.trim();
  return email ? `moovup_usage_quota_v1_${email}` : null;
}

function readUsage() {
  const key = usageStorageKey();
  if (!key) return { coach: 0, cv: 0, lm: 0 };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { coach: 0, cv: 0, lm: 0 };
    const j = JSON.parse(raw);
    return {
      coach: Math.max(0, Number(j.coach) || 0),
      cv: Math.max(0, Number(j.cv) || 0),
      lm: Math.max(0, Number(j.lm) || 0),
    };
  } catch {
    return { coach: 0, cv: 0, lm: 0 };
  }
}

function writeUsage(next) {
  const key = usageStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(next));
}

/** Premium B2C (choix d’offre partenaires) = pas de plafond côté app (la monétisation réelle sera côté paiement). */
export function hasPremiumCoachAccess() {
  return getPartenairesOffer()?.offer === "premium_b2c";
}

/**
 * Aligne le compteur coach sur l’historique serveur (évite de redonner des messages si la conv existait déjà).
 * @param {{ role: string }[]} messages
 */
export function syncCoachUsageFromHistory(messages) {
  if (hasPremiumCoachAccess() || !messages?.length) return;
  const userCount = messages.filter((m) => m.role === "user").length;
  const cur = readUsage();
  if (userCount > cur.coach) {
    writeUsage({ ...cur, coach: userCount });
  }
}

export function getCoachQuotaState() {
  if (hasPremiumCoachAccess()) {
    return {
      isUnlimited: true,
      used: 0,
      limit: COACH_FREE_MESSAGE_LIMIT,
      remaining: Infinity,
      blocked: false,
    };
  }
  const { coach } = readUsage();
  const remaining = Math.max(0, COACH_FREE_MESSAGE_LIMIT - coach);
  return {
    isUnlimited: false,
    used: coach,
    limit: COACH_FREE_MESSAGE_LIMIT,
    remaining,
    blocked: coach >= COACH_FREE_MESSAGE_LIMIT,
  };
}

/**
 * Après envoi réussi : le serveur renvoie l’historique complet. On garde le max(compteur local, nombre de messages user)
 * pour éviter les dérives si le compteur n’était pas à jour.
 * @param {{ role: string }[]} updatedHistory
 */
export function reconcileCoachUsageAfterSend(updatedHistory) {
  if (hasPremiumCoachAccess() || !updatedHistory?.length) return;
  const userCount = updatedHistory.filter((m) => m.role === "user").length;
  const cur = readUsage();
  writeUsage({ ...cur, coach: Math.max(cur.coach, userCount) });
}

/** @param {"cv" | "lm"} kind */
export function getCvLmQuotaState(kind) {
  if (hasPremiumCoachAccess()) {
    return {
      isUnlimited: true,
      used: 0,
      limit: CV_LM_FREE_ANALYSIS_LIMIT,
      remaining: Infinity,
      blocked: false,
    };
  }
  const u = readUsage();
  const used = kind === "cv" ? u.cv : u.lm;
  const remaining = Math.max(0, CV_LM_FREE_ANALYSIS_LIMIT - used);
  return {
    isUnlimited: false,
    used,
    limit: CV_LM_FREE_ANALYSIS_LIMIT,
    remaining,
    blocked: used >= CV_LM_FREE_ANALYSIS_LIMIT,
  };
}

/** @param {"cv" | "lm"} kind */
export function recordCvLmAnalysisConsumed(kind) {
  if (hasPremiumCoachAccess()) return;
  const cur = readUsage();
  if (kind === "cv") {
    writeUsage({ ...cur, cv: cur.cv + 1 });
  } else {
    writeUsage({ ...cur, lm: cur.lm + 1 });
  }
}
