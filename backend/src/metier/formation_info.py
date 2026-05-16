from __future__ import annotations

import re

# Niveau de certification ONISEP (RNCP) → libellé lisible
NIVEAU_CERTIF_HINTS: dict[int, str] = {
    1: "Bac+5 et plus",
    2: "Bac+4",
    3: "Bac+3 (licence)",
    4: "Bac+2 (BTS, BUT, DEUST…)",
    5: "Bac+2 (BTS, BUT…)",
    6: "Bac+3 (licence, bachelor…)",
    7: "Bac+5 (master, école d'ingénieurs…)",
    8: "Doctorat",
}


def _clean_cell(value: object) -> str:
    s = str(value or "").strip()
    if not s or s.lower() in ("nan", "non renseigné", "non renseigne"):
        return ""
    return s


def domain_display_label(domain_paths: list[str]) -> str:
    """Libellé court du domaine / sous-domaine pour contextualiser la formation."""
    if not domain_paths:
        return ""
    raw = domain_paths[0]
    if "/" in raw:
        return raw.split("/", 1)[1].strip()
    return raw.strip()


def niveau_certif_hint(niveau_certif: int) -> str:
    return NIVEAU_CERTIF_HINTS.get(niveau_certif, "")


def build_formation_resume(f: dict) -> str:
    """Une ligne synthétique : type, niveau de sortie, durée, certification."""
    parts: list[str] = []
    type_f = _clean_cell(f.get("type_formation"))
    if type_f:
        parts.append(type_f[0].upper() + type_f[1:] if len(type_f) > 1 else type_f)
    sortie = _clean_cell(f.get("niveau_sortie"))
    if sortie:
        parts.append(sortie)
    elif hint := niveau_certif_hint(int(f.get("niveau_certif") or 0)):
        parts.append(hint)
    elif nl := _clean_cell(f.get("niveau_label")):
        parts.append(nl)
    duree = _clean_cell(f.get("duree"))
    if duree:
        d = duree if re.search(r"\ban\b|ans|mois|semestre", duree, re.I) else f"{duree}"
        parts.append(d if d.lower().startswith(("en ", "à ", "1 ", "2 ", "3 ")) else f"Durée : {d}")
    return " · ".join(parts)


def formation_row_from_csv(row: object, domain_paths: list[str]) -> dict:
    """Construit le dict formation exposé à l'API / au front."""
    get = row.get if hasattr(row, "get") else lambda k, d="": getattr(row, k, d)
    niveau = get("niveau de certification")
    try:
        niveau_int = int(niveau)
    except (ValueError, TypeError):
        niveau_int = 0

    libelle = _clean_cell(get("libellé formation principal"))
    type_formation = _clean_cell(get("libellé type formation")) or _clean_cell(get("sigle type formation"))
    niveau_sortie = _clean_cell(get("niveau de sortie indicatif"))
    niveau_label = _clean_cell(get("libellé niveau de certification"))
    duree = _clean_cell(get("durée"))
    lien = _clean_cell(get("URL et ID Onisep"))
    sigle = _clean_cell(get("sigle formation"))

    out = {
        "libelle": libelle,
        "niveau_certif": niveau_int,
        "niveau_label": niveau_label,
        "niveau_sortie": niveau_sortie,
        "type_formation": type_formation,
        "sigle": sigle,
        "duree": duree,
        "lien": lien,
        "domain_paths": domain_paths,
        "domain_label": domain_display_label(domain_paths),
    }
    out["resume"] = build_formation_resume(out)
    return out
