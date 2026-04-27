import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: false,
  server: {
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
