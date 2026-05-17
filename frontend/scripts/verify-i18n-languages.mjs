/**
 * Vérifie les 10 langues UI : clés critiques + repli anglais/français sur tout le site.
 */
import { TEXTS, SUPPORTED_LANGUAGES, getText } from "../src/data/translations.js";
import { buildPartenairesOfferUi } from "../src/data/partenairesOfferUi.js";

const SENTINEL = "\0__MISSING__\0";
const FRENCH_MARKERS =
  /^(Retour|Clair|Sombre|Accueil|Se déconnecter|Gratuit|Choisir|Accès au |Réservé aux |Durée : |Métiers recommandés|Refaire le quiz)/i;
const EN_MARKERS =
  /^(Back|Loading|Choose|View my pathway|Share my pathway|Sign in|Organizations|Youth|Go back|Definition$|Question \d)/i;

const CRITICAL_KEYS = [
  ["common", "back"],
  ["common", "clear"],
  ["common", "dark"],
  ["common", "logout"],
  ["common", "home"],
  ["common", "language"],
  ["coach", "title"],
  ["coach", "heroLead"],
  ["coach", "retakeQuiz"],
  ["coach", "home"],
  ["coach", "viewMyPath"],
  ["coach", "sharePath"],
  ["coach", "asideJobsTitle"],
  ["coach", "formationsShowMore"],
  ["coach", "formationDurationPrefix"],
  ["coach", "askFormationCoachShort"],
  ["partenaires", "offerFreemiumPrice"],
  ["partenaires", "offerPremiumBadge"],
  ["partenaires", "offerChoose"],
  ["pathwaySummary", "title"],
  ["pathwaySummary", "chipActivity"],
  ["choice", "title"],
  ["quizMeta", "intro"],
  ["quizMeta", "step"],
];

function discoverScopes() {
  const scopes = new Set();
  for (const rootKey of ["universal", "fr", "en", ...SUPPORTED_LANGUAGES]) {
    const pack = TEXTS[rootKey];
    if (!pack || typeof pack !== "object") continue;
    for (const [scope, val] of Object.entries(pack)) {
      if (val != null && typeof val === "object" && !Array.isArray(val)) scopes.add(scope);
    }
  }
  return [...scopes].sort();
}

function directStringKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => typeof obj[k] === "string");
}

function collectKeyUnion(scope) {
  const keys = new Set();
  for (const b of ["universal", "fr", "en", ...SUPPORTED_LANGUAGES]) {
    const o = TEXTS[b]?.[scope];
    for (const k of directStringKeys(o)) keys.add(k);
  }
  return keys;
}

function hasLocalKey(lang, scope, key) {
  if (TEXTS[lang]?.[scope]?.[key] !== undefined) return true;
  if (scope === "quiz" && TEXTS[lang]?.quizMeta?.[key] !== undefined) return true;
  return false;
}

function universalFr(scope, key) {
  return TEXTS.universal?.[scope]?.[key];
}

function isFrenchLeak(lang, scope, key, value) {
  if (lang === "fr" || value == null || value === "") return false;
  const uni = universalFr(scope, key);
  if (uni == null || uni === "") return false;
  if (value !== uni) return false;
  const en = TEXTS.en?.[scope]?.[key];
  if (en != null && en !== "" && en !== uni) return true;
  return FRENCH_MARKERS.test(String(value).trim());
}

function isEnglishLeak(lang, scope, key, value) {
  if (lang === "en" || lang === "fr" || value == null || value === "") return false;
  const en = getText("en", scope, key, SENTINEL);
  if (en === SENTINEL || value !== en) return false;
  if (hasLocalKey(lang, scope, key)) return false;
  return EN_MARKERS.test(String(value).trim()) || value === en;
}

const issues = [];
const report = [];
const SCOPES = discoverScopes();

