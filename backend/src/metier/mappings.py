from __future__ import annotations
import pandas as pd


# Mapped values must match EXACTLY the top-level domain values found in
# backend/data/fiche_metiers.csv (text before the first '/' in each
# '|'-separated part of the "domaine/sous-domaine" column).
Q1_TO_ONISEP_DOMAINS: dict[str, list[str]] = {
    "tech":        ["informatique, Internet", "électricité, électronique, robotique"],
    "business":    ["commerce, marketing, vente", "gestion des entreprises, comptabilité"],
    "creative":    ["arts, culture, artisanat", "information-communication, audiovisuel"],
    "sante":       ["santé, social, sport"],
    "education":   ["lettres, langues, enseignement"],
    "droit":       ["économie, droit, politique"],
    "industrie":   ["matières premières, fabrication, industries", "mécanique"],
    "batiment":    ["construction, architecture, travaux publics"],
    "agriculture": ["agriculture, animaux", "environnement, énergies, propreté"],
    "service":     ["hôtellerie-restauration, tourisme", "logistique, transport"],
}


Q3_TO_NIVEAU_MAX: dict[str, int] = {
    "college":   4,
    "seconde":   4,
    "terminale": 4,
    "bac":       5,
    "bac2":      5,
    "bac3":      6,
    "bac5":      7,
}


HUMAN_LABELS = {
    "q2": {"pratique": "par la pratique", "equilibre": "équilibre pratique/théorie", "theorie": "par la théorie"},
    "q3": {"college": "au collège", "seconde": "en seconde", "terminale": "en terminale",
           "bac": "j'ai le bac", "bac2": "à bac+2 (BTS/BUT)", "bac3": "à bac+3 (Licence)", "bac5": "à bac+5 (Master)"},
    "q5": {"bureau": "en bureau", "laboratoire": "en laboratoire", "terrain": "sur le terrain",
           "itinerant": "en itinérance", "distanciel": "à distance"},
    "q6": {"encadre": "avec un cadre clair", "mixte": "avec un mélange guidance/autonomie", "autonome": "en autonomie"},
    "q7": {"encadre": "encadré", "mixte": "mixte", "autonome": "autonome"},
    "q8": {"fort": "à l'aise avec les chiffres", "moyen": "à l'aise moyennement avec les chiffres", "faible": "peu à l'aise avec les chiffres"},
    "q9": {"insertion": "trouver un job rapidement", "expertise": "devenir expert", "flexibilite": "garder de la flexibilité", "creation": "créer mon activité"},
    "q10": {"local": "près de chez moi", "mobile": "mobile en France", "international": "ouvert à l'international", "distanciel": "préfère les formations à distance"},
}


def extract_top_domain(value: str) -> str:
    """'informatique, Internet/informatique (généralités)' → 'informatique, Internet'"""
    return value.split("/", 1)[0].strip()


def validate_mappings(df: pd.DataFrame) -> None:
    col = df["domaine/sous-domaine"].dropna()
    top_domains = set()
    for cell in col:
        for part in str(cell).split("|"):
            top_domains.add(extract_top_domain(part))
    missing: list[tuple[str, str]] = []
    for k, doms in Q1_TO_ONISEP_DOMAINS.items():
        for d in doms:
            if d not in top_domains:
                missing.append((k, d))
    if missing:
        raise RuntimeError(f"Mappings cassés: {missing}")
