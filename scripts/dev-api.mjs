/**
 * API Moov'Up légère pour développement local (sans Docker).
 * Auth + conversations + chat : réponses génériques (hors RAG / hors modèle génératif).
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
  return signJwt({ user_id: userId, email, exp });
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

/** @type {Map<string, { id: number, email: string, password: string }>} */
const usersByEmail = new Map();
/** @type {Map<number, { id: number, email: string, password: string }>} */
const usersById = new Map();
let nextUserId = 1;
let nextConvId = 1;
/** @type {Map<number, object>} */
const conversations = new Map();

function cors(res, origin = "http://localhost:3000") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
      sendJson(res, 200, { status: "ok" });
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
      const user = { id, email, password };
      usersByEmail.set(email, user);
      usersById.set(id, user);
      const token = makeToken(id, email);
      sendJson(res, 201, { token, user: { id, email } });
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
      sendJson(res, 200, { token: makeToken(u.id, u.email), user: { id: u.id, email: u.email } });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      const r = getUser(req);
      if (r.err) {
        sendJson(res, r.err, { detail: r.detail });
        return;
      }
      sendJson(res, 200, { id: r.user.id, email: r.user.email });
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
        sendJson(res, 404, { detail: "Not found" });
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
      const c = conversations.get(conversation_id);
      if (!c || c.userId !== r.user.id) {
        sendJson(res, 404, { detail: "Conversation not found" });
        return;
      }
      c.messages.push({ role: "user", content: message });
      const reply =
        "Merci pour ton message.\n\n" +
        "Pour aller plus loin, ouvre les **fiches métiers** dans la colonne de gauche et les liens **ONISEP** : tu y trouveras salaires indicatifs, débouchés et formations associées.\n\n" +
        `Tu as demandé : « ${message} » — précise un métier, un diplôme ou une région si tu veux une réponse plus ciblée.`;
      c.messages.push({ role: "assistant", content: reply });
      const tail = c.messages.slice(-10);
      sendJson(res, 200, {
        reply,
        recommended_metiers: c.initial_recommendations,
        updated_history: tail,
      });
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
  console.log("[dev-api] Avec le front : depuis frontend, « npm run dev » (API + Vite) ou ce serveur + « npm run dev:vite » (proxy /api → ce port).");
  console.log(`[dev-api] Sinon définis VITE_API_URL=http://localhost:${PORT} si tu n’utilises pas le proxy.`);
});
