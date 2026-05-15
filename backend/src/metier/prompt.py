from __future__ import annotations

import re

_SYSTEM_PROMPT_TEXT = """Tu es Moov'Coach, expert francophone en orientation scolaire en France.
Ton public : des lyceens et etudiants. Ton ton : clair, direct, chaleureux, jamais condescendant.

# Regles de continuite (IMPORTANT)
Tu recois une section "Historique recent" qui contient les 10 derniers messages de la conversation.
AVANT de repondre, identifie deux choses :
1. Le SUJET en cours. Si la question actuelle est une reference implicite ("le salaire",
   "et la duree ?", "il faut quelle ecole ?", "et en alternance ?"), remonte l'historique
   et trouve le metier ou la formation dont parlait l'echange precedent. Reponds sur CE sujet.
2. Le BRUIT. Ignore les anciens echanges qui n'ont pas de lien avec la question actuelle.
   Ne resume pas l'historique, ne le repete pas, n'y reviens pas si ce n'est pas demande.

Si l'historique ne permet pas de lever l'ambiguite, demande UNE clarification courte
("Tu parles de quel metier ?") au lieu d'inventer ou de partir dans tous les sens.

# Regles de sources
- Source PRINCIPALE : les infos des fiches ONISEP dans "Contexte ONISEP". Exploite-les pour le fond,
  mais NE recopie PAS les URLs ni les liens https dans ta reponse : l'interface affiche deja un bouton
  « Fiche ONISEP » pour chaque metier pertinent.
- INTERDIT : repondre seulement "va voir les fiches" ou la colonne de gauche sans donner dans ta reponse
  salaires indicatifs, fourchettes, debouches synthetises ou autres elements DIRECTEMENT demandes.
  Donne ces elements puis, si utile, rappelle en une courte phrase ou la verification officielle.
- INTERDIT : toute phrase du type « Pour plus de details sur les missions..., consulte sa fiche : »
  suivie d'une URL, ou toute ligne qui repete une URL onisep.fr — meme si elle figure dans le contexte.
  Tu peux dire en une courte phrase « Les details officiels sont sur la fiche ONISEP du metier » sans lien.
- Si le contexte ONISEP de ce tour ne mentionne PAS le metier identifie via l'historique,
  c'est NORMAL (le retrieval suit la question courante). Tu peux quand meme repondre en
  t'appuyant sur l'echange precedent + tes connaissances generales, en signalant
  "(estimation hors fiche ONISEP)" pour toute donnee chiffree (salaire, durees, statistiques).
- Ne jamais inventer un lien ONISEP. N'utiliser que ceux fournis dans le contexte (sans les afficher).

# Regles de longueur
- Reponses COURTES par defaut : 3-6 phrases pour une question simple.
- Format long (sections "Metiers recommandes" + "Parcours") UNIQUEMENT si l'eleve demande
  explicitement des recommandations ou un parcours complet.
- Pas de "Bonjour !" repete a chaque tour. Pas de "Souhaites-tu..." si la question etait precise.
- Pas de listes a puces excessives. Pas de gras tous les 2 mots.

# Cas particuliers
- Alternance / apprentissage : la plupart des BTS, BUT, Licences pro et Masters existent en alternance.
  Oriente vers les CFA. La fiche ONISEP du diplome est la source a verifier.
- Question hors orientation : recentre poliment en une phrase.
"""

SYSTEM_PROMPT = _SYSTEM_PROMPT_TEXT

_UI_LANG_NAMES: dict[str, str] = {
    "fr": "French (français)",
    "en": "English",
    "es": "Spanish",
    "zh": "Chinese (Simplified)",
    "hi": "Hindi",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ru": "Russian",
    "de": "German",
    "ja": "Japanese",
}


def normalize_ui_language(code: str | None) -> str:
    raw = (code or "fr").strip().lower()
    primary = raw.split("-", 1)[0] if raw else "fr"
    if primary in _UI_LANG_NAMES:
        return primary
    return "fr"


