import { apiDelete, apiGet, apiPost, getToken, setToken } from "./apiClient.js";

const PROFILE_PREFIX = "moovup_profile_v1_";

function profileKey(email) {
  return `${PROFILE_PREFIX}${String(email || "").toLowerCase()}`;
}

function readProfile(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(profileKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function b64UrlToUtf8(segment) {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

function decodeJwt(token) {
  try {
    const payload = JSON.parse(b64UrlToUtf8(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { id: payload.user_id, email: payload.email, exp: payload.exp };
  } catch { return null; }
}

export function isAuthenticated() {
  const t = getToken();
  return !!t && !!decodeJwt(t);
}

export function getSession() {
  const t = getToken();
  if (!t) return null;
  const d = decodeJwt(t);
  if (!d) return null;
  const profile = readProfile(d.email);
  const pretty =
    profile?.pseudo ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    d.email.split("@")[0];
  return { id: d.id, email: d.email, pseudo: pretty, profile: profile || null };
}

export async function registerUser(email, password) {
  const { token, user } = await apiPost("/api/auth/register", { email, password });
  setToken(token);
  return user;
}

export async function loginUser(email, password) {
  const { token, user } = await apiPost("/api/auth/login", { email, password });
  setToken(token);
  return user;
}

export function logoutUser() {
  setToken(null);
}

export function getAccountProfile(email) {
  return readProfile(email);
}

export function saveAccountProfile(email, data) {
  if (!email || !data || typeof data !== "object") return;
  const next = {
    firstName: String(data.firstName || "").trim(),
    lastName: String(data.lastName || "").trim(),
    pseudo: String(data.pseudo || "").trim(),
    age: String(data.age || "").trim(),
    city: String(data.city || "").trim(),
  };
  localStorage.setItem(profileKey(email), JSON.stringify(next));
}

export function clearAccountProfile(email) {
  if (!email) return;
  try {
    localStorage.removeItem(profileKey(email));
  } catch {
    /* ignore */
  }
}

export async function deleteMyAccount() {
  await apiDelete("/api/auth/me");
}

export async function refreshSession() {
  try { return await apiGet("/api/auth/me"); }
  catch { return null; }
}
