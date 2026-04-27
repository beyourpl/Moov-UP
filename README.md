# Moov'Up — Chatbot RAG d'orientation scolaire

Application web qui aide les lycéens et étudiants à découvrir des métiers et formations adaptés à leur profil, à partir des **fiches officielles ONISEP**, en utilisant un système **RAG (Retrieval-Augmented Generation)**.

L'élève passe un quiz de 10 questions, reçoit des recommandations de métiers + parcours de formation, puis peut discuter avec un assistant ("Moov'Coach") qui s'appuie sur les vraies données ONISEP.

---

## 📑 Sommaire

1. [Démarrage rapide (5 commandes)](#-démarrage-rapide-5-commandes)
2. [Stack technique](#-stack-technique)
3. [Architecture globale](#-architecture-globale)
4. [Pipeline d'ingestion (scraping → indexation)](#-pipeline-dingestion-scraping--indexation)
5. [Flux d'une requête utilisateur (chat)](#-flux-dune-requête-utilisateur-chat)
6. [API : tous les endpoints](#-api--tous-les-endpoints)
7. [Stockage : qui contient quoi](#-stockage--qui-contient-quoi)
8. [Docker expliqué](#-docker-expliqué)
9. [Le Makefile et chaque commande](#-le-makefile-et-chaque-commande)
10. [Structure du projet](#-structure-du-projet)
11. [Tests](#-tests)
12. [Dépannage / FAQ](#-dépannage--faq)
13. [Pour aller plus loin](#-pour-aller-plus-loin)

---

## 🚀 Démarrage rapide (5 commandes)

**Prérequis :** Docker + Docker Compose installés. Une clé API gratuite **OpenRouter** (https://openrouter.ai). Optionnel : un token **HuggingFace** (https://huggingface.co/settings/tokens) — sinon ça marche en mode anonyme avec un rate limit plus serré.

```bash
# 1. Clone le repo
git clone <url-du-repo> tempo
cd tempo

# 2. Configure tes secrets
cp backend/.env.example backend/.env
# Édite backend/.env :
#   OPENROUTER_API_KEY=sk-or-v1-...
#   JWT_SECRET=$(openssl rand -hex 32)
#   HF_TOKEN=hf_xxxxx (optionnel mais recommandé)
#   ALLOWED_ORIGIN=http://localhost:5173      ← si tu tournes en local sur ta machine

# 3. ⚠️ ADAPTE VITE_API_URL DANS docker-compose.yml À TON SETUP
#    Le repo est livré configuré pour un VPS distant (http://178.104.253.218:8000).
#    Si tu fais tourner sur TA MACHINE LOCALE (pas de VM, pas de VPS), remplace
#    cette ligne dans docker-compose.yml :
#         VITE_API_URL: ${VITE_API_URL:-http://178.104.253.218:8000}
#    par :
#         VITE_API_URL: ${VITE_API_URL:-http://localhost:8000}

# 4. Build les images Docker (~3 min, télécharge torch + faiss)
make build

# 5. Lance les tests pour vérifier l'install
make test
# Attendu : 35 passed

# 6. Démarre l'application
make up

# Ouvre http://localhost:5173 dans ton navigateur
```

### Quelle valeur pour `VITE_API_URL` selon ton setup ?

`VITE_API_URL` est l'URL que ton **navigateur** utilise pour parler au backend. Le mot `localhost` dans le navigateur veut dire "ma machine cliente", pas le serveur Docker. Donc :

| Tu fais tourner Docker sur… | …et tu ouvres le navigateur sur… | `VITE_API_URL` doit valoir |
|---|---|---|
| **Ta propre machine** (laptop ou desktop) | la même machine | `http://localhost:8000` |
| Une **VM locale** dans ton réseau | ton laptop (via SSH/réseau) | `http://<IP_DE_LA_VM>:8000` (ex: `http://192.168.1.42:8000`) |
| Un **VPS distant** | ton laptop perso | `http://<IP_DU_VPS>:8000` (ex: `http://178.104.253.218:8000`) |

**Comment trouver l'IP de ta VM/VPS :**
```bash
# Depuis la machine où tourne Docker
ip addr show | grep "inet " | grep -v 127.0.0.1
# ou
hostname -I
```

**N'oublie pas** : la même IP doit aussi figurer dans `ALLOWED_ORIGIN` dans `backend/.env` (sinon CORS bloque). Tu peux y mettre plusieurs origines séparées par des virgules :
```
ALLOWED_ORIGIN=http://localhost:5173,http://192.168.1.42:5173
```

Après modification de `docker-compose.yml` ou `backend/.env`, refais un `make up` (ou `docker compose up -d --force-recreate --build`) pour que les changements soient pris en compte. **Vite injecte `VITE_API_URL` au moment du build du frontend** : un simple restart ne suffit pas, il faut un rebuild de l'image frontend.

> **INFO** : l'index FAISS et les données scrapées ONISEP sont **déjà commités** dans ce repo (`backend/data/metiers.faiss`, `metiers_meta.json`, `metiers_enriched.json`). Tu n'as **pas besoin** de relancer `make scrape` ni `make index`. Tu utilises directement le RAG livré.

> Si tu veux quand même tout regénérer toi-même (pour comprendre le pipeline), voir la section [Pipeline d'ingestion](#-pipeline-dingestion-scraping--indexation).

---

## 🛠 Stack technique

### Frontend ([frontend/](frontend))
- **React 19** + **Vite** — bibliothèque UI + serveur de dev rapide
- **react-router-dom 7** — gestion des routes (URLs `/auth`, `/demo`, `/assistant`...)
- **react-markdown** — rendu des réponses du LLM en markdown (titres, listes, liens cliquables)

### Backend ([backend/](backend))
- **FastAPI** — framework web Python ultra-rapide
- **SQLAlchemy 2** — ORM pour parler à SQLite avec du Python typé
- **SQLite** — base de données fichier (pas besoin d'un serveur DB séparé)
- **passlib + bcrypt** — hash sécurisé des mots de passe
- **python-jose** — gestion des tokens JWT (auth)
- **httpx** — client HTTP async pour appeler OpenRouter

### IA / RAG
- **sentence-transformers** + **`intfloat/multilingual-e5-base`** — modèle d'embedding **local** (~280 MB) qui transforme du texte en vecteur de 768 dimensions
- **FAISS** (`faiss-cpu`) — bibliothèque de Facebook AI pour faire de la recherche par similarité ultra-rapide sur des vecteurs
- **OpenRouter** + **`google/gemini-3-flash-preview`** — modèle LLM en API (la **seule** dépendance cloud), utilisé pour générer les réponses du chatbot

### Orchestration
- **Docker** + **docker-compose** — empaquette tout (Python, Node, modèle ML, données) en 2 containers reproductibles
- **Makefile** — raccourcis pour les commandes courantes (`make up`, `make test`, etc.)

---

## 🏗 Architecture globale

```
                ┌─────────────────────────────────────────────┐
                │        NAVIGATEUR DE L'UTILISATEUR          │
                │              http://localhost:5173          │
                └────────────────────┬────────────────────────┘
                                     │  HTTP (JSON + JWT Bearer)
                                     ▼
       ┌─────────────────────────────────────────────────────────┐
       │   CONTAINER FRONTEND (port 5173)                        │
       │   • React 19 + Vite (mode dev, hot-reload)              │
       │   • Pages : Landing / Auth / Quiz / Chatbot             │
       │   • Stocke le JWT dans localStorage                     │
       └────────────────────┬────────────────────────────────────┘
                            │  fetch('/api/...', {Authorization: Bearer ...})
                            ▼
       ┌─────────────────────────────────────────────────────────┐
       │   CONTAINER BACKEND (port 8000)                         │
       │                                                         │
       │   FastAPI ──► routes/                                   │
       │     • auth.py        : /api/auth/{register,login,me}    │
       │     • conversations.py : /api/conversations             │
       │     • chat.py        : /api/chat                        │
       │                                                         │
       │   Couches métier ──► metier/                            │
       │     • mappings.py        (quiz → ONISEP)                │
       │     • profile_builder.py (10 réponses → texte profil)   │
       │     • prompt.py          (construction prompt LLM)      │
       │                                                         │
       │   Services ──► service/                                 │
       │     • auth_service.py  (bcrypt + JWT)                   │
       │     • rag_service.py   (Qwen/E5 + FAISS + jointure)     │
       │     • llm_client.py    (httpx async vers OpenRouter)    │
       │                                                         │
       │   En RAM au démarrage :                                 │
       │     ▸ Modèle E5 (~600 MB)                               │
       │     ▸ Index FAISS (1518 vecteurs, ~5 MB)                │
       │     ▸ Métadonnées + dict formations (~50 MB)            │
       └─────┬────────────────────────┬─────────────────────┬────┘
             │                        │                     │
             ▼                        ▼                     ▼
       ┌──────────┐         ┌──────────────────┐   ┌──────────────────┐
       │ SQLite   │         │ Fichiers locaux  │   │  OPENROUTER API  │
       │ /app/db/ │         │ /app/data/       │   │  (cloud)         │
       │          │         │                  │   │                  │
       │ users    │         │ fiche_metiers.csv│   │ google/gemini-3  │
       │ convs.   │         │ fiche_formation. │   │   -flash-preview │
       │ messages │         │ metiers.faiss    │   │                  │
       │          │         │ metiers_meta.json│   │ → texte généré   │
       │          │         │ metiers_enriched │   │                  │
       └──────────┘         └──────────────────┘   └──────────────────┘
                                                       (le seul appel
                                                        sortant cloud)
```

**Points clés :**
- Tout tourne en **local** (Docker) sauf l'appel au LLM Gemini
- L'embedding se fait **en local** sur CPU (E5-base, modèle léger 280 MB)
- La recherche FAISS prend **<1 ms** sur 1518 vecteurs
- La latence perçue par l'utilisateur est **dominée par l'appel à Gemini** (~1-2 sec)

---

## 🔄 Pipeline d'ingestion (scraping → indexation)

Le pipeline transforme les données ONISEP brutes (CSV) en un **index vectoriel** que le RAG peut interroger sémantiquement. C'est exécuté **une seule fois** (les fichiers résultats sont commités dans le repo).

### Étape 1 — Données brutes ONISEP

Deux CSV publiés par l'ONISEP, dans [backend/data/](backend/data/) :

| Fichier | Lignes | Contenu |
|---|---|---|
| `fiche_metiers.csv` | 1519 métiers | libellé, lien onisep, code ROME, GFE, domaine/sous-domaine |
| `fiche_formation.csv` | 5830 formations | libellé, niveau de certification (1-7), durée, code RNCP, domaine/sous-domaine |

Ces CSV sont **pauvres en texte** : ils contiennent juste les libellés et la classification. Pas de description, pas de "centres d'intérêt", pas de compétences requises.

### Étape 2 — Scraping ONISEP (`make scrape`, ~25 min)

Le script [backend/scripts/scrape.py](backend/scripts/scrape.py) parcourt les 1519 métiers, télécharge la page ONISEP de chacun, et **enrichit** les données.

```
Pour chaque métier dans fiche_metiers.csv :
   1. GET https://www.onisep.fr/.../MET.XXX  (avec User-Agent navigateur)
   2. Suit la redirection vers la page slug
   3. Parse le HTML pour extraire :
       • La section "Le métier" (description complète, 200-500 mots)
       • L'encart méta : Niveau minimum, Synonymes,
         Secteurs, Centres d'intérêt
   4. Décode les entités HTML (&eacute; → é, etc.)
   5. Sleep 1 sec pour ne pas surcharger ONISEP
   6. Si erreur réseau → log + skip + continue
   
   Tous les 25 métiers : sauvegarde du JSON sur disque
   (script reprenable si interruption)
```

**Output :** [backend/data/metiers_enriched.json](backend/data/metiers_enriched.json) — un dict `{"MET.782": {libelle, description, centres_interet, synonymes, secteurs, niveau_min, lien_canonique}, ...}`

### Étape 3 — Indexation FAISS (`make index`, ~5-10 min)

Le script [backend/scripts/build_index.py](backend/scripts/build_index.py) transforme chaque métier en vecteur sémantique de 768 dimensions et construit l'index FAISS.

```
1. Charge fiche_metiers.csv + metiers_enriched.json
2. Pour chaque métier, construit un texte enrichi :
       "{libellé} {libellé ROME} Domaine: {domaine}.
        Description: {description scrapée}.
        Centres d'intérêt: {ci}. Synonymes: {syn}.
        Secteurs: {sec}."
3. Charge le modèle E5 (téléchargement ~280 MB une seule fois)
4. Encode tous les textes en batch (préfixe "passage: " requis par E5)
   → matrice (1518, 768) de floats normalisés L2
5. Construit faiss.IndexFlatIP (cosine similarity sur vecteurs L2-normalisés)
6. Écrit metiers.faiss (binaire) + metiers_meta.json (métadonnées
   pour reconstituer les hits — libellé, lien, niveau_min, etc.)
```

**Outputs :** 
- [backend/data/metiers.faiss](backend/data/metiers.faiss) — l'index vectoriel binaire (~5 MB, 1518 vecteurs × 768 dims)
- [backend/data/metiers_meta.json](backend/data/metiers_meta.json) — la liste indexée par position FAISS (la position N du JSON correspond au vecteur N dans le .faiss)

### Étape 4 — Chargement au démarrage du backend

Quand le container backend démarre (via `make up`), [backend/src/service/rag_service.py](backend/src/service/rag_service.py) :

1. Charge le modèle E5 en RAM (utilisé pour embedder les **queries** des utilisateurs au runtime, avec préfixe `"query: "`)
2. Charge `metiers.faiss` en RAM (~5 MB)
3. Charge `metiers_meta.json` en RAM (~3 MB)
4. Charge `fiche_formation.csv` en RAM et le transforme en `dict[domaine, list[formation]]` pour faire la jointure formations ↔ métier au runtime

Une fois ces 4 éléments chargés, le RAG est **armé** et `/api/chat` peut répondre.

---

## 💬 Flux d'une requête utilisateur (chat)

Voici ce qui se passe quand un utilisateur tape une question dans Moov'Coach.

```
USER tape : "C'est quoi un développeur ?"
        │
        │  POST /api/chat { conversation_id: 5, message: "..." }
        │  Header: Authorization: Bearer <JWT>
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend FastAPI : routes/chat.py                            │
│                                                              │
│  1. Décode JWT → identifie user                              │
│  2. Charge la conversation depuis SQLite (q1, niveau_max)    │
│  3. Vérifie que l'user est bien le owner de cette conv       │
│  4. Charge les 10 derniers messages (sliding window)         │
│  5. Embed la query :                                         │
│        "query: " + message + E5  →  vecteur (768,)           │
│  6. Pré-filtre les métiers du domaine q1 (IDSelectorBatch)   │
│  7. FAISS top-5 dans le sous-ensemble filtré (~150 vecteurs) │
│  8. Pour chaque métier hit :                                 │
│        • Lookup metier_meta[i] (libellé, lien, description)  │
│        • Filtre formations par sous-domaine + niveau_max     │
│  9. Construit le prompt :                                    │
│        SYSTEM_PROMPT (rôle, règles)                          │
│        + ## Profil + ## Historique + ## Contexte ONISEP      │
│        + ## Question actuelle                                │
│  10. Appel async vers OpenRouter / Gemini                    │
│  11. Sauvegarde le message user + réponse en SQLite          │
│  12. Retourne JSON { reply, recommended_metiers, history }   │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
USER voit : la réponse markdown + les nouvelles recommandations
```

### Pourquoi la mémoire conversationnelle marche

L'historique est **inclus dans le prompt** (section "Historique récent"). Le SYSTEM_PROMPT instruit le LLM :
1. D'identifier le **sujet en cours** : si l'utilisateur dit *"et le salaire ?"*, remonte l'historique pour trouver le métier en discussion
2. D'**ignorer le bruit** : ne pas resservir les anciennes recommandations à chaque tour
3. De demander une **clarification** si la référence reste ambiguë

L'embedding query, lui, ne contient **que** le message actuel (KISS). Si FAISS retourne des métiers hors-sujet à cause d'une question courte, le LLM utilise l'historique pour rester cohérent.

---

## 🔌 API : tous les endpoints

Base URL : `http://localhost:8000` (ou `http://<IP_VM>:8000` depuis un autre poste)

Toutes les routes `/api/conversations` et `/api/chat` requièrent un header `Authorization: Bearer <JWT>` obtenu à `/api/auth/login` ou `/api/auth/register`.

### Auth

#### `POST /api/auth/register`
Crée un compte utilisateur.

**Body :** `{ "email": "alice@example.com", "password": "MotDePasse123!" }`

**Validation password :** ≥10 caractères, au moins 1 chiffre, au moins 1 symbole.

**Réponse 201 :**
```json
{
  "token": "eyJhbGc...",
  "user": { "id": 1, "email": "alice@example.com" }
}
```

**Erreurs :**
- `409` Email déjà utilisé
- `422` Password ne respecte pas les règles

**Comment ça marche :** hash bcrypt du password (jamais stocké en clair) → row insérée dans `users` → JWT signé avec `JWT_SECRET` (HS256, expire 7 jours).

---

#### `POST /api/auth/login`
Authentifie un utilisateur existant.

**Body :** `{ "email": "alice@example.com", "password": "MotDePasse123!" }`

**Réponse 200 :** même format que `register`.

**Erreurs :** `401` Identifiants invalides.

---

#### `GET /api/auth/me`
Retourne l'utilisateur courant (vérifie la validité du JWT).

**Réponse 200 :** `{ "id": 1, "email": "alice@example.com" }`

---

### Conversations

#### `POST /api/conversations`
Crée une nouvelle conversation à partir des 10 réponses du quiz.

**Body :**
```json
{
  "quiz_answers": {
    "q1": "tech",        // domaine (clé du quiz)
    "q3": "terminale",   // niveau actuel
    "q4": "developpement",
    "q2": "pratique", "q5": "bureau", "q6": "mixte",
    "q7": "autonome", "q8": "fort", "q9": "expertise", "q10": "mobile"
  }
}
```
Seuls `q1` et `q3` sont obligatoires.

**Ce qui se passe :**
1. `profile_builder.py` transforme les 10 réponses en :
   - Un **profile_text** en français naturel ("Je suis en terminale, je m'intéresse à la tech, j'apprends par la pratique...")
   - Un **niveau_max** entier 4-7 (filtre dur sur les formations)
   - Une liste de **domaines ONISEP autorisés** (filtre dur sur les métiers via q1)
2. Embed du profile_text avec E5 → vecteur
3. Pré-filtre métiers par domaines `q1` → FAISS top-5
4. Pour chaque métier : récupère les formations accessibles (jointure par sous-domaine + filtre niveau)
5. Insertion dans `conversations` (avec `q1` persisté pour les filtres futurs)

**Réponse 201 :**
```json
{
  "conversation_id": 5,
  "profile_text": "Je suis en terminale et je m'intéresse au domaine tech...",
  "initial_recommendations": [
    {
      "metier": { "libelle": "...", "description": "...", "lien_onisep": "...", ... },
      "formations": [ { "libelle": "...", "niveau_label": "...", "lien": "..." }, ... ]
    },
    ...
  ]
}
```

---

#### `GET /api/conversations/{cid}`
Récupère une conversation existante (recommandations initiales + tous les messages).

**Réponse 200 :**
```json
{
  "conversation_id": 5,
  "profile_text": "...",
  "initial_recommendations": [...],
  "messages": [
    { "role": "user", "content": "Quel est le salaire ?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Sécurité :** retourne `404` si la conv appartient à un autre utilisateur.

---

### Chat

#### `POST /api/chat`
Envoie un message à Moov'Coach et reçoit la réponse.

**Body :** `{ "conversation_id": 5, "message": "Et en alternance ?" }`

**Ce qui se passe (détail dans la section précédente) :**
1. Charge les 10 derniers messages de la conv
2. Embed du `message` seul → FAISS top-5 (filtré par `q1` du quiz)
3. Construit le prompt complet (system + profil + historique + contexte ONISEP + question)
4. Appel OpenRouter Gemini
5. Persiste user msg + assistant reply dans `messages`
6. Retourne `reply` + `recommended_metiers` + `updated_history`

**Réponse 200 :**
```json
{
  "reply": "La plupart des BTS et BUT en informatique existent en alternance...",
  "recommended_metiers": [...],
  "updated_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

---

### Health

#### `GET /api/health`
Sanity check (pas d'auth).

**Réponse 200 :** `{ "status": "ok" }`

Utile pour `curl http://localhost:8000/api/health` après `make up`.

---

### 🛡 Rate limiting (slowapi)

Tous les endpoints sont protégés contre les abus par **slowapi** (rate limiting par IP). Quand la limite est atteinte, l'API renvoie un **`429 Too Many Requests`**.

| Endpoint | Limite | Pourquoi |
|---|---|---|
| `POST /api/auth/register` | **5 / min** | Anti-spam de création de comptes |
| `POST /api/auth/login` | **10 / min** | Anti brute-force du mot de passe |
| `GET /api/auth/me` | 60 / min | Endpoint léger, pas de coût |
| `POST /api/conversations` | **20 / min** | Embedding + RAG, modéré |
| `GET /api/conversations/{id}` | 60 / min | Read SQLite seulement |
| `POST /api/chat` | **30 / min** | Coût LLM (OpenRouter), à protéger |
| `GET /api/health` | 60 / min | Anti-DOS basique |

**Implémentation :**
- Module : [backend/src/infrastructure/api/limiter.py](backend/src/infrastructure/api/limiter.py)
- Stockage en mémoire (par défaut slowapi) — réinitialisé à chaque restart du backend
- Clé de rate limit : adresse IP de l'appelant (`get_remote_address`)
- En tests, le limiter est **désactivé** via `RATE_LIMIT_ENABLED=false` (cf. [tests/conftest.py](backend/tests/conftest.py)) pour ne pas faire échouer les fixtures qui hit le même endpoint plusieurs fois

**Tester le rate limiting localement :**
```bash
# Spam /api/health 100 fois en parallèle, observe les 429
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/health
done | sort | uniq -c
# Attendu :
#   60 200
#   10 429
```

**Améliorer en prod :**
- Pour un déploiement multi-instances, remplacer le storage en mémoire par Redis (`storage_uri="redis://..."`).
- Pour différencier user authentifié vs anonyme, écrire un `key_func` custom qui lit le JWT.

---

### Documentation interactive (Swagger)

FastAPI génère automatiquement une UI Swagger à :

**http://localhost:8000/docs**

Tu peux tester chaque endpoint directement depuis le navigateur. Pratique pour debug.

---

## 💾 Stockage : qui contient quoi

### SQLite — `/app/db/moovup.db` (volume Docker `sqlite_data`)

Base relationnelle pour les **données utilisateurs et conversations**. 3 tables :

#### `users`
| Colonne | Type | Description |
|---|---|---|
| `id` | INT PK auto-increment | Identifiant unique |
| `email` | TEXT UNIQUE | Email (lowercase) |
| `password_hash` | TEXT | Hash bcrypt du password (jamais le password en clair) |
| `created_at` | TIMESTAMP | Date d'inscription |

#### `conversations`
| Colonne | Type | Description |
|---|---|---|
| `id` | INT PK auto-increment | Identifiant unique |
| `user_id` | INT FK → users(id) | Propriétaire de la conv |
| `profile_text` | TEXT | Le profil en langage naturel généré depuis les 10 réponses du quiz |
| `niveau_max` | INT (1-7) | Niveau de certification max accessible (filtre formations) |
| `q1` | TEXT (20 chars) | Domaine choisi au quiz (`tech`, `sante`, etc.) — utilisé pour filtrer FAISS |
| `initial_metiers` | TEXT (JSON) | Les 5 métiers + formations recommandés à la création |
| `created_at` | TIMESTAMP | Date de création |

#### `messages`
| Colonne | Type | Description |
|---|---|---|
| `id` | INT PK auto-increment | Identifiant unique |
| `conversation_id` | INT FK → conversations(id) | Conv parente |
| `role` | TEXT (`user`/`assistant`) | Qui a parlé |
| `content` | TEXT | Le contenu du message |
| `created_at` | TIMESTAMP | Date d'envoi (utilisé pour ordonner) |

> **Inspecter la DB :** `docker exec tempo-backend-1 python -c "import sqlite3; [print(r) for r in sqlite3.connect('/app/db/moovup.db').execute('SELECT * FROM users')]"`

### Fichiers locaux — `backend/data/`

| Fichier | Type | Taille | Rôle |
|---|---|---|---|
| `fiche_metiers.csv` | CSV ONISEP | 0.6 MB | Source brute des 1519 métiers |
| `fiche_formation.csv` | CSV ONISEP | 2.4 MB | Source brute des 5830 formations |
| `metiers_enriched.json` | JSON | 2 MB | Texte enrichi par scraping ONISEP (description, synonymes, centres d'intérêt) |
| `metiers.faiss` | Binaire FAISS | 4.6 MB | Index vectoriel des 1518 métiers (768 dims chacun) |
| `metiers_meta.json` | JSON | 2.8 MB | Métadonnées humaines indexées par position FAISS |

### En RAM (au démarrage du backend, persiste tant que le container tourne)

- Modèle E5 (~600 MB)
- Index FAISS chargé en mémoire (~5 MB)
- `metiers_meta.json` parsé en `list[dict]` (~50 MB structures Python)
- `formations_by_top_domain` : dict pré-calculé pour la jointure formations en O(1)

---

## 🐳 Docker expliqué

**Pourquoi Docker ?** Le projet a des dépendances lourdes (PyTorch, FAISS, modèle E5) qui sont compliquées à installer sur Linux/Mac/Windows directement. Docker empaquète tout dans des **conteneurs** isolés du système hôte. Tout le monde a exactement le même environnement, peu importe sa machine.

### Concepts essentiels

- **Image** = "recette" pour construire un environnement (Python + libs + code)
- **Container** = instance qui tourne d'une image
- **Volume** = espace de stockage persistant qui survit aux redémarrages du container
- **docker-compose.yml** = fichier qui décrit comment plusieurs containers tournent ensemble

### Notre stack Docker

[docker-compose.yml](docker-compose.yml) définit 2 services :

```
┌──────────────────────────────────────────────────────────────┐
│  Service: backend                                            │
│    Image construite depuis backend/Dockerfile (Python 3.11)  │
│    Port 8000 exposé                                          │
│    Volumes :                                                 │
│      ./backend/src   → /app/src      (hot-reload du code)    │
│      ./backend/data  → /app/data     (CSV + index FAISS)     │
│      hf_cache        → /root/.cache/ (modèle E5 persistant)  │
│      sqlite_data     → /app/db       (DB users persistante)  │
│    Variables d'env : depuis backend/.env                     │
│    Commande : uvicorn src.main:app --reload                  │
├──────────────────────────────────────────────────────────────┤
│  Service: frontend                                           │
│    Image construite depuis frontend/Dockerfile (Node 20)     │
│    Port 5173 exposé                                          │
│    Volume : ./frontend/src → /app/src (hot-reload)           │
│    Variable d'env : VITE_API_URL                             │
│    Commande : npm run dev -- --host 0.0.0.0                  │
└──────────────────────────────────────────────────────────────┘

Volumes nommés (persistants même après docker compose down) :
  - hf_cache        : cache HuggingFace (modèle E5 téléchargé une fois)
  - sqlite_data     : la base SQLite (users, convs, messages)
```

### Hot-reload : pourquoi tu peux modifier le code sans rebuild

Les **bind mounts** (`./backend/src:/app/src`) montent ton dossier local dans le container. Quand tu sauves un fichier :
- Backend : `uvicorn --reload` détecte le changement et redémarre le serveur
- Frontend : Vite détecte le changement et recharge la page automatiquement

**Pas besoin** de relancer `make up` ou `docker build` à chaque modif.

**Sauf** si tu changes :
- `backend/pyproject.toml` (dépendances Python) → `make build`
- `frontend/package.json` (dépendances Node) → `docker compose up -d --build --force-recreate frontend`
- Un fichier dans `backend/data/` au runtime → `docker compose restart backend`

---

## 🔧 Le Makefile et chaque commande

Le [Makefile](Makefile) à la racine donne des raccourcis pour les commandes Docker courantes.

| Commande | Que fait-elle | Quand l'utiliser |
|---|---|---|
| `make build` | `docker compose build` — construit les images Python et Node | Première install ou après modif de `pyproject.toml`/`package.json` |
| `make test` | `docker compose run --rm backend pytest -v` — lance la suite de tests dans un container backend éphémère (`--rm` = supprimé après) | Vérifier que rien n'est cassé après un changement |
| `make scrape` | Lance `scripts/scrape.py` dans un container backend → écrit `metiers_enriched.json` | One-shot, ~25 min. **Pas nécessaire** : déjà commité dans le repo |
| `make index` | Lance `scripts/build_index.py` → écrit `metiers.faiss` + `metiers_meta.json` | One-shot, ~5-10 min. **Pas nécessaire** : déjà commité. À relancer si tu changes le modèle d'embedding |
| `make up` | `docker compose up -d --build` — démarre les 2 services en daemon | Pour lancer l'application |
| `make down` | `docker compose down` — stoppe les containers (garde les volumes) | Pour arrêter l'app |
| `make logs` | `docker compose logs -f backend frontend` — affiche les logs en live | Debug, voir ce qui se passe en temps réel |

### Cas d'usage typique pour un étudiant qui clone le repo

```bash
git clone <url> tempo
cd tempo
cp backend/.env.example backend/.env
# édite backend/.env avec sa clé OpenRouter
make build       # ~3 min
make test        # vérif install
make up          # lance l'app
# → ouvre http://localhost:5173
```

L'index FAISS est **déjà là** (commité), pas besoin de scraper ni d'indexer.

### Cas d'usage : "je veux comprendre le pipeline de A à Z"

```bash
# Supprime les fichiers générés pour partir from scratch
rm backend/data/metiers_enriched.json backend/data/metiers.faiss backend/data/metiers_meta.json

make scrape      # ~25 min : scrape les 1518 fiches ONISEP
make index       # ~5-10 min : encode avec E5 et construit FAISS
docker compose restart backend  # recharge les nouveaux fichiers
```

---

## 📁 Structure du projet

```
tempo/
├── README.md                       ← tu es ici
├── docker-compose.yml              ← orchestration des 2 services
├── Makefile                        ← raccourcis make build/test/up/...
├── .gitignore                      ← exclut .env, node_modules, .venv, docs/
│
├── backend/                        ← API FastAPI Python
│   ├── Dockerfile                  ← image Python 3.11-slim + deps
│   ├── pyproject.toml              ← dépendances Python (fastapi, faiss, ...)
│   ├── .env.example                ← template des variables d'environnement
│   ├── src/
│   │   ├── main.py                 ← point d'entrée FastAPI
│   │   ├── config.py               ← lecture des variables d'env
│   │   ├── infrastructure/
│   │   │   ├── api/
│   │   │   │   ├── deps.py         ← get_current_user (auth dependency)
│   │   │   │   ├── schemas.py      ← modèles Pydantic (validation entrée/sortie)
│   │   │   │   └── routes/
│   │   │   │       ├── auth.py
│   │   │   │       ├── conversations.py
│   │   │   │       ├── chat.py
│   │   │   │       └── health.py
│   │   │   └── db/
│   │   │       ├── database.py     ← engine SQLAlchemy + get_db
│   │   │       └── models.py       ← User, Conversation, Message
│   │   ├── metier/                 ← logique métier (transformation données)
│   │   │   ├── mappings.py         ← Q1_TO_ONISEP_DOMAINS, Q3_TO_NIVEAU_MAX
│   │   │   ├── profile_builder.py  ← quiz_answers → profile_text
│   │   │   └── prompt.py           ← SYSTEM_PROMPT + build_prompt()
│   │   └── service/                ← services techniques
│   │       ├── auth_service.py     ← bcrypt + JWT
│   │       ├── rag_service.py      ← E5 + FAISS + jointure formations
│   │       └── llm_client.py       ← appel OpenRouter (httpx async)
│   ├── scripts/                    ← scripts one-shot (hors runtime)
│   │   ├── scrape.py               ← scrape ONISEP → metiers_enriched.json
│   │   └── build_index.py          ← E5 + FAISS → metiers.faiss + meta.json
│   ├── data/                       ← données (CSV + JSON + index FAISS)
│   └── tests/                      ← suite pytest (35 tests)
│
└── frontend/                       ← UI React
    ├── Dockerfile                  ← image Node 20-slim + npm install
    ├── package.json                ← deps (react 19, react-router 7, react-markdown)
    ├── vite.config.js              ← config Vite
    ├── index.html                  ← entry HTML pour Vite
    └── src/
        ├── main.jsx                ← bootstrap React + Router
        ├── App.jsx                 ← définition des routes
        ├── pages/
        │   ├── LandingPage.jsx     ← page d'accueil publique
        │   ├── AuthPage.jsx        ← login + register avec validation password
        │   ├── PostAuthChoicePage.jsx
        │   ├── QuizPage.jsx        ← 10 questions → POST /api/conversations
        │   └── ChatbotPage.jsx     ← affichage métiers + chat (markdown)
        ├── data/
        │   ├── api.js              ← wrapper fetch + JWT auto + redirect 401
        │   ├── authStorage.js      ← login/register/getSession (utilise api.js)
        │   ├── orientationHelpers.js  ← labels du quiz
        │   ├── specialtyConfig.js  ← choix Q4 dynamiques selon domaine
        │   ├── translations.js     ← i18n FR
        │   └── uiPreferences.js
        ├── hooks/
        ├── components/
        └── styles/global.css       ← thème + styles auth + chatbot
```

---

## 🧪 Tests

Le backend a une suite **35 tests** qui tourne en ~20 sec dans Docker :

```bash
make test
```

Ce qui est testé :
- **Modèles DB** (création users/conversations/messages, contraintes)
- **Service auth** (hash bcrypt + JWT round-trip)
- **Routes auth** (register/login/me + cas d'erreur 401/409/422)
- **Mappings** (validation que les domaines ONISEP existent dans le CSV)
- **Profile builder** (snapshot du texte généré)
- **RAG service** (top-K + jointure formations + filtre niveau + filtre q1)
- **Scrape parser** (sur un fixture HTML ONISEP réel)
- **Build index** (smoke test avec un fake encoder)
- **LLM client** (mock httpx, vérifie format de la requête OpenRouter)
- **Prompt builder** (présence du system prompt, ordre Historique avant RAG)
- **Routes conversations + chat** (avec FakeRag pour pas charger E5)

Tous les tests **mockent** les dépendances lourdes (E5, FAISS, OpenRouter) → l'exécution est rapide et ne consomme pas de quota API.

---

## 🆘 Dépannage / FAQ

### Le backend met longtemps à démarrer la première fois
Normal. Au premier `make up`, E5-base (280 MB) se télécharge depuis HuggingFace. Si tu as un `HF_TOKEN` dans `.env`, c'est plus rapide. Aux démarrages suivants, le modèle est dans le volume `hf_cache`, chargement en ~10 sec.

### J'ai un 503 sur `/api/conversations`
Ça veut dire que le RAG n'est pas encore chargé. Vérifie :
```bash
ls backend/data/metiers.faiss        # doit exister
docker compose logs backend --tail 30 # cherche "Application startup complete"
```

### Le frontend affiche "ERR_CONNECTION_REFUSED" sur localhost:8000
Tu accèdes à l'app depuis une **autre machine** que celle où tourne Docker. `localhost` dans le navigateur = ta machine, pas la VM. Solution : modifier dans `docker-compose.yml` :
```yaml
VITE_API_URL: http://<IP_DE_LA_VM>:8000
```
Et ajouter cette IP à `ALLOWED_ORIGIN` dans `backend/.env` (séparé par virgule). Puis `docker compose up -d --build --force-recreate frontend`.

### Le LLM répond "401 Unauthorized" ou "model not found"
- 401 → ta clé `OPENROUTER_API_KEY` dans `backend/.env` est invalide ou pas renseignée
- "model not found" → `LLM_MODEL` n'est pas reconnu par OpenRouter. Liste des modèles dispos : https://openrouter.ai/models

### Inspecter ce qui est stocké en DB
```bash
docker exec tempo-backend-1 python -c "
import sqlite3
conn = sqlite3.connect('/app/db/moovup.db')
print('Users:'); [print(' ', r) for r in conn.execute('SELECT id, email FROM users')]
print('Convs:'); [print(' ', r) for r in conn.execute('SELECT id, user_id, q1, niveau_max FROM conversations')]
print('Messages count:'); print(' ', conn.execute('SELECT COUNT(*) FROM messages').fetchone())
"
```

### Voir le prompt envoyé au LLM (debug)
Les logs INFO incluent déjà : la query user, les métiers retournés par FAISS, la réponse LLM (300 premiers chars). Pour voir le prompt complet (DEBUG), modifier `backend/src/main.py` :
```python
logging.basicConfig(level=logging.DEBUG, ...)
```
Puis `make logs`.

### Reset complet de la DB
```bash
docker compose down
docker volume rm tempo_sqlite_data
docker compose up -d
```

---

## 🚀 Pour aller plus loin

Idées d'améliorations pédagogiques pour les étudiants :

1. **Streaming SSE** des réponses LLM (au lieu d'attendre la réponse complète)
2. **Authentification OAuth Google** (au lieu d'email/password)
3. **Filtrage par "alternance"** : scraper les fiches formation pour récupérer ce signal qui n'est pas dans le CSV
4. **Statistiques analytiques** : dashboard qui montre les domaines les plus demandés
5. **Multi-langue** : étendre le système au-delà du français
6. **Pagination de l'historique** : `/api/conversations/{id}?page=N&limit=20`
7. **Refresh tokens** + session management complet
8. **Recommandations personnalisées via fine-tuning** : entraîner E5 sur des paires (profil élève, métier choisi)
9. **Support de plusieurs LLM providers** (Anthropic, OpenAI, Mistral) via une abstraction
10. **Tests E2E frontend** avec Playwright

---

## 📄 Licence et données

Les données ONISEP utilisées sont publiques (publication officielle du Ministère de l'Éducation Nationale). Elles sont récupérées via scraping respectueux (1 req/sec, User-Agent valide, pas d'authentification contournée).

Code source du projet : libre d'utilisation pédagogique.