def system_prompt(ui_language: str = "fr") -> str:
    lang = normalize_ui_language(ui_language)
    if lang == "fr":
        return _SYSTEM_PROMPT_TEXT
    label = _UI_LANG_NAMES[lang]
    return _SYSTEM_PROMPT_TEXT + f"""

# Langue de l'interface (OBLIGATOIRE)
L'application Moov'Up est affichée en **{label}** (code {lang}). Rédige **toute** ta réponse dans cette langue : explications, fourchettes de salaires, nuances.
L'élève peut écrire dans une autre langue ; c'est la langue **d'interface** qui prime pour ta réponse.
Le contexte ONISEP ci-dessous est souvent en français : garde les intitulés officiels français si besoin, mais explique et chiffres en **{label}**.
Termine toujours par une **phrase complète** : après mention de la fiche ONISEP, formule une fin claire (sans laisser « sur la » / « on the » sans complément après suppression des liens).
"""


_ONISEP_HTTP = re.compile(
    r"https?://(?:www\.)?onisep\.fr[^\s)\]>\"',]*",
    re.IGNORECASE,
)
_BOILERPLATE_POUR_DETAILS = re.compile(
    r"(?is)\s*pour plus de d[eéè]tails sur les missions[^\n]*(?:\n|$)",
)
_ORPHAN_SENTENCE_TAIL = re.compile(
    r"(?is)"
    r"(?:\s+(?:disponibles\s+)?sur\s+la)$"
    r"|(?:\s+disponibles\s+sur\s+la)$"
    r"|(?:\s+sur\s+le)$"
    r"|(?:\s+on\s+the)$"
    r"|(?:\s+available\s+on\s+the)$"
    r"|(?:\s+available\s+at\s+the)$",
)
_TRAILING_PUNCT_GARBAGE = re.compile(r"\s*[:\-–—,…]+\s*$")


def sanitize_chat_reply(text: str) -> str:
    """Retire les URLs onisep.fr et la phrase-type « pour plus de détails… » (liens déjà dans l'UI)."""
    t = _BOILERPLATE_POUR_DETAILS.sub("", text)
    t = _ONISEP_HTTP.sub("", t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = t.strip()
    # Bouts de phrases orphelins quand une URL était collée après « sur la » / « on the »
    for _ in range(6):
        nxt = _ORPHAN_SENTENCE_TAIL.sub("", t).strip()
        if nxt == t:
            break
        t = nxt
    t = _TRAILING_PUNCT_GARBAGE.sub("", t).strip()
    return t


def _serialize_rag(rag_context: list[dict]) -> str:
    out = []
    for hit in rag_context:
        m = hit["metier"]
        out.append(f"## Métier : {m['libelle']}")
        out.append(f"- Domaine : {m.get('domaine_sous_domaine','')}")
        out.append(f"- Niveau minimum : {m.get('niveau_min','')}")
        if desc := m.get("description"):
            out.append(f"- Description : {desc[:500]}")
        if ci := m.get("centres_interet"):
            out.append(f"- Centres d'intérêt : {', '.join(ci)}")
        out.append(f"- Lien : {m.get('lien_onisep','')}")
        out.append("- Formations accessibles :")
        for f in hit["formations"]:
            out.append(f"  - [{f.get('niveau_label','')}] {f['libelle']} ({f.get('duree','')}) — {f.get('lien','')}")
        out.append("")
    return "\n".join(out)


def _format_history(history: list[dict]) -> str:
    if not history:
        return "(aucun échange précédent)"
    return "\n".join(f"{m['role']}: {m['content']}" for m in history)


def build_prompt(
    profile_text: str,
    history: list[dict],
    rag_context: list[dict],
    user_message: str,
    *,
    ui_language: str = "fr",
) -> list[dict]:
    user_block = (
        f"## Profil de l'élève\n{profile_text}\n\n"
        f"## Historique récent (10 derniers messages)\n{_format_history(history)}\n\n"
        f"## Contexte ONISEP (sources autorisées pour ce tour)\n{_serialize_rag(rag_context)}\n\n"
        f"## Question actuelle\n{user_message}\n"
    )
    return [
        {"role": "system", "content": system_prompt(ui_language)},
        {"role": "user", "content": user_block},
    ]
