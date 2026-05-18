// Même origine en prod : https://moovup.site/api/... → Caddy ou Vite proxy → backend (évite CORS + api sous-domaine).
// En dev local : URLs relatives → proxy Vite vers dev-api (8787) ou Docker → backend (VITE_API_PROXY_TARGET).
const TOKEN_KEY = "moovup_token";

function resolveApiBase() {
  const viteUrl = String(import.meta.env.VITE_API_URL || "").trim();
  const isDev = import.meta.env.DEV;
  const domain = String(import.meta.env.VITE_PUBLIC_DOMAIN || "moovup.site").trim() || "moovup.site";

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const onProdSite = hostname === domain || hostname === `www.${domain}`;
    // Domaine public (HTTP ou HTTPS) : toujours chemins relatifs /api… — Caddy ou le proxy Vite.
    if (onProdSite) return "";
  }

  if (isDev && !viteUrl) return "";
  return viteUrl || (isDev ? "" : "http://localhost:8000");
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

/** FastAPI renvoie souvent `detail` en string, tableau ou objet — évite un message vide côté UI. */
export function formatApiErrorDetail(detail, fallback = "") {
  if (detail == null || detail === "") return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
          const msg = item.msg || item.message || "";
          return loc && msg ? `${loc}: ${msg}` : msg || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean);
    return parts.join(" · ") || fallback;
  }
  if (typeof detail === "object") {
    const msg = detail.msg || detail.message;
    if (msg) return String(msg);
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  return String(detail) || fallback;
}

/** Messages API génériques (404) à remplacer par un libellé UI localisé. */
export function isConversationNotFoundMessage(message) {
  const m = String(message || "").trim().toLowerCase();
  return (
    m === "not found" ||
    m === "conversation not found" ||
    m.includes("conversation introuvable") ||
    m.includes("conversation not found")
  );
}

export function humanizeApiErrorMessage(message, fallback) {
  if (isConversationNotFoundMessage(message)) return fallback;
  const m = String(message || "").trim();
  return m || fallback;
}

async function request(method, path, body) {
  const API_URL = resolveApiBase();
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e instanceof TypeError) {
      const pageHttps =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const apiHttp = API_URL.startsWith("http://");
      const mixed = pageHttps && apiHttp;
      throw new Error(
        `[MOOVUP-NET-v3] Impossible de joindre l'API (${API_URL || "même origine /api"}). ` +
          (mixed
            ? "Mélange HTTPS / HTTP : vérifie la config. "
            : "") +
          "Teste https://moovup.site/api/health (Caddy doit envoyer /api vers le port 8000). Voir deploy/Caddyfile.example. " +
          "Sinon git pull + docker compose up -d --force-recreate frontend. Cache : Ctrl+Shift+R."
      );
    }
    throw e;
  }

  if (res.status === 401) {
    setToken(null);
    if (window.location.pathname !== "/auth") {
      window.location.href = "/auth";
    }
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = res.statusText;
    }
    const fallback =
      res.status === 503
        ? "Service temporairement indisponible"
        : res.status >= 500
          ? `Erreur serveur (${res.status})`
          : res.statusText || "Erreur";
    throw new Error(formatApiErrorDetail(detail, fallback));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiDelete = (path) => request("DELETE", path);
