import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Sous Windows, 5173 est souvent dans une plage réservée (Hyper-V / WSL) → EACCES.
// Docker : VITE_BIND_HOST est défini → on garde 5173 (mappé par compose).
const devPort =
  Number(process.env.VITE_DEV_PORT) || (process.env.VITE_BIND_HOST ? 5173 : 3000);

export default defineConfig({
  plugins: [react()],
  esbuild: false,
  server: {
    // Évite qu’un proxy / le navigateur garde d’anciens modules (/src/...) après un git pull.
    headers: { "Cache-Control": "no-store" },
    // Local : 127.0.0.1 évite sous Windows EACCES sur ::1. Docker : VITE_BIND_HOST=0.0.0.0
    host: process.env.VITE_BIND_HOST || "127.0.0.1",
    port: devPort,
    // Docker : port fixe 5173. Local : si 3000 est pris, Vite peut prendre le suivant (strictPort false).
    strictPort: Boolean(process.env.VITE_BIND_HOST),
    // Derrière Caddy / domaine public (Vite 6 refuse les Host inconnus par défaut)
    allowedHosts: true,
    proxy: {
      // API de dev (scripts/dev-api.mjs) sur 8787 — même origine en local sans VITE_API_URL
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    target: "esnext",
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
  },
});
