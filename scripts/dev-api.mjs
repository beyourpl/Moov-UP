/**
 * API Moov'Up pour développement local (sans Docker).
 * Auth + conversations en mémoire.
 *
 * Chat (POST /api/chat) :
 * — Si OPENROUTER_API_KEY est définie (variable d'environnement ou backend/.env), appel réel au LLM
 *   (prompt aligné avec le backend Python : profil + historique + métiers du parcours + question).
 * — Sinon réponse générique + rappel de configurer la clé dans backend/.env
 *
 * Usage (depuis la racine tempo) :
 *   node scripts/dev-api.mjs
 * Puis : cd frontend && npm run dev (API + Vite), ou npm run dev:vite si l’API tourne déjà.
 *
 * JWT_SECRET : lit backend/.env si présent, sinon "dev-secret-not-for-prod" (comme config Python).
 */

import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Port par défaut 8787 (évite souvent les plages réservées Windows sur 8000). Surcharge : PORT=8000 */
const PORT = Number(process.env.PORT || 8787);
const Q1_OK = new Set([
  "tech", "business", "creative", "sante", "education", "droit",
  "industrie", "batiment", "agriculture", "service",
]);
const Q3_OK = new Set(["college", "seconde", "terminale", "bac", "bac2", "bac3", "bac5"]);
const Q3_TO_NIVEAU = {
  college: 4, seconde: 4, terminale: 4, bac: 5, bac2: 5, bac3: 6, bac5: 7,
};

function loadJwtSecret() {
  const envPath = path.join(ROOT, "backend", ".env");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const m = raw.match(/^\s*JWT_SECRET\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* ignore */
  }
  return process.env.JWT_SECRET || "dev-secret-not-for-prod";
}

const JWT_SECRET = loadJwtSecret();

function loadBackendEnvHintKeys() {
  const envPath = path.join(ROOT, "backend", ".env");
  const out = {};
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
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
  } catch {
    /* ignore */
  }
  return out;
}

const backendEnvHints = loadBackendEnvHintKeys();
const OPENROUTER_API_KEY = String(
  process.env.OPENROUTER_API_KEY || backendEnvHints.OPENROUTER_API_KEY || "",
).trim();
const LLM_MODEL = String(
  process.env.LLM_MODEL || backendEnvHints.LLM_MODEL || "google/gemini-3-flash-preview",
).trim();
const HAS_LLM_KEY = OPENROUTER_API_KEY.length > 0 && OPENROUTER_API_KEY !== "missing";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function makeToken(userId, email) {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  return signJwt({ user_id: userId, email, exp, typ: "access" });
}

function make2faPendingToken(userId, email) {
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  return signJwt({ user_id: userId, email, exp, typ: "2fa_pending" });
}

const TOTP_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += TOTP_BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += TOTP_BASE32[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(s) {
  const map = Object.fromEntries([...TOTP_BASE32].map((c, i) => [c, i]));
  let bits = 0;
  let value = 0;
  const output = [];
  const upper = String(s).toUpperCase().replace(/\s/g, "");
  for (const c of upper) {
    if (map[c] === undefined) continue;
    value = (value << 5) | map[c];
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpCodeAt(secretB32, counter) {
  const key = base32Decode(secretB32);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, "0");
}

function totpVerify(secretB32, code, window = 1) {
  const clean = String(code || "").replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(clean)) return false;
  const t = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (totpCodeAt(secretB32, t + w) === clean) return true;
  }
  return false;
}

function randomTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function totpProvisioningUri(secret, email, issuer = "Moov'Up") {
  const encIssuer = encodeURIComponent(issuer);
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}`;
}

function validatePassword(p) {
  if (p.length < 10) return "Le mot de passe doit faire au moins 10 caractères.";
  if (!/\d/.test(p)) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!/[^a-zA-Z0-9\s]/.test(p)) return "Le mot de passe doit contenir au moins un symbole.";
  return null;
}

const Q1_DOMAIN_FR = {
  tech: "le numérique et l’informatique",
  business: "le commerce, la gestion et la finance",
  creative: "la création, le design et la communication",
  sante: "la santé et le social",
  education: "l’éducation et la formation",
  droit: "le droit et la justice",
  industrie: "l’industrie et l’ingénierie",
  batiment: "le bâtiment et les travaux publics",
  agriculture: "l’agriculture et l’environnement",
  service: "les services, le tourisme et la logistique",
};

const Q3_LEVEL_FR = {
  college: "collège",
  seconde: "seconde",
  terminale: "terminale",
  bac: "baccalauréat obtenu",
  bac2: "bac + 2",
  bac3: "bac + 3",
  bac5: "bac + 5",
};

/** Deux pistes métiers crédibles par domaine (textes stables pour l’API locale). */
const Q1_METIER_PAIRS = {
  tech: [
    {
      libelle: "Développeur / développeuse d’applications",
      niveau_min: "Bac ou équivalent",
      description:
        "Conception, maintenance et évolution de logiciels ou services numériques. Parcours souvent Bac+3 (BUT, licence) puis spécialisation ou alternance.",
    },
    {
      libelle: "Chef de projet digital",
      niveau_min: "Bac+3",
      description:
        "Pilotage de produits ou de projets numériques, lien entre équipes techniques et métiers. Formations longues ou passerelles après expérience.",
    },
  ],
  business: [
    {
      libelle: "Responsable marketing",
      niveau_min: "Bac ou équivalent",
      description:
        "Stratégie de marque, campagnes et analyse des besoins clients. Parcours possibles : école de commerce, licence pro, bachelor, alternance.",
    },
    {
      libelle: "Gestionnaire de paie / RH",
      niveau_min: "Bac+2",
      description:
        "Administration du personnel, réglementation sociale, outils SIRH. BTS ou licence RH, puis spécialisation ou certification.",
    },
  ],
  creative: [
    {
      libelle: "Designer graphique / UX",
      niveau_min: "Bac ou équivalent",
      description:
        "Identité visuelle, interfaces, supports print et numérique. Écoles d’art, DNA, BUT MMI ou licences arts selon le projet.",
    },
    {
      libelle: "Monteur / monteuse ou motion designer",
      niveau_min: "Bac+2",
      description:
        "Post-production, narration visuelle, contenus courts. BTS audiovisuel, écoles spécialisées, portfolios valorisés à l’embauche.",
    },
  ],
  sante: [
    {
      libelle: "Infirmier / infirmière",
      niveau_min: "Bac ou équivalent",
      description:
        "Soins, prévention et accompagnement des patients. IFSI après concours ; poursuites possibles en cadre de santé ou spécialisations.",
    },
    {
      libelle: "Aide-soignant / aide-soignante",
      niveau_min: "CAP ou équivalent",
      description:
        "Soins de confort et aide à la personne en structure ou à domicile. Diplôme d’État puis évolution vers des fonctions à responsabilité croissante.",
    },
  ],
  education: [
    {
      libelle: "Enseignant / enseignante",
      niveau_min: "Master",
      description:
        "Transmission des savoirs au collège ou lycée. Master MEEF ou concours ; parcours long et encadré.",
    },
    {
      libelle: "Animateur / animatrice socioculturel",
      niveau_min: "Bac+2",
      description:
        "Animation de publics, médiation, projets éducatifs. BAPA, BPJEPS ou licences pro selon le milieu d’intervention.",
    },
  ],
  droit: [
    {
      libelle: "Juriste en entreprise",
      niveau_min: "Bac+3",
      description:
        "Conseil contractuel, conformité, droit du travail ou des affaires. Licence droit puis Master ou école ; stages décisifs.",
    },
    {
      libelle: "Clerc de notaire / collaborateur juridique",
      niveau_min: "Bac+2",
      description:
        "Rédaction d’actes, relation clients, formalités. BTS notariat ou licence puis spécialisation en office.",
    },
  ],
  industrie: [
    {
      libelle: "Ingénieur / ingénieure procédés",
      niveau_min: "Bac+5",
      description:
        "Conception et optimisation de chaînes de production, sécurité et qualité. École d’ingénieurs ou master spécialisé.",
    },
    {
      libelle: "Technicien / technicienne de maintenance",
      niveau_min: "Bac ou équivalent",
      description:
        "Entretien d’installations industrielles, diagnostic et réparation. BTS maintenance, licences pro ou apprentissage en entreprise.",
    },
  ],
  batiment: [
    {
      libelle: "Conducteur / conductrice de travaux",
      niveau_min: "Bac+2",
      description:
        "Planification, coordination des corps de métier et respect des délais sur chantier. BTS BTP puis ingénierie ou expérience terrain.",
    },
    {
      libelle: "Dessinateur / dessinatrice projeteur",
      niveau_min: "Bac ou équivalent",
      description:
        "Plans, modélisation et aide à la conception. BTS bâtiment, DUT génie civil ou écoles d’architecture intérieure selon le profil.",
    },
  ],
  agriculture: [
    {
      libelle: "Technico-commercial / technico-commerciale agricole",
      niveau_min: "Bac+2",
      description:
        "Conseil auprès des exploitants, produits et matériels. BTS agricole ou commerce ; mobilité régionale fréquente.",
    },
    {
      libelle: "Technicien / technicienne de l’environnement",
      niveau_min: "Bac ou équivalent",
      description:
        "Études d’impact, gestion des déchets ou biodiversité. DUT/BUT sciences ou licences pro environnement.",
    },
  ],
  service: [
    {
      libelle: "Responsable d’hébergement touristique",
      niveau_min: "Bac ou équivalent",
      description:
        "Accueil, qualité de service et gestion d’établissement. BTS tourisme, licences hôtelières ou écoles spécialisées.",
    },
    {
      libelle: "Chargé / chargée de logistique",
      niveau_min: "Bac+2",
      description:
        "Flux, stocks et transport. BTS transport et logistique, licences pro supply chain, évolution vers management d’équipe.",
    },
  ],
};

function fakeRecommendations(q1) {
  const pair = Q1_METIER_PAIRS[q1] || Q1_METIER_PAIRS.tech;
  const [a, b] = pair;
  return [
    {
      score: 0.91,
      metier: {
        libelle: a.libelle,
        niveau_min: a.niveau_min,
        description: a.description,
        lien_onisep: "https://www.onisep.fr",
      },
      formations: [
        {
          libelle: "BUT ou licence professionnelle (exemple de parcours)",
          niveau_label: "Bac+3",
          duree: "3 ans",
          lien: "https://www.onisep.fr",
        },
      ],
    },
    {
      score: 0.86,
      metier: {
        libelle: b.libelle,
        niveau_min: b.niveau_min,
        description: b.description,
        lien_onisep: "https://www.onisep.fr",
      },
      formations: [],
    },
  ];
}

function buildProfileTextForConversation(qa) {
  const q1 = qa.q1;
  const q3 = qa.q3;
  const domain = Q1_DOMAIN_FR[q1] || "ton domaine d’intérêt";
  const level = Q3_LEVEL_FR[q3] || q3;
  return `Profil analysé : tu t’intéresses à ${domain} et tu es au niveau « ${level} ». Ce résumé reprend tes réponses au questionnaire pour orienter Moov’Coach et les suggestions de formations.`;
}

/** Alignée sur backend/src/metier/prompt.py + obligation de répondre au fond (pas seulement renvoyer à l’UI). */
const DEV_COACH_SYSTEM = `Tu es Moov'Coach, expert francophone en orientation scolaire en France.
Ton public : des lyceens et etudiants. Ton ton : clair, direct, chaleureux, jamais condescendant.

