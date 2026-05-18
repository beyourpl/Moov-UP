from __future__ import annotations

import copy
import json
import logging
import re
from typing import Any

from src.config import settings
from src.service.llm_client import OpenRouterClient

logger = logging.getLogger("moovup.onisep_localize")

LANG_LABELS: dict[str, str] = {
    "en": "English",
    "es": "Spanish",
    "ar": "Arabic",
    "zh": "Chinese",
    "hi": "Hindi",
    "pt": "Portuguese",
    "ru": "Russian",
    "de": "German",
    "ja": "Japanese",
}

FORMATION_TYPE_EN: dict[str, str] = {
    "formation d'école spécialisée": "Specialized school program",
    "formation d'école spécialisee": "Specialized school program",
    "diplôme d'institut d'études politiques": "Political studies institute degree",
    "diplome d'institut d'etudes politiques": "Political studies institute degree",
    "licence": "Bachelor's degree",
    "master": "Master's degree",
    "bts": "BTS (two-year technical degree)",
    "but": "BUT (bachelor's in technology)",
    "cpge": "Preparatory class (CPGE)",
    "école d'ingénieurs": "Engineering school",
    "ecole d'ingenieurs": "Engineering school",
}

NIVEAU_PATTERNS_EN: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"bac\s*\+\s*(\d+)", re.I), r"Level Bac+\1"),
    (re.compile(r"^bac$", re.I), "High school diploma (Bac)"),
    (re.compile(r"(\d+)\s*ans?", re.I), r"\1 years"),
    (re.compile(r"durée\s*:\s*", re.I), "Duration: "),
]


def _norm_lang(language: str | None) -> str:
    raw = (language or "fr").strip().lower().split("-", 1)[0]
    return raw or "fr"


def _translate_niveau_line(text: str, lang: str) -> str:
    if lang == "fr" or not text:
        return text
    out = text
    if lang == "en":
        low = text.casefold().strip()
        if low in FORMATION_TYPE_EN:
            return FORMATION_TYPE_EN[low]
        for pat, repl in NIVEAU_PATTERNS_EN:
            out = pat.sub(repl, out)
    return out


def _rule_localize_formation(f: dict[str, Any], lang: str) -> dict[str, Any]:
    if lang == "fr":
        return f
    out = copy.deepcopy(f)
    for key in ("type_formation", "niveau_sortie", "niveau_label", "resume", "domain_label"):
        val = out.get(key)
        if isinstance(val, str) and val.strip():
            out[key] = _translate_niveau_line(val, lang)
    duree = out.get("duree")
    if isinstance(duree, str) and duree.strip():
        out["duree"] = _translate_niveau_line(duree, lang)
    return out


def _rule_localize_hit(hit: dict[str, Any], lang: str) -> dict[str, Any]:
    if lang == "fr":
        return hit
    out = copy.deepcopy(hit)
    forms = out.get("formations")
    if isinstance(forms, list):
        out["formations"] = [_rule_localize_formation(f, lang) for f in forms if isinstance(f, dict)]
    return out


def _compact_for_llm(recs: list[dict[str, Any]], max_jobs: int = 5, max_forms: int = 6) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for i, hit in enumerate(recs[:max_jobs]):
        if not isinstance(hit, dict):
            continue
        m = hit.get("metier") if isinstance(hit.get("metier"), dict) else {}
        forms_in = hit.get("formations") if isinstance(hit.get("formations"), list) else []
        payload.append(
            {
                "i": i,
                "metier_libelle": str(m.get("libelle") or "")[:160],
                "metier_description": str(m.get("description") or "")[:320],
                "formations": [
                    {
                        "j": j,
                        "libelle": str(f.get("libelle") or "")[:140],
                        "resume": str(f.get("resume") or "")[:160],
                    }
                    for j, f in enumerate(forms_in[:max_forms])
                    if isinstance(f, dict)
                ],
            }
        )
    return payload


def _extract_json_array(text: str) -> list[dict[str, Any]]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.I)
        raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\[[\s\S]*\]", raw)
    if match:
        raw = match.group(0)
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("expected JSON array")
    return data


def _merge_llm_translations(
    recs: list[dict[str, Any]], translated: list[dict[str, Any]], lang: str
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    by_i = {int(item.get("i", -1)): item for item in translated if isinstance(item, dict)}
    for i, hit in enumerate(recs):
        base = _rule_localize_hit(hit, lang) if isinstance(hit, dict) else hit
        if not isinstance(base, dict):
            out.append(base)
            continue
        patch = by_i.get(i)
        if not patch:
            out.append(base)
            continue
        merged = copy.deepcopy(base)
        metier = merged.get("metier")
        if isinstance(metier, dict):
            if patch.get("metier_libelle"):
                metier["libelle"] = patch["metier_libelle"]
            if patch.get("metier_description"):
                metier["description"] = patch["metier_description"]
        t_forms = patch.get("formations")
        if isinstance(t_forms, list) and isinstance(merged.get("formations"), list):
            by_j = {int(x.get("j", -1)): x for x in t_forms if isinstance(x, dict)}
            for j, f in enumerate(merged["formations"]):
                if not isinstance(f, dict):
                    continue
                p = by_j.get(j)
                if not p:
                    continue
                if p.get("libelle"):
                    f["libelle"] = p["libelle"]
                if p.get("resume"):
                    f["resume"] = p["resume"]
        out.append(merged)
    return out


async def localize_recommendations(
    recs: list[dict[str, Any]], language: str | None
) -> list[dict[str, Any]]:
    lang = _norm_lang(language)
    if lang == "fr" or not recs:
        return recs

    ruled = [_rule_localize_hit(h, lang) if isinstance(h, dict) else h for h in recs]

    if settings.OPENROUTER_API_KEY in ("", "missing"):
        return ruled

    target = LANG_LABELS.get(lang, lang)
    payload = _compact_for_llm(recs)
    if not payload:
        return ruled

    system = (
        f"You translate French ONISEP career guidance data into {target}. "
        "Return ONLY a JSON array with the same structure as the input: "
        "each item has i, metier_libelle, metier_description, formations "
        "(array of j, libelle, resume). Keep proper names (school names, cities). "
        "Use natural {target} for job titles and training names."
    ).format(target=target)

    user = json.dumps(payload, ensure_ascii=False)

    try:
        client = OpenRouterClient()
        raw = await client.chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        translated = _extract_json_array(raw)
        return _merge_llm_translations(recs, translated, lang)
    except Exception:
        logger.exception("[localize_recommendations] LLM failed lang=%s", lang)
        return ruled
