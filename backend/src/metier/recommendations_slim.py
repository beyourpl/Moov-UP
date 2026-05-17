from __future__ import annotations

"""Réponses quiz allégées : moins de JSON, génération plus rapide."""


def slim_recommendations(recs: list[dict], *, description_max: int = 320) -> list[dict]:
    out: list[dict] = []
    for hit in recs:
        m = dict(hit["metier"])
        if desc := m.get("description"):
            m["description"] = str(desc)[:description_max]
        m.pop("centres_interet", None)
        out.append({
            "metier": m,
            "formations": hit.get("formations") or [],
            "score": hit.get("score"),
        })
    return out