# Reponses obligatoires
Tu DOIS repondre directement au fond de la question (salaires indicatifs, debouches, durees, formations, prerequis…) dans le corps de ton message.
INTERDIT de te limiter a inviter l'eleve a ouvrir la colonne de gauche ou les fiches ONISEP sans aucune valeur utile dedans — donne synthese, fourchette ou exemples, puis tu peux rappeler en une courte phrase que la fiche officielle precise les details et debouches sur le marché du travail.
Pour un salaire : donne une fourchette brute annuelle indicative en France métropolitaine (jeune diplomé / expérience moyenne / senior selon pertinence) et precise que ca varie secteur region entreprise convention ; utilise la mention "(estimation hors ou completee hors fiche ONISEP si necessaire)" si tu t'appuies sur tes connaissances generales.

# Regles de continuite (IMPORTANT)
Tu recois une section "Historique recent" (quelques derniers echanges).
AVANT de repondre, identifie deux choses :
1. Le SUJET en cours. Si la question actuelle est une reference implicite ("le salaire",
   "et la duree ?", "il faut quelle ecole ?", "et en alternance ?"), remonte l'historique
   et trouve le metier ou la formation dont parlait l'echange precedent. Reponds sur CE sujet.
2. Le BRUIT. Ignore les anciens echanges qui n'ont pas de lien avec la question actuelle.

