from __future__ import annotations

from src.metier.mappings import Q1_TO_ONISEP_DOMAINS, Q3_TO_NIVEAU_MAX, HUMAN_LABELS

SPECIALTY_PROFILE_LABELS = {
    "journalisme": "journalisme, presse, médias et communication d'information",
}

ACTIVITY_EMBED_HINTS = {
    "creer-visuels": "métiers du design, du graphisme, de la photo et de l'audiovisuel",
    "ecrire-raconter": "métiers de la rédaction, du journalisme et de l'information",
    "parler-convaincre": "métiers de la communication, de la vente et de la négociation",
    "aider-accompagner": "métiers du soin, de l'accompagnement social et de l'éducation",
    "analyser-comprendre": "métiers de l'analyse, de la recherche et du conseil",
    "creer-projets": "métiers de l'entrepreneuriat, du management de projet et de la création d'entreprise",
    "resoudre-tech": "métiers du développement informatique, des données, des réseaux et de la cybersécurité",
    "organiser-gerer": "métiers du management, de la gestion et de la coordination",
}

ACTIVITY_LABELS = {
    "creer-visuels": "créer des visuels ou des vidéos (design, tournage, montage)",
    "ecrire-raconter": "écrire ou raconter des histoires (rédaction, information, narration)",
    "parler-convaincre": "parler, convaincre ou débattre (communication orale, présentation)",
    "aider-accompagner": "aider et accompagner des personnes (écoute, conseil, soutien)",
    "analyser-comprendre": "analyser et comprendre des sujets (recherche, réflexion, enquête)",
    "creer-projets": "créer des projets ou entreprendre (idées, lancement, construction)",
    "resoudre-tech": "résoudre des problèmes techniques (solutions, code, réparation)",
    "organiser-gerer": "organiser et gérer (planification, coordination d'équipes)",
}

ORIENTATION_BLOCKER_LABELS = {
    "info": "je manque d'informations sur les métiers et les formations",
    "peur": "j'ai peur de me tromper dans mon choix d'orientation",
    "pression": "je ressens une pression familiale ou sociale",
    "indecision": "je suis partagé·e entre trop d'options",
}


class InvalidQuizAnswers(ValueError):
    pass


def _label(scope: str, key: str | None) -> str | None:
    if key is None:
        return None
    return HUMAN_LABELS.get(scope, {}).get(key)


def build_profile(answers: dict) -> tuple[str, int, list[str]]:
    q1 = answers.get("q1")
    q3 = answers.get("q3")
    if q1 is None or q3 is None:
        raise InvalidQuizAnswers("q1 and q3 are required")
    if q1 not in Q1_TO_ONISEP_DOMAINS:
        raise InvalidQuizAnswers(f"Unknown q1: {q1}")
    if q3 not in Q3_TO_NIVEAU_MAX:
        raise InvalidQuizAnswers(f"Unknown q3: {q3}")

    niveau_max = Q3_TO_NIVEAU_MAX[q3]
    domains = Q1_TO_ONISEP_DOMAINS[q1]
    q4 = answers.get("q4", "")

    niveau_txt = _label("q3", q3) or q3
    parts = [
        f"Je suis {niveau_txt} et je m'intéresse au domaine {q1} ({', '.join(domains)}).",
    ]
    specialty = answers.get("specialty")
    activity = answers.get("activity")
    if activity:
        act_txt = ACTIVITY_LABELS.get(activity, activity.replace("-", " "))
        parts.append(f"Activité naturelle préférée : {act_txt}.")
        if hint := ACTIVITY_EMBED_HINTS.get(activity):
            parts.append(f"Pistes métiers recherchées : {hint}.")
    if specialty:
        spec_txt = SPECIALTY_PROFILE_LABELS.get(specialty, specialty.replace("-", " "))
        parts.append(f"Spécialité visée : {spec_txt}.")
    if q4:
        if q4 in ORIENTATION_BLOCKER_LABELS:
            parts.append(f"Principal frein à l'orientation : {ORIENTATION_BLOCKER_LABELS[q4]}.")
        elif not specialty:
            parts.append(f"Spécialité visée : {q4}.")
    if (l := _label("q2", answers.get("q2"))):
        parts.append(f"J'apprends {l}.")
    if (l := _label("q5", answers.get("q5"))):
        parts.append(f"Je me projette à travailler {l}.")
    if (l := _label("q6", answers.get("q6"))):
        parts.append(f"Rythme d'études : {l}.")
    if (l := _label("q7", answers.get("q7"))):
        parts.append(f"Encadrement préféré : {l}.")
    if (l := _label("q8", answers.get("q8"))):
        parts.append(f"Rapport aux chiffres : {l}.")
    if (l := _label("q9", answers.get("q9"))):
        parts.append(f"Objectif principal : {l}.")
    if (l := _label("q10", answers.get("q10"))):
        parts.append(f"Mobilité : {l}.")

    return " ".join(parts), niveau_max, domains
