/**
 * Vérifie que backend/.env contient bien OPENROUTER_API_KEY (+ optionnel LLM_MODEL)
 * pour que dev-api.mjs (Moov'Coach) en mode npm run dev appelle réellement le LLM.
 * N'affiche jamais la clé.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, "backend", ".env");

function parseEnvHints(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (key !== "OPENROUTER_API_KEY" && key !== "LLM_MODEL") continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

try {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const hints = parseEnvHints(raw);
  const key =
    String(process.env.OPENROUTER_API_KEY || hints.OPENROUTER_API_KEY || "").trim();
  const model = String(process.env.LLM_MODEL || hints.LLM_MODEL || "").trim();

  if (!key || key === "missing" || key === "sk-or-replace-me") {
    console.error(
      "[check-llm] OPENROUTER_API_KEY manquant ou valeur placeholder dans backend/.env",
    );
    process.exit(1);
  }

  console.log(`[check-llm] OpenRouter configuré (${key.slice(0, 8)}…) — modèle: ${model || "(défaut dev-api: google/gemini-3-flash-preview)"}`);
  console.log("[check-llm] OK — relance « npm run dev » dans frontend pour charger dev-api avec le LLM.");
  process.exit(0);
} catch (e) {
  console.error("[check-llm] Impossible de lire backend/.env :", e.message);
  process.exit(1);
}