Si l'historique ne permet pas de lever l'ambiguite, demande UNE clarification courte
("Tu parles de quel metier ?") au lieu d'inventer ou de partir dans tous les sens.

# Regles de sources
- Source PRINCIPALE : les infos des fiches resumes dans "Contexte ONISEP". Exploite la description pour le fond.
  NE recopie PAS les URLs ni les liens https dans ta reponse : l'interface affiche deja un bouton pour la fiche.
- INTERDIT : toute ligne qui repete une URL onisep.fr dans ta reponse.
- Si un metier cite par l'eleve n'est pas dans le contexte, reponds avec connaissances generales avec la mention adaptee pour les donnees chiffrees (salaires, stats).
- Ne jamais inventer un lien ONISEP dans le corps du message.

# Regles de longueur et style (PRIORITAIRE)
- Reponse COURTE, NETTE, PRECISE : 60 a 120 mots (2 a 4 phrases) sauf parcours complet demande.
- Premiere phrase = reponse directe (chiffre, oui/non, intitule).
- Max 3 puces si indispensable. Pas d'intro, recap, "En resume", "N'hesite pas", "Je reste disponible".
- Pas de "Bonjour !" ni "Souhaites-tu..." si la question etait precise.
`;

function serializeDevMetiersContext(recs) {
  if (!recs?.length) return "(aucune fiche metier dans le contexte)";
  const lines = [];
  for (const hit of recs) {
    const m = hit.metier || {};
    lines.push(`## Métier : ${m.libelle || "?"}`);
    lines.push(`- Niveau minimum : ${m.niveau_min || ""}`);
    if (m.description) lines.push(`- Description : ${String(m.description).slice(0, 180)}`);
    lines.push("- Formations associees dans ce parcours :");
    const forms = (hit.formations || []).slice(0, 2);
    if (!forms.length) lines.push("  - (voir fiche officielle)");
    else
      for (const f of forms) {
        lines.push(
          `  - [${f.niveau_label || "?"}] ${f.libelle || ""} (${f.duree || ""})`,
        );
      }
    lines.push("");
  }
  return lines.join("\n");
}

function formatHistoryForCoach(msgs) {
  if (!msgs.length) return "(aucun échange précédent)";
  return msgs.map((m) => `${m.role}: ${m.content}`).join("\n");
}

function sanitizeCoachReply(text) {
  let t = String(text || "");
  t = t.replace(/https?:\/\/(?:www\.)?onisep\.fr[^\s)\]>"',]*/gi, "");
  t = t.replace(
    /\s*pour plus de d[eéè]tails sur les missions[^\n]*(?:\n|$)/gi,
    "",
  );
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.trim();
  const orphan =
    /\s+(?:(?:disponibles\s+)?sur\s+la|disponibles\s+sur\s+la|sur\s+le|on\s+the|available\s+on\s+the|available\s+at\s+the)\s*$/i;
  const trailPunct = /\s*[:\-–—,…]+\s*$/u;
  for (let i = 0; i < 8; i++) {
    const n = t.replace(orphan, "").replace(trailPunct, "").trim();
    if (n === t) break;
    t = n;
  }
  return t;
}

