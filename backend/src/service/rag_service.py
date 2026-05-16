from __future__ import annotations

import json
import logging
import re
from collections import defaultdict
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

from src.config import settings
from src.metier.mappings import Q1_TO_ONISEP_DOMAINS
from src.metier.formation_info import formation_row_from_csv
from src.metier.quiz_rag_boost import quiz_answers_score_boost


DATA_DIR = Path(settings.DATA_DIR)
MODEL_NAME = "intfloat/multilingual-e5-base"

logger = logging.getLogger("moovup.rag")

DEFAULT_TOP_K = 10
# 0 = toutes les formations accessibles (filtre niveau + domaine), sans plafond
FORMATIONS_PER_METIER = 0


def _journalisme_libelle_priority(libelle: str) -> int:
    l = libelle.casefold().strip()
    if l in ("journaliste", "journaliste / journaliste", "journaliste / journaliste"):
        return 0
    if l.startswith("journaliste") and "sportif" not in l and "reporter" not in l and "radio" not in l:
        return 1
    if "journaliste" in l:
        return 2
    return 3


def _specialty_score_boost(metier: dict, specialty: str | None) -> float:
    if not specialty:
        return 0.0
    ds = (metier.get("domaine_sous_domaine") or "").casefold()
    key = specialty.casefold()
    if key == "journalisme":
        if "journalisme" in ds:
            boost = 0.15
        elif "/presse" in ds or "presse/" in ds:
            boost = 0.10
        elif "information-communication" in ds:
            boost = 0.06
        else:
            boost = 0.0
        if "journaliste" in (metier.get("libelle") or "").casefold():
            return max(boost, 0.12)
        return boost
    sous = _sous_domain_labels(_domain_paths(ds))
    if key in sous or any(key in s for s in sous):
        return 0.08
    return 0.0


def _split_top_domain(cell: str) -> str:
    return str(cell).split("|", 1)[0].strip().split("/", 1)[0].strip()


def _domain_paths(cell: str) -> list[str]:
    return [p.strip() for p in str(cell).split("|") if p.strip()]


def _sous_domain_labels(paths: list[str]) -> set[str]:
    labels: set[str] = set()
    for path in paths:
        if "/" in path:
            labels.add(path.split("/", 1)[1].strip().casefold())
    return labels


def _full_paths_casefold(paths: list[str]) -> set[str]:
    return {p.strip().casefold() for p in paths if p.strip()}


def _formation_matches_metier_paths(metier_paths: list[str], formation_paths: list[str]) -> bool:
    if not metier_paths or not formation_paths:
        return False
    if _full_paths_casefold(metier_paths) & _full_paths_casefold(formation_paths):
        return True
    metier_sous = _sous_domain_labels(metier_paths)
    form_sous = _sous_domain_labels(formation_paths)
    return bool(metier_sous & form_sous) if metier_sous and form_sous else False


def _formation_relevance_score(metier: dict, formation: dict, metier_paths: list[str]) -> int:
    score = 0
    if _formation_matches_metier_paths(metier_paths, formation.get("domain_paths", [])):
        score += 20
    blob = f"{metier.get('libelle', '')} {metier.get('description', '')[:300]}".casefold()
    flib = formation.get("libelle", "").casefold()
    for tok in re.findall(r"[a-zàâäçéèêëïîôùûüœæ']{4,}", blob):
        if tok in flib:
            score += 3
    return score


