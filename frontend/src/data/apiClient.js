// Même origine en prod : https://moovup.site/api/... → Caddy ou Vite proxy → backend (évite CORS + api sous-domaine).
// En dev local : URLs relatives → proxy Vite vers dev-api (8787) ou Docker → backend (VITE_API_PROXY_TARGET).
const TOKEN_KEY = "moovup_token";

function resolveApiBase() {
  const viteUrl = String(import.meta.env.VITE_API_URL || "").trim();
  const isDev = import.meta.env.DEV;
  const domain = String(import.meta.env.VITE_PUBLIC_DOMAIN || "moovup.site").trim() || "moovup.site";

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const onProdSite = hostname === domain || hostname === `www.${domain}`;
    // HTTPS sur le domaine public : toujours /api en relatif (même origine).
    if (protocol === "https:" && onProdSite) return "";
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
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiDelete = (path) => request("DELETE", path);
