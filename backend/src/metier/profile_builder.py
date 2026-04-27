from __future__ import annotations

from src.metier.mappings import Q1_TO_ONISEP_DOMAINS, Q3_TO_NIVEAU_MAX, HUMAN_LABELS


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

    parts = [
        f"Je suis {_label('q3', q3) or q3} et je m'intéresse au domaine {q1} ({', '.join(domains)}).",
    ]
    if q4:
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
