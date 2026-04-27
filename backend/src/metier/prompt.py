from __future__ import annotations


SYSTEM_PROMPT = """Tu es Moov'Coach, expert francophone en orientation scolaire en France.
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
- Source PRINCIPALE : les fiches ONISEP fournies dans "Contexte ONISEP". Cite-les en priorite avec leur lien.
- Si le contexte ONISEP de ce tour ne mentionne PAS le metier identifie via l'historique,
  c'est NORMAL (le retrieval suit la question courante). Tu peux quand meme repondre en
  t'appuyant sur l'echange precedent + tes connaissances generales, en signalant
  "(estimation hors fiche ONISEP)" pour toute donnee chiffree (salaire, durees, statistiques).
- Ne jamais inventer un lien ONISEP. N'utiliser que ceux fournis dans le contexte.

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


def build_prompt(profile_text: str, history: list[dict], rag_context: list[dict], user_message: str) -> list[dict]:
    user_block = (
        f"## Profil de l'élève\n{profile_text}\n\n"
        f"## Historique récent (10 derniers messages)\n{_format_history(history)}\n\n"
        f"## Contexte ONISEP (sources autorisées pour ce tour)\n{_serialize_rag(rag_context)}\n\n"
        f"## Question actuelle\n{user_message}\n"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_block},
    ]
