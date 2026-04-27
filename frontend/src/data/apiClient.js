// Module renommé (api.js → apiClient.js) pour éviter un JS « api.js » mis en cache par un proxy ou le navigateur.
// En dev sans VITE_API_URL : URLs relatives → proxy Vite vers dev-api (port 8787).
// Sur https://moovup.site : VITE_API_URL http:// / localhost / IP → on utilise https://api.<domaine>.
const TOKEN_KEY = "moovup_token";

function resolveApiBase() {
  const viteUrl = String(import.meta.env.VITE_API_URL || "").trim();
  const isDev = import.meta.env.DEV;
  const domain = String(import.meta.env.VITE_PUBLIC_DOMAIN || "moovup.site").trim() || "moovup.site";

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const onProdSite = hostname === domain || hostname === `www.${domain}`;
    if (protocol === "https:" && onProdSite) {
      const insecure =
        !viteUrl ||
        viteUrl.startsWith("http://") ||
        viteUrl.includes("localhost") ||
        /http:\/\/[\d.]+/.test(viteUrl);
      if (insecure) return `https://api.${domain}`;
    }
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
        `[MOOVUP-NET] Impossible de joindre l'API (${API_URL || "URL relative"}). ` +
          (mixed
            ? "Page en HTTPS mais API en http:// : utilise une API en https:// (ex. https://api.moovup.site). "
            : "") +
          "Ouvre https://api.moovup.site/api/health dans ce navigateur. Si ça ne charge pas : Caddy ou backend. " +
          "Sinon : sur le VPS, git pull dans le dossier Docker puis docker compose up -d --force-recreate frontend. Cache : Ctrl+Shift+R."
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
