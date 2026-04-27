/**
 * Lance l’API de dev (port 8787) et Vite ensemble. Script par défaut du frontend :
 *   npm run dev
 *   npm run dev:all (alias)
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const api = spawn(process.execPath, [path.join(root, "scripts", "dev-api.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

await new Promise((r) => setTimeout(r, 450));

const vite = spawn(
  process.execPath,
  [
    "--preserve-symlinks",
    "--preserve-symlinks-main",
    path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js"),
    "--configLoader",
    "native",
  ],
  {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
    env: { ...process.env },
  }
);

function shutdown(code) {
  try {
    api.kill();
  } catch {
    /* ignore */
  }
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

vite.on("exit", (code) => shutdown(code ?? 0));
api.on("exit", (code) => {
  if (code !== 0 && code != null) {
    console.error("dev-api s’est arrêté avec le code", code);
    try {
      vite.kill();
    } catch {
      /* ignore */
    }
    process.exit(code);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
