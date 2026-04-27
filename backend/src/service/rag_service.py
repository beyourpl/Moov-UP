from __future__ import annotations

import json
import logging
from collections import defaultdict
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

from src.config import settings
from src.metier.mappings import Q1_TO_ONISEP_DOMAINS


DATA_DIR = Path(settings.DATA_DIR)
MODEL_NAME = "intfloat/multilingual-e5-base"

logger = logging.getLogger("moovup.rag")


def _split_top_domain(cell: str) -> str:
    return str(cell).split("|", 1)[0].strip().split("/", 1)[0].strip()


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
                niveau = row.get("niveau de certification")
                try:
                    niveau_int = int(niveau)
                except (ValueError, TypeError):
                    continue
                out[top].append({
                    "libelle": str(row.get("libellé formation principal", "")),
                    "niveau_certif": niveau_int,
                    "niveau_label": str(row.get("libellé niveau de certification", "")),
                    "duree": str(row.get("durée", "")),
                    "lien": str(row.get("URL et ID Onisep", "")),
                })
        return dict(out)

    def initial_recommendations(self, profile_text: str, niveau_max: int, top_k: int = 5, q1: str | None = None) -> list[dict]:
        vec = self.embedder.encode(["query: " + profile_text], normalize_embeddings=True)
        return self._search_and_join(np.asarray(vec, dtype="float32"), niveau_max, top_k, q1=q1)

    def search_for_message(self, user_message: str, niveau_max: int, top_k: int = 5, q1: str | None = None) -> list[dict]:
        vec = self.embedder.encode(["query: " + user_message], normalize_embeddings=True)
        return self._search_and_join(np.asarray(vec, dtype="float32"), niveau_max, top_k, q1=q1)

    def _search_and_join(self, vec: np.ndarray, niveau_max: int, top_k: int, q1: str | None = None) -> list[dict]:
        # On oversample (top_k * 3) car on dedup ensuite par libellé : la CSV ONISEP
        # contient parfois plusieurs entrées avec le même libellé (variantes de domaine).
        # Sans oversampling, le filtre dédup pourrait laisser moins de top_k résultats.
        oversample_k = min(top_k * 3, len(self.metiers_meta))
        if q1 and q1 in Q1_TO_ONISEP_DOMAINS:
            allowed = Q1_TO_ONISEP_DOMAINS[q1]
            candidate_ids = [
                i for i, m in enumerate(self.metiers_meta)
                if any(d in m.get("domaine_sous_domaine", "") for d in allowed)
            ]
            if not candidate_ids:
                logger.info("[rag] q1=%s -> 0 candidates, returning []", q1)
                return []
            logger.info("[rag] q1=%s -> %d candidates pre-filter, oversample_k=%d", q1, len(candidate_ids), oversample_k)
            sel = faiss.IDSelectorBatch(np.array(candidate_ids, dtype="int64"))
            params = faiss.SearchParameters(sel=sel)
            scores, ids = self.index.search(vec, min(oversample_k, len(candidate_ids)), params=params)
        else:
            logger.info("[rag] no q1 filter, oversample_k=%d (over %d total)", oversample_k, len(self.metiers_meta))
            scores, ids = self.index.search(vec, oversample_k)

        # Trace top hits avec leur score de similarité cosinus
        trace = [
            (self.metiers_meta[int(i)].get("libelle", "?")[:60], round(float(s), 4))
            for s, i in zip(scores[0], ids[0]) if i >= 0
        ]
        logger.info("[rag] raw top hits (before dedup): %s", trace)

        results = []
        seen_pos: set[int] = set()
        seen_libelle: set[str] = set()
        for score, i in zip(scores[0], ids[0]):
            if i < 0 or int(i) in seen_pos:
                continue
            seen_pos.add(int(i))
            m = self.metiers_meta[int(i)]
            libelle = m.get("libelle", "")
            # Dedup par libellé : la CSV peut avoir le même métier dans plusieurs domaines
            if libelle in seen_libelle:
                logger.info("[rag] skip duplicate libellé %r (score=%.4f)", libelle[:60], float(score))
                continue
            seen_libelle.add(libelle)

            top = _split_top_domain(m.get("sous_domaine_key", "") or m.get("domaine_sous_domaine", ""))
            formations = self.formations_by_top_domain.get(top, [])
            formations = [f for f in formations if f["niveau_certif"] <= niveau_max]
            formations = sorted(formations, key=lambda f: f["niveau_certif"])
            uniq, seen_lib = [], set()
            for f in formations:
                if f["libelle"] in seen_lib:
                    continue
                seen_lib.add(f["libelle"])
                uniq.append(f)
                if len(uniq) >= 8:
                    break
            results.append({"metier": m, "formations": uniq, "score": round(float(score), 4)})
            if len(results) >= top_k:
                break

        logger.info("[rag] final top-%d (deduped): %s",
                    len(results),
                    [(r["metier"].get("libelle", "?")[:50], r["score"]) for r in results])
        return results
