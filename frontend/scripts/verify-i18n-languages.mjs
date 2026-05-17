/**
 * Vérifie les 10 langues UI : clés critiques, pas de repli français (universal) hors FR.
 */
import { TEXTS, SUPPORTED_LANGUAGES, getText } from "../src/data/translations.js";
import { buildPartenairesOfferUi } from "../src/data/partenairesOfferUi.js";

const SENTINEL = "\0__MISSING__\0";
const FRENCH_MARKERS = /^(Retour|Clair|Sombre|Accueil|Se déconnecter|Gratuit|Choisir|Accès au |Réservé aux |Durée : |Métiers recommandés|Refaire le quiz)/i;

/** Clés utilisées sur Moov'Coach, offres, barre commune */
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
  ["coach", "asideJobsTitle"],
  ["coach", "formationsShowMore"],
  ["coach", "formationDurationPrefix"],
  ["coach", "askFormationCoachShort"],
  ["partenaires", "offerFreemiumPrice"],
  ["partenaires", "offerPremiumBadge"],
  ["partenaires", "offerChoose"],
  ["pathwaySummary", "chipActivity"],
  ["choice", "title"],
];

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

const issues = [];
const report = [];

for (const lang of SUPPORTED_LANGUAGES) {
  const row = { lang, missing: [], frenchLeak: [], offerUi: null };
  for (const [scope, key] of CRITICAL_KEYS) {
    const v = getText(lang, scope, key, SENTINEL);
    if (v === SENTINEL) {
      row.missing.push(`${scope}.${key}`);
      issues.push({ kind: "missing", lang, scope, key });
    } else if (isFrenchLeak(lang, scope, key, v)) {
      row.frenchLeak.push({ key: `${scope}.${key}`, value: v.slice(0, 48) });
      issues.push({ kind: "frenchLeak", lang, scope, key, value: v });
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
  const ok = row.missing.length === 0 && row.frenchLeak.length === 0;
  const status = ok ? "OK" : "PROBLÈME";
  console.log(`[${status}] ${row.lang}`);
  console.log(`  Offres: ${row.offerUi.price} | ${row.offerUi.badge} | ${row.offerUi.choose}`);
  if (row.missing.length) console.log(`  Manquant: ${row.missing.join(", ")}`);
  if (row.frenchLeak.length) {
    for (const f of row.frenchLeak) console.log(`  Repli FR: ${f.key} → « ${f.value} »`);
  }
}

console.log("\n--- Échantillon barre / coach ---");
for (const lang of SUPPORTED_LANGUAGES) {
  const back = getText(lang, "common", "back", "?");
  const coach = getText(lang, "coach", "retakeQuiz", "?");
  console.log(`  ${lang}: ← ${back} | ${coach}`);
}

const rtlLangs = SUPPORTED_LANGUAGES.filter((l) => l === "ar");
console.log(`\nRTL (dir=ar): ${rtlLangs.join(", ") || "aucun"}`);

if (issues.length) {
  console.error(`\n${issues.length} problème(s) détecté(s).`);
  process.exitCode = 1;
} else {
  console.log("\nToutes les langues passent les vérifications critiques.");
}
