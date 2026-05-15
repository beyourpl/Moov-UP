import { getToken } from "./apiClient.js";

const LEGACY_STORAGE_KEY = "moovup_partenaires_offer_v1";

/** @typedef {"freemium" | "premium_b2c" | "licences_b2b"} PartenairesOfferId */

function decodeJwtEmail(token) {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const pad = part.length % 4 === 0 ? "" : "=".repeat(4 - (part.length % 4));
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const payload = JSON.parse(atob(b64));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    const email = String(payload.email || "").toLowerCase().trim();
    return email || null;
  } catch {
    return null;
  }
}

function offerStorageKey() {
  const email = decodeJwtEmail(getToken());
  return email ? `${LEGACY_STORAGE_KEY}_${email}` : null;
}

/**
 * @returns {{ offer: PartenairesOfferId, chosenAt: string } | null}
 */
export function getPartenairesOffer() {
  const key = offerStorageKey();
  if (!key) return null;
  try {
    let raw = localStorage.getItem(key);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        raw = legacy;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const offer = parsed.offer;
    if (offer !== "freemium" && offer !== "premium_b2c" && offer !== "licences_b2b") return null;
    return { offer, chosenAt: String(parsed.chosenAt || "") };
  } catch {
    return null;
  }
}

/** @param {PartenairesOfferId} offer */
export function setPartenairesOffer(offer) {
  const key = offerStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({ offer, chosenAt: new Date().toISOString() }));
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Efface l’offre pour l’utilisateur actuellement connecté (ex. reset manuel). */
export function clearPartenairesOffer() {
  const key = offerStorageKey();
  try {
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Après connexion : choix d’offre si pas encore fait, hub B2B ou Premium si offre correspondante, sinon écran questionnaire / coach / CV (Freemium). */
export function getPostAuthLandingPath() {
  const o = getPartenairesOffer()?.offer;
  if (!o) return "/partenaires/offres";
  if (o === "licences_b2b") return "/partenaires/tableau-de-bord";
  if (o === "premium_b2c") return "/partenaires/premium";
  return "/choice";
}
