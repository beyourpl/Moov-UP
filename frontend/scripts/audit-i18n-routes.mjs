/**
 * Audit i18n par route × langue (clés critiques partenaires + landing nav).
 */
import { TEXTS, SUPPORTED_LANGUAGES, getText } from "../src/data/translations.js";

const ROUTES = [
  { path: "/", scopes: [["landing", "navPartenaires"], ["landing", "navCoFounders"]] },
  { path: "/auth", scopes: [["auth", "login"], ["common", "brandMissionTitle"]] },
  { path: "/partenaires", scopes: [["partenaires", "navSegmentStructures"], ["partenaires", "title"]] },
  { path: "/partenaires/connexion", scopes: [["partenaires", "authTitle"], ["partenaires", "navSegmentJeunes"]] },
  { path: "/partenaires/offres", scopes: [["partenaires", "offersTitle"], ["partenaires", "offerChoose"]] },
  { path: "/choice", scopes: [["choice", "title"]] },
  { path: "/demo", scopes: [["quiz", "title"], ["quizMeta", "questionLabel"]] },
  { path: "/cvlm", scopes: [["cvlm", "title"]] },
];

const EN_MARKERS = /^(Organizations|Youth|Local missions|Partner area|Sign in|Choose|View plans|Back to)/;

let issues = 0;
console.log("\nAudit i18n par route (10 langues)\n");
for (const route of ROUTES) {
  console.log(`## ${route.path}`);
  for (const lang of SUPPORTED_LANGUAGES) {
    const bad = [];
    for (const [scope, key] of route.scopes) {
      const v = getText(lang, scope, key, "⟪MISSING⟫");
      if (v === "⟪MISSING⟫") bad.push(`${scope}.${key}`);
      else if (lang !== "en" && EN_MARKERS.test(v)) bad.push(`${scope}.${key}="${v}"`);
    }
    if (bad.length) {
      issues += bad.length;
      console.log(`  ${lang}: ${bad.join(", ")}`);
    }
  }
}
console.log(issues ? `\n${issues} point(s) à corriger.\n` : "\nOK — aucun repli anglais évident sur les clés testées.\n");
process.exitCode = issues ? 1 : 0;
