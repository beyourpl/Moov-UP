/**
 * Vérification i18n complète :
 * - Scopes découverts dans translations.js + clés string à plat (getText).
 * - quiz.questions / quiz.choices (q1–q10).
 * - Libellés Q4 spécialités (specialtyLabels fr/en × toutes les langues UI).
 * - Fichiers JSX sous src/ : texte brut entre >…< (heuristique, hors allowlist).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  TEXTS,
  SUPPORTED_LANGUAGES,
  getText,
  getQuizQuestionText,
  getQuizChoiceText,
} from "../src/data/translations.js";
import { QUESTION_ORDER } from "../src/data/questionOrder.js";
import { specialtyConfig } from "../src/data/specialtyConfig.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "../src");
const _specialtyFr = JSON.parse(
  readFileSync(join(__dirname, "../src/data/specialtyLabels.fr.json"), "utf8"),
);
const _specialtyEn = JSON.parse(
  readFileSync(join(__dirname, "../src/data/specialtyLabels.en.json"), "utf8"),
);

function pickSpecialty(lang, domain, value) {
  const pack = lang === "fr" ? _specialtyFr : _specialtyEn;
  return pack[domain]?.[value];
}

function discoverScopes() {
  const scopes = new Set();
  const roots = ["universal", "fr", "en", ...SUPPORTED_LANGUAGES];
  for (const rootKey of roots) {
    const pack = TEXTS[rootKey];
    if (!pack || typeof pack !== "object") continue;
    for (const [scope, val] of Object.entries(pack)) {
      if (val != null && typeof val === "object" && !Array.isArray(val)) scopes.add(scope);
    }
  }
  return [...scopes].sort();
}

const SCOPES_WITH_DIRECT_STRINGS = discoverScopes();

function directStringKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => typeof obj[k] === "string");
}

function collectKeyUnion(scope) {
  const keys = new Set();
  const buckets = ["universal", "fr", "en", ...SUPPORTED_LANGUAGES];
  for (const b of buckets) {
    const o = TEXTS[b]?.[scope];
    for (const k of directStringKeys(o)) keys.add(k);
  }
  return keys;
}

const SENTINEL = "\0__MISSING__\0";
const issues = [];

for (const lang of SUPPORTED_LANGUAGES) {
  for (const scope of SCOPES_WITH_DIRECT_STRINGS) {
    for (const key of collectKeyUnion(scope)) {
      const v = getText(lang, scope, key, SENTINEL);
      if (v === SENTINEL) {
        issues.push({ kind: "getText", lang, scope, key });
      }
    }
  }

  for (const qid of QUESTION_ORDER) {
    const t = getQuizQuestionText(lang, qid);
    if (!t || !t.title || !t.body) {
      issues.push({ kind: "question", lang, scope: "quiz.questions", key: qid });
    }
    const choiceIds = Object.keys(TEXTS.universal?.quiz?.choices?.[qid] || {});
    for (const cv of choiceIds) {
      const ch = getQuizChoiceText(lang, qid, cv, null);
      if (ch == null || !ch.title || ch.title === "") {
        issues.push({ kind: "choice", lang, scope: `quiz.choices.${qid}`, key: cv });
      }
    }
  }

  for (const [domain, items] of Object.entries(specialtyConfig)) {
    for (const item of items) {
      const ch = pickSpecialty(lang, domain, item.value);
      if (!ch?.title || !ch?.sub) {
        issues.push({ kind: "specialty", lang, scope: `specialty.${domain}`, key: item.value });
      }
    }
  }
}

/** Balayage statique : texte littéral visible dans JSX (>…<). */
const SKIP_FILE_PARTS = [
  "translations.js",
  "specialtyLabels.",
  "specialtyConfig.js",
  "pathwayTrajectory.js",
  "quizPathwaySummary.js",
  "orientationHelpers.js",
  "main.jsx",
];

function walkJsx(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJsx(p, acc);
    else if (name.endsWith(".jsx")) acc.push(p);
  }
  return acc;
}

function scanJsxHardcoded() {
  const findings = [];
  for (const file of walkJsx(srcRoot)) {
    const rel = file.replace(/\\/g, "/");
    if (SKIP_FILE_PARTS.some((s) => rel.includes(s))) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;
      if (
        /t\s*\(|useTranslation|getText\s*\(|getSpecialtyChoiceText|getQuizChoiceText|className=|style=\{\{|aria-\w+=\{|placeholder=\{|title=\{|alt=\{|dangerouslySet|eslint-disable|\/\*|\*\/|TODO|console\.|\{`/i.test(
          line,
        )
      ) {
        return;
      }
      const m = line.match(/>([^<]+)</g);
      if (!m) return;
      for (const chunk of m) {
        const inner = chunk.slice(1, -1).trim();
        if (inner.length < 6) continue;
        if (/^[\d\s./:%+–—-]+$/.test(inner)) continue;
        if (/[&][a-z]+;/i.test(inner)) continue;
        if (/^[A-Z0-9._-]+$/.test(inner)) continue;
        if (/^\(?←\s*Moov/.test(inner)) continue;
        if (inner === "×" || inner === "✓" || inner === "OK") continue;
        if (/[{}]/.test(inner)) continue;
        findings.push({
          kind: "jsx-text",
          lang: "—",
          scope: rel.replace(/.*\/src\//, "src/"),
          key: String(i + 1),
          sample: inner.slice(0, 72),
        });
        break;
      }
    });
  }
  return findings;
}

issues.push(...scanJsxHardcoded());

if (issues.length) {
  console.error(`\n${issues.length} point(s) à traiter :\n`);
  const byKind = new Map();
  for (const row of issues) {
    if (!byKind.has(row.kind)) byKind.set(row.kind, []);
    byKind.get(row.kind).push(row);
  }
  for (const [kind, rows] of [...byKind.entries()].sort()) {
    console.error(`  [${kind}] ${rows.length}`);
    for (const r of rows.slice(0, 35)) {
      const extra = r.sample != null ? `  « ${r.sample} »` : "";
      console.error(`    - ${r.lang}  ${r.scope}  ${r.key}${extra}`);
    }
    if (rows.length > 35) console.error(`    … et ${rows.length - 35} autre(s)`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `i18n: OK — ${SCOPES_WITH_DIRECT_STRINGS.length} scopes, questionnaire, spécialités Q4, scan JSX, ${SUPPORTED_LANGUAGES.length} langues.`,
  );
  console.log(`  Scopes : ${SCOPES_WITH_DIRECT_STRINGS.join(", ")}`);
}
