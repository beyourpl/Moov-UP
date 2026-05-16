from __future__ import annotations

"""Bonus RAG dérivés des réponses questionnaire (activité, maths, spécialité…)."""

ACTIVITY_METIER_KEYWORDS: dict[str, list[str]] = {
    "resoudre-tech": [
        "développeur", "informaticien", "programmeur", "logiciel", "data", "données",
        "réseau", "cyber", "système", "informatique", "web", "cloud",
    ],
    "ecrire-raconter": [
        "journaliste", "rédacteur", "rédaction", "communication", "presse", "éditeur",
        "documentaliste", "correspondant",
    ],
    "parler-convaincre": [
        "commercial", "vendeur", "marketing", "communication", "attaché", "conseiller",
        "formateur", "médiateur", "avocat",
    ],
    "aider-accompagner": [
        "accompagnant", "aide-soignant", "infirmier", "éducateur", "assistant social",
        "conseiller", "coach", "psychologue", "animateur",
    ],
    "analyser-comprendre": [
        "analyste", "chercheur", "contrôleur", "auditeur", "documentaliste", "juriste",
        "ingénieur étude", "statisticien",
    ],
    "creer-projets": [
        "entrepreneur", "chef de projet", "créateur", "fondateur", "consultant",
        "responsable", "product owner",
    ],
    "creer-visuels": [
        "graphiste", "designer", "design", "illustrateur", "photographe", "vidéo",
        "monteur", "directeur artistique", "motion", "audiovisuel",
    ],
    "organiser-gerer": [
        "gestionnaire", "manager", "responsable", "coordinateur", "administrateur",
        "chef de projet", "rh", "comptable",
    ],
}

SPECIALTY_METIER_KEYWORDS: dict[str, list[str]] = {
    "journalisme": ["journaliste", "rédacteur", "presse", "reporter", "rédaction"],
    "dev": ["développeur", "programmeur", "logiciel", "full stack", "backend"],
    "cyber": ["cybersécurité", "sécurité informatique", "rssi"],
    "data": ["data", "données", "analyste", "scientist"],
    "web": ["développeur web", "intégrateur", "front", "webmaster"],
    "graphisme": ["graphiste", "illustrateur", "identité visuelle"],
    "design": ["designer", "ux", "ui", "produit"],
    "audiovisuel": ["monteur", "cadreur", "réalisateur", "vidéo", "cinéma"],
    "animation": ["animateur", "animation", "motion"],
}

MATH_HEAVY_HINTS = ["ingénieur", "actuaire", "statisticien", "data scientist", "mathématiques"]
MATH_LIGHT_PENALTY_HINTS = ["actuaire", "statisticien", "mathématiques appliquées"]


def _blob(metier: dict) -> str:
    return f"{metier.get('libelle', '')} {metier.get('description', '')[:500]}".casefold()


def _keyword_hits(blob: str, keywords: list[str]) -> int:
    return sum(1 for kw in keywords if kw.casefold() in blob)


def quiz_answers_score_boost(metier: dict, quiz_answers: dict | None) -> float:
    if not quiz_answers:
        return 0.0
    blob = _blob(metier)
    boost = 0.0

    activity = quiz_answers.get("activity")
    if activity and activity in ACTIVITY_METIER_KEYWORDS:
        hits = _keyword_hits(blob, ACTIVITY_METIER_KEYWORDS[activity])
        if hits:
            boost += min(0.14, 0.05 + hits * 0.025)

    specialty = quiz_answers.get("specialty")
    if specialty and specialty in SPECIALTY_METIER_KEYWORDS:
        hits = _keyword_hits(blob, SPECIALTY_METIER_KEYWORDS[specialty])
        if hits:
            boost += min(0.10, 0.04 + hits * 0.02)

    q8 = quiz_answers.get("q8")
    if q8 == "fort":
        if _keyword_hits(blob, MATH_HEAVY_HINTS):
            boost += 0.05
    elif q8 == "faible":
        if _keyword_hits(blob, MATH_LIGHT_PENALTY_HINTS):
            boost -= 0.05

    q9 = quiz_answers.get("q9")
    if q9 == "insertion":
        if any(w in blob for w in ("technicien", "agent", "employé", "opérateur", "bts", "cap ")):
            boost += 0.03
    elif q9 == "expertise":
        if any(w in blob for w in ("ingénieur", "expert", "spécialiste", "consultant", "master")):
            boost += 0.03

    return boost