const DEV_COACH_UI_LANG = new Set([
  "fr", "en", "es", "zh", "hi", "ar", "pt", "ru", "de", "ja",
]);

function normalizeCoachUiLang(raw) {
  const p = String(raw || "fr").trim().toLowerCase().split("-")[0];
  return DEV_COACH_UI_LANG.has(p) ? p : "fr";
}

const _COACH_LANG_LABEL = {
  en: "English",
  es: "Spanish",
  zh: "Chinese (Simplified)",
  hi: "Hindi",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  de: "German",
  ja: "Japanese",
};

function coachSystemForUiLang(lang) {
  if (lang === "fr") return DEV_COACH_SYSTEM;
  const label = _COACH_LANG_LABEL[lang] || "English";
  return `${DEV_COACH_SYSTEM}

# Langue de l'interface (OBLIGATOIRE — alignement prod)
Moov'Up est affiche en **${label}** (code ${lang}). Redige **toute** ta reponse dans cette langue (questions en francais incluses si l'utilisateur prefere ; l'interface est en ${label}).
Les extraits de contexte ONISEP sont souvent en francais : cite les titres officiels si utile mais explique en **${label}**.
Termine par une phrase **complete**. Ne termine pas par « sur la » ni « on the » sans objet (pas d'URL recopiee — l'utilisateur voit « ONISEP sheet » dans l'application).
`;
}

