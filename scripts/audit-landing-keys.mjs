/**
 * Liste les clés landing présentes dans en.landing vs chaque langue.
 * Usage : node scripts/audit-landing-keys.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../frontend/src/data/translations.js");
const s = fs.readFileSync(file, "utf8");

const LANGS = ["fr", "en", "es", "zh", "hi", "ar", "pt", "ru", "de", "ja"];

function landingSlice(lang) {
  const open = `  ${lang}: {\n`;
  const i = s.indexOf(open);
  if (i === -1) return null;
  const l = s.indexOf("    landing: {", i);
  if (l === -1) return null;
  const endMarker = "\n    },\n    auth:";
  const e = s.indexOf(endMarker, l);
  if (e === -1) return null;
  return s.slice(l, e);
}

function keysFromLandingBody(body) {
  const set = new Set();
  if (!body) return set;
  const re = /^      ([A-Za-z0-9_]+):/gm;
  let m;
  while ((m = re.exec(body)) !== null) set.add(m[1]);
  return set;
}

function keysFromLandingSlice(lang) {
  return keysFromLandingBody(landingSlice(lang));
}

const enKeys = keysFromLandingSlice("en");
console.log(`Référence en.landing : ${enKeys.size} clés\n`);

for (const lang of LANGS) {
  const slice = landingSlice(lang);
  if (!slice) {
    console.log(`${lang}: pas de bloc landing trouvé`);
    continue;
  }
  const k = keysFromLandingBody(slice);
  const missing = [...enKeys].filter((x) => !k.has(x)).sort();
  const extra = [...k].filter((x) => !enKeys.has(x)).sort();
  console.log(`--- ${lang} (${k.size} clés) ---`);
  if (missing.length) console.log(`  Manquantes vs en (${missing.length}): ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "…" : ""}`);
  else console.log("  Toutes les clés en.landing sont présentes.");
  if (extra.length) console.log(`  Clés non présentes dans en (${extra.length}): ${extra.slice(0, 8).join(", ")}${extra.length > 8 ? "…" : ""}`);
  console.log("");
}

console.log(
  "getText : fr utilise fr.landing puis universal.landing puis le fallback JSX ; les autres langues utilisent leur landing puis en puis le fallback JSX.",
);
console.log(
  "getQuizQuestionText / getQuizChoiceText : même idée (universal seulement pour fr, sinon repli en).",
);