for (const lang of SUPPORTED_LANGUAGES) {
  const row = { lang, missing: [], frenchLeak: [], englishLeak: [], offerUi: null };
  for (const [scope, key] of CRITICAL_KEYS) {
    const v = getText(lang, scope, key, SENTINEL);
    if (v === SENTINEL) {
      row.missing.push(`${scope}.${key}`);
      issues.push({ kind: "missing", lang, scope, key });
    } else if (isFrenchLeak(lang, scope, key, v)) {
      row.frenchLeak.push({ key: `${scope}.${key}`, value: v.slice(0, 48) });
      issues.push({ kind: "frenchLeak", lang, scope, key, value: v });
    } else if (isEnglishLeak(lang, scope, key, v)) {
      row.englishLeak.push({ key: `${scope}.${key}`, value: v.slice(0, 48) });
      issues.push({ kind: "englishLeak", lang, scope, key, value: v });
    }
  }

  for (const scope of SCOPES) {
    for (const key of collectKeyUnion(scope)) {
      const v = getText(lang, scope, key, SENTINEL);
      if (v === SENTINEL) {
        issues.push({ kind: "missingFull", lang, scope, key });
      } else if (isFrenchLeak(lang, scope, key, v)) {
        issues.push({ kind: "frenchLeakFull", lang, scope, key, value: v });
      } else if (isEnglishLeak(lang, scope, key, v)) {
        issues.push({ kind: "englishLeakFull", lang, scope, key, value: v });
      }
    }
  }

  const t = (scope, key, fb) => getText(lang, scope, key, fb);
  const ui = buildPartenairesOfferUi(t);
  row.offerUi = {
    price: ui.freemiumPrice,
    badge: ui.premiumBadge,
    choose: ui.choose,
  };
  if (lang !== "fr" && FRENCH_MARKERS.test(ui.freemiumPrice)) {
    issues.push({ kind: "offerUiFr", lang, field: "freemiumPrice", value: ui.freemiumPrice });
  }
  report.push(row);
}

console.log("\n=== Moov'Up — vérification i18n (10 langues) ===\n");
for (const row of report) {
  const enCount = issues.filter((i) => i.lang === row.lang && i.kind.includes("english")).length;
  const frCount = issues.filter((i) => i.lang === row.lang && i.kind.includes("french")).length;
  const missCount = issues.filter((i) => i.lang === row.lang && i.kind.includes("missing")).length;
  const ok = enCount === 0 && frCount === 0 && missCount === 0;
  const status = ok ? "OK" : "PROBLÈME";
  console.log(`[${status}] ${row.lang}`);
  console.log(`  Offres: ${row.offerUi.price} | ${row.offerUi.badge} | ${row.offerUi.choose}`);
  if (row.missing.length) console.log(`  Manquant (critique): ${row.missing.join(", ")}`);
  if (row.englishLeak.length) {
    for (const f of row.englishLeak.slice(0, 8)) console.log(`  Repli EN: ${f.key} → « ${f.value} »`);
    if (row.englishLeak.length > 8) console.log(`  … +${row.englishLeak.length - 8} repli(s) EN`);
  }
  if (row.frenchLeak.length) {
    for (const f of row.frenchLeak) console.log(`  Repli FR: ${f.key} → « ${f.value} »`);
  }
  if (!ok && !row.missing.length && !row.englishLeak.length && !row.frenchLeak.length) {
    console.log(`  Site entier: ${enCount} repli EN, ${frCount} repli FR, ${missCount} manquant(s)`);
  }
}

console.log("\n--- Échantillon barre / coach ---");
for (const lang of SUPPORTED_LANGUAGES) {
  const back = getText(lang, "common", "back", "?");
  const coach = getText(lang, "coach", "retakeQuiz", "?");
  const path = getText(lang, "pathwaySummary", "title", "?");
  console.log(`  ${lang}: ← ${back} | ${coach} | ${path}`);
}

const summary = {
  english: issues.filter((i) => i.kind.includes("english")).length,
  french: issues.filter((i) => i.kind.includes("french")).length,
  missing: issues.filter((i) => i.kind.includes("missing")).length,
};
console.log(`\nTotal: ${summary.english} repli EN, ${summary.french} repli FR, ${summary.missing} manquant(s)`);

if (issues.length) {
  console.error(`\n${issues.length} problème(s) détecté(s).`);
  process.exitCode = 1;
} else {
  console.log("\nToutes les langues passent les vérifications.");
}