class RagService:
    def __init__(self) -> None:
        self.embedder = SentenceTransformer(MODEL_NAME)
        self.index = faiss.read_index(str(DATA_DIR / "metiers.faiss"))
        self.metiers_meta: list[dict] = json.loads((DATA_DIR / "metiers_meta.json").read_text())
        self.formations_by_top_domain = self._load_formations()

    def _load_formations(self) -> dict[str, list[dict]]:
        df = pd.read_csv(DATA_DIR / "fiche_formation.csv", sep=";")
        out: dict[str, list[dict]] = defaultdict(list)
        for _, row in df.iterrows():
            ds = str(row.get("domaine/sous-domaine", ""))
            for part in ds.split("|"):
                top = _split_top_domain(part)
                if not top:
                    continue
                domain_paths = _domain_paths(ds)
                parsed = formation_row_from_csv(row, domain_paths)
                if not parsed.get("libelle") or not parsed.get("niveau_certif"):
                    continue
                out[top].append(parsed)
        return dict(out)

    def _formations_for_metier(
        self, metier: dict, niveau_max: int, limit: int = FORMATIONS_PER_METIER
    ) -> list[dict]:
        paths = _domain_paths(metier.get("domaine_sous_domaine") or metier.get("sous_domaine_key") or "")
        if not paths:
            paths = [_split_top_domain(metier.get("sous_domaine_key", "") or "")]
        tops = {_split_top_domain(p) for p in paths}

        candidates: list[dict] = []
        seen_lib: set[str] = set()
        for top in tops:
            for f in self.formations_by_top_domain.get(top, []):
                if f["libelle"] in seen_lib:
                    continue
                seen_lib.add(f["libelle"])
                if f["niveau_certif"] > niveau_max:
                    continue
                if not _formation_matches_metier_paths(paths, f.get("domain_paths", [])):
                    continue
                candidates.append(f)

        candidates.sort(
            key=lambda f: (
                -_formation_relevance_score(metier, f, paths),
                f["niveau_certif"],
            ),
        )
        uniq: list[dict] = []
        seen: set[str] = set()
        for f in candidates:
            if f["libelle"] in seen:
                continue
            seen.add(f["libelle"])
            uniq.append(f)
            if limit > 0 and len(uniq) >= limit:
                break
        return uniq

    def _ensure_journalisme_in_results(
        self,
        results: list[dict],
        top_k: int,
        niveau_max: int,
        candidate_ids: list[int] | None,
    ) -> list[dict]:
        if any(
            "journalisme" in (r["metier"].get("domaine_sous_domaine") or "").casefold()
            for r in results
        ):
            return results[:top_k]

        pool = candidate_ids if candidate_ids is not None else list(range(len(self.metiers_meta)))
        exclude = {r["metier"].get("libelle", "") for r in results}
        best_m: dict | None = None
        best_pri = 999
        for idx in pool:
            m = self.metiers_meta[int(idx)]
            lib = m.get("libelle", "")
            if lib in exclude:
                continue
            if "journalisme" not in (m.get("domaine_sous_domaine") or "").casefold():
                continue
            pri = _journalisme_libelle_priority(lib)
            if pri < best_pri:
                best_pri = pri
                best_m = m

        if best_m is None:
            return results[:top_k]

        anchor_score = results[0]["score"] if results else 0.55
        entry = {
            "metier": best_m,
            "formations": self._formations_for_metier(best_m, niveau_max),
            "score": anchor_score,
        }
        deduped = [entry] + [r for r in results if r["metier"].get("libelle") != best_m.get("libelle")]
        return deduped[:top_k]

    def initial_recommendations(
        self,
        profile_text: str,
        niveau_max: int,
        top_k: int = DEFAULT_TOP_K,
        q1: str | None = None,
        specialty: str | None = None,
        quiz_answers: dict | None = None,
    ) -> list[dict]:
        vec = self.embedder.encode(["query: " + profile_text], normalize_embeddings=True)
        return self._search_and_join(
            np.asarray(vec, dtype="float32"),
            niveau_max,
            top_k,
            q1=q1,
            specialty=specialty,
            quiz_answers=quiz_answers,
        )

    def search_for_message(
        self,
        user_message: str,
        niveau_max: int,
        top_k: int = DEFAULT_TOP_K,
        q1: str | None = None,
        specialty: str | None = None,
        quiz_answers: dict | None = None,
    ) -> list[dict]:
        vec = self.embedder.encode(["query: " + user_message], normalize_embeddings=True)
        return self._search_and_join(
            np.asarray(vec, dtype="float32"),
            niveau_max,
            top_k,
            q1=q1,
            specialty=specialty,
            quiz_answers=quiz_answers,
        )

    def _search_and_join(
        self,
        vec: np.ndarray,
        niveau_max: int,
        top_k: int,
        q1: str | None = None,
        specialty: str | None = None,
        quiz_answers: dict | None = None,
    ) -> list[dict]:
        # On oversample (top_k * 3) car on dedup ensuite par libellé : la CSV ONISEP
        # contient parfois plusieurs entrées avec le même libellé (variantes de domaine).
        # Sans oversampling, le filtre dédup pourrait laisser moins de top_k résultats.
        oversample_factor = 6 if specialty == "journalisme" else 4
        oversample_k = min(top_k * oversample_factor, len(self.metiers_meta))
        candidate_ids: list[int] | None = None
        if q1 and q1 in Q1_TO_ONISEP_DOMAINS:
            allowed = Q1_TO_ONISEP_DOMAINS[q1]
            candidate_ids = [
                i for i, m in enumerate(self.metiers_meta)
                if any(d in m.get("domaine_sous_domaine", "") for d in allowed)
            ]
            if not candidate_ids:
                logger.info("[rag] q1=%s -> 0 candidates, returning []", q1)
                return []
            oversample_k = min(oversample_k, len(candidate_ids))
            logger.info("[rag] q1=%s -> %d candidates pre-filter, oversample_k=%d", q1, len(candidate_ids), oversample_k)
            sel = faiss.IDSelectorBatch(np.array(candidate_ids, dtype="int64"))
            params = faiss.SearchParameters(sel=sel)
            scores, ids = self.index.search(vec, oversample_k, params=params)
        else:
            logger.info("[rag] no q1 filter, oversample_k=%d (over %d total)", oversample_k, len(self.metiers_meta))
            scores, ids = self.index.search(vec, oversample_k)

        # Trace top hits avec leur score de similarité cosinus
        trace = [
            (self.metiers_meta[int(i)].get("libelle", "?")[:60], round(float(s), 4))
            for s, i in zip(scores[0], ids[0]) if i >= 0
        ]
        logger.info("[rag] raw top hits (before dedup): %s", trace)

        ranked: list[tuple[float, float, int, dict]] = []
        seen_pos: set[int] = set()
        seen_libelle: set[str] = set()
        for score, i in zip(scores[0], ids[0]):
            if i < 0 or int(i) in seen_pos:
                continue
            seen_pos.add(int(i))
            m = self.metiers_meta[int(i)]
            libelle = m.get("libelle", "")
            if libelle in seen_libelle:
                logger.info("[rag] skip duplicate libellé %r (score=%.4f)", libelle[:60], float(score))
                continue
            seen_libelle.add(libelle)
            faiss_score = float(score)
            boost = _specialty_score_boost(m, specialty) + quiz_answers_score_boost(m, quiz_answers)
            ranked.append((faiss_score + boost, faiss_score, int(i), m))

        ranked.sort(key=lambda row: (-row[0], -row[1]))

        results = []
        for effective, faiss_score, _idx, m in ranked:
            formations = self._formations_for_metier(m, niveau_max)
            results.append({
                "metier": m,
                "formations": formations,
                "score": round(faiss_score, 4),
            })
            if len(results) >= top_k:
                break

        if specialty == "journalisme":
            results = self._ensure_journalisme_in_results(results, top_k, niveau_max, candidate_ids)

        logger.info("[rag] final top-%d (deduped): %s",
                    len(results),
                    [(r["metier"].get("libelle", "?")[:50], r["score"]) for r in results])
        return results