async function chatWithOpenRouter(orchMessages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: orchMessages,
      temperature: 0.25,
      max_tokens: 520,
      provider: { sort: "latency" },
    }),
  });
  const rawTxt = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${rawTxt.slice(0, 280)}`);
  }
  let data;
  try {
    data = JSON.parse(rawTxt);
  } catch {
    throw new Error("OpenRouter réponse JSON invalide");
  }
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Modèle vide ou réponse invalide");
  }
  return reply;
}

function normalizeUiLang(language) {
  const raw = String(language || "fr").trim().toLowerCase().split("-")[0];
  return raw || "fr";
}

function ruleLocalizeFormationDev(f, lang) {
  if (lang === "fr" || !f) return f;
  const out = { ...f };
  const typeMap = {
    "formation d'école spécialisée": "Specialized school program",
    "diplôme d'institut d'études politiques": "Political studies institute degree",
  };
  for (const key of ["type_formation", "niveau_sortie", "niveau_label", "resume", "duree"]) {
    if (typeof out[key] !== "string") continue;
    const low = out[key].trim().toLowerCase();
    out[key] =
      typeMap[low] ||
      out[key]
        .replace(/\bbac\s*\+\s*(\d+)\b/gi, "Level Bac+$1")
        .replace(/(\d+)\s*ans?\b/gi, "$1 years")
        .replace(/durée\s*:\s*/gi, "Duration: ");
  }
  return out;
}

function ruleLocalizeRecsDev(recs, lang) {
  if (lang === "fr" || !Array.isArray(recs)) return recs;
  return recs.map((hit) => ({
    ...hit,
    formations: (hit.formations || []).map((f) => ruleLocalizeFormationDev(f, lang)),
  }));
}

function extractJsonArray(text) {
  let raw = String(text || "").trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const m = raw.match(/\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : raw);
}

async function localizeRecommendationsDev(recs, language) {
  const lang = normalizeUiLang(language);
  const ruled = ruleLocalizeRecsDev(recs, lang);
  if (lang === "fr" || !Array.isArray(recs) || !recs.length) return ruled;
  if (!HAS_LLM_KEY) return ruled;

  const label = _COACH_LANG_LABEL[lang] || "English";
  const payload = recs.slice(0, 5).map((hit, i) => ({
    i,
    metier_libelle: String(hit?.metier?.libelle || "").slice(0, 160),
    metier_description: String(hit?.metier?.description || "").slice(0, 320),
    formations: (hit?.formations || []).slice(0, 6).map((f, j) => ({
      j,
      libelle: String(f?.libelle || "").slice(0, 140),
      resume: String(f?.resume || "").slice(0, 160),
    })),
  }));

  const raw = await chatWithOpenRouter([
    {
      role: "system",
      content:
        `Translate French ONISEP data to ${label}. Return ONLY a JSON array with fields i, metier_libelle, metier_description, formations (j, libelle, resume).`,
    },
    { role: "user", content: JSON.stringify(payload) },
  ]);

  let translated;
  try {
    translated = extractJsonArray(raw);
  } catch {
    return ruled;
  }

  const byI = new Map(translated.map((x) => [Number(x.i), x]));
  return recs.map((hit, i) => {
    const base = { ...hit, formations: (hit.formations || []).map((f) => ruleLocalizeFormationDev(f, lang)) };
    const patch = byI.get(i);
    if (!patch) return base;
    const metier = { ...(base.metier || {}) };
    if (patch.metier_libelle) metier.libelle = patch.metier_libelle;
    if (patch.metier_description) metier.description = patch.metier_description;
    const forms = (base.formations || []).map((f, j) => {
      const p = (patch.formations || []).find((x) => Number(x.j) === j);
      if (!p) return f;
      return {
        ...f,
        libelle: p.libelle || f.libelle,
        resume: p.resume || f.resume,
      };
    });
    return { ...base, metier, formations: forms };
  });
}

/** @type {Map<string, { id: number, email: string, password: string, totp_secret: string | null, totp_enabled: boolean }>} */
const usersByEmail = new Map();
/** @type {Map<number, { id: number, email: string, password: string, totp_secret: string | null, totp_enabled: boolean }>} */
const usersById = new Map();
let nextUserId = 1;
let nextConvId = 1;
/** @type {Map<number, object>} */
const conversations = new Map();

function cors(res, origin = "http://localhost:3000") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const s = Buffer.concat(chunks).toString("utf8");
        resolve(s ? JSON.parse(s) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function getBearer(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload;
}

function getUser(req) {
  const token = getBearer(req);
  if (!token) return { err: 401, detail: "Missing token" };
  const payload = verifyJwt(token);
  if (!payload) return { err: 401, detail: "Invalid token" };
  if (payload.typ === "2fa_pending") return { err: 401, detail: "Invalid token" };
  const user = usersById.get(payload.user_id);
  if (!user) return { err: 401, detail: "Unknown user" };
  return { user };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "http://localhost:3000";
  cors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        status: "ok",
        flavor: "nodejs-dev-api",
        coach_llm_configured: HAS_LLM_KEY,
        coach_rag_available: false,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 422, { detail: [{ msg: "Invalid email" }] });
        return;
      }
      const pe = validatePassword(password);
      if (pe) {
        sendJson(res, 422, { detail: pe });
        return;
      }
      if (usersByEmail.has(email)) {
        sendJson(res, 409, { detail: "Email already registered" });
        return;
      }
      const id = nextUserId++;
      const user = { id, email, password, totp_secret: null, totp_enabled: false };
      usersByEmail.set(email, user);
      usersById.set(id, user);
      const token = makeToken(id, email);
      sendJson(res, 201, { token, user: { id, email, totp_enabled: false } });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const u = usersByEmail.get(email);
      if (!u || u.password !== password) {
        sendJson(res, 401, { detail: "Invalid credentials" });
        return;
      }
      if (u.totp_enabled && u.totp_secret) {
        sendJson(res, 200, {
          needs_2fa: true,
          temp_token: make2faPendingToken(u.id, u.email),
          user: { id: u.id, email: u.email, totp_enabled: true },
        });
        return;
      }
      sendJson(res, 200, {
        token: makeToken(u.id, u.email),
        user: { id: u.id, email: u.email, totp_enabled: false },
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login/2fa") {
      const body = await readBody(req);
      const temp = String(body.temp_token || "");
      const code = String(body.code || "").trim();
      const payload = verifyJwt(temp);
      if (!payload || payload.typ !== "2fa_pending") {
        sendJson(res, 401, { detail: "Invalid or expired 2FA session" });
        return;
      }
      const u = usersById.get(payload.user_id);
      if (!u || u.email !== payload.email || !u.totp_enabled || !u.totp_secret) {
        sendJson(res, 401, { detail: "Invalid or expired 2FA session" });
        return;
      }
      if (!totpVerify(u.totp_secret, code)) {
        sendJson(res, 422, { detail: "Invalid 2FA code" });
        return;
      }
      sendJson(res, 200, {
        token: makeToken(u.id, u.email),
        user: { id: u.id, email: u.email, totp_enabled: true },
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/2fa/setup") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      if (r.user.totp_enabled) {
        sendJson(res, 400, { detail: "2FA already enabled" });
        return;
      }
      const secret = randomTotpSecret();
      r.user.totp_secret = secret;
      sendJson(res, 200, {
        otpauth_uri: totpProvisioningUri(secret, r.user.email),
        secret,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/2fa/enable") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      if (r.user.totp_enabled) {
        sendJson(res, 400, { detail: "2FA already enabled" });
        return;
      }
      if (!r.user.totp_secret) {
        sendJson(res, 400, { detail: "Run setup first" });
        return;
      }
      const body = await readBody(req);
      const code = String(body.code || "").trim();
      if (!totpVerify(r.user.totp_secret, code)) {
        sendJson(res, 422, { detail: "Invalid 2FA code" });
        return;
      }
      r.user.totp_enabled = true;
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/2fa/disable") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      if (!r.user.totp_enabled || !r.user.totp_secret) {
        sendJson(res, 400, { detail: "2FA not enabled" });
        return;
      }
      const body = await readBody(req);
      const password = String(body.password || "");
      const code = String(body.code || "").trim();
      if (r.user.password !== password) {
        sendJson(res, 401, { detail: "Invalid password" });
        return;
      }
      if (!totpVerify(r.user.totp_secret, code)) {
        sendJson(res, 422, { detail: "Invalid 2FA code" });
        return;
      }
      r.user.totp_enabled = false;
      r.user.totp_secret = null;
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      sendJson(res, 200, {
        id: r.user.id,
        email: r.user.email,
        totp_enabled: !!r.user.totp_enabled,
      });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/auth/me") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      usersByEmail.delete(r.user.email);
      usersById.delete(r.user.id);
      for (const [cid, conv] of conversations.entries()) {
        if (conv.userId === r.user.id) conversations.delete(cid);
      }
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/rag/warmup") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      sendJson(res, 200, { ready: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/conversations") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      const body = await readBody(req);
      const qa = body.quiz_answers || {};
      const q1 = qa.q1;
      const q3 = qa.q3;
      if (!q1 || !Q1_OK.has(q1)) {
        sendJson(res, 400, { detail: "Unknown q1: " + q1 });
        return;
      }
      if (!q3 || !Q3_OK.has(q3)) {
        sendJson(res, 400, { detail: "Unknown q3: " + q3 });
        return;
      }
      const niveau_max = Q3_TO_NIVEAU[q3];
      const profile_text = buildProfileTextForConversation(qa);
      const initial_recommendations = fakeRecommendations(q1);
      const cid = nextConvId++;
      conversations.set(cid, {
        id: cid,
        userId: r.user.id,
        profile_text,
        niveau_max,
        q1,
        quiz_answers: qa,
        initial_recommendations,
        messages: [],
      });
      sendJson(res, 201, {
        conversation_id: cid,
        profile_text,
        niveau_max,
        quiz_answers: qa,
        initial_recommendations,
        messages: [],
      });
      return;
    }

    const convGet = req.method === "GET" && url.pathname.match(/^\/api\/conversations\/(\d+)$/);
    if (convGet) {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      const cid = Number(convGet[1]);
      const c = conversations.get(cid);
      if (!c || c.userId !== r.user.id) {
        sendJson(res, 404, { detail: "Conversation introuvable" });
        return;
      }
      sendJson(res, 200, {
        conversation_id: cid,
        profile_text: c.profile_text,
        niveau_max: c.niveau_max,
        quiz_answers: c.quiz_answers || {},
        initial_recommendations: c.initial_recommendations,
        messages: c.messages,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      const body = await readBody(req);
      const conversation_id = Number(body.conversation_id);
      const message = String(body.message || "").trim();
      const uiLang = normalizeCoachUiLang(body.language);
      const c = conversations.get(conversation_id);
      if (!c || c.userId !== r.user.id) {
        sendJson(res, 404, { detail: "Conversation introuvable" });
        return;
      }
      const historyForPrompt = c.messages.slice(-10);
      const userBlock =
        `## Profil de l'élève\n${c.profile_text}\n\n` +
        `## Historique récent (10 derniers messages)\n${formatHistoryForCoach(historyForPrompt)}\n\n` +
        `## Contexte ONISEP (métiers du parcours — résumés pour ce tour)\n${serializeDevMetiersContext(c.initial_recommendations)}\n\n` +
        `## Question actuelle\n${message}\n`;
      const orchMessages = [
        { role: "system", content: coachSystemForUiLang(uiLang) },
        { role: "user", content: userBlock },
      ];

      let reply = "";
      if (HAS_LLM_KEY) {
        try {
          reply = sanitizeCoachReply(await chatWithOpenRouter(orchMessages));
          if (!reply) throw new Error("Réponse vide après nettoyage");
        } catch (e) {
          console.error("[dev-api][chat][llm]", e);
          sendJson(res, 503, {
            detail:
              String(e.message || e) +
              ". Vérifie OPENROUTER_API_KEY / LLM_MODEL dans backend/.env ou l’erreur réseau.",
          });
          return;
        }
      } else {
        reply =
          "Je ne peux pas encore appeler le modèle : **OPENROUTER_API_KEY** n’est pas configurée pour l’API de dev.\n\n" +
          "Ajoute-la dans **`backend/.env`** (copie depuis ton déploiement Python), puis relance **`npm run dev`**.\n\n" +
          "Alternative : démarre le backend FastAPI complet (`uvicorn` sur le port 8000) et pointe Vite `" +
          "VITE_API_URL=http://127.0.0.1:8000`.";
      }

      c.messages.push({ role: "user", content: message });
      c.messages.push({ role: "assistant", content: reply });
      const tail = c.messages.slice(-10);
      sendJson(res, 200, {
        reply,
        recommended_metiers: c.initial_recommendations,
        updated_history: tail,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommendations/localize") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      const body = await readBody(req);
      const recommendations = Array.isArray(body.recommendations) ? body.recommendations : [];
      const localized = await localizeRecommendationsDev(recommendations, body.language);
      sendJson(res, 200, { recommendations: localized });
      return;
    }

    sendJson(res, 404, { detail: "Not found" });
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { detail: String(e.message || e) });
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    console.error(`[dev-api] Port ${PORT} indisponible (${err.code}). Essaie : PORT=8788 node scripts/dev-api.mjs`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[dev-api] Moov'Up API locale http://localhost:${PORT}`);
  console.log(`[dev-api] JWT_SECRET=${JWT_SECRET.slice(0, 8)}… (aligné sur backend/.env ou défaut Python)`);
  console.log(
    `[dev-api] Moov'Coach LLM OpenRouter ${HAS_LLM_KEY ? `oui (${LLM_MODEL})` : "non — définir OPENROUTER_API_KEY dans backend/.env"}`,
  );
  console.log("[dev-api] Avec le front : depuis frontend, « npm run dev » (API + Vite) ou ce serveur + « npm run dev:vite » (proxy /api → ce port).");
  console.log(`[dev-api] Sinon définis VITE_API_URL=http://localhost:${PORT} si tu n'utilises pas le proxy.`);
});
