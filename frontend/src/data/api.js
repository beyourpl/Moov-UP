// En dev sans VITE_API_URL : URLs relatives → proxy Vite vers dev-api (port 8787).
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "" : "http://localhost:8000");
const TOKEN_KEY = "moovup_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
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
      throw new Error(
        `Impossible de joindre l'API. ` +
          "En local : dans frontend, lance « npm run dev:all » (API + Vite), ou « npm run dev:api » dans un terminal et « npm run dev » dans l'autre. " +
          "Avec Docker : « docker compose up » (port 8000) et éventuellement VITE_API_URL=http://localhost:8000."
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
    try { detail = (await res.json()).detail; } catch { detail = res.statusText; }
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiDelete = (path) => request("DELETE", path);
