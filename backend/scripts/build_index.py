"""One-shot indexing via local multilingual-e5-base (lighter than Qwen, fast on CPU).

Usage (in Docker): docker compose run --rm backend python -m scripts.build_index
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_NAME = "intfloat/multilingual-e5-base"


def build_embedding_text(row, enrich: dict) -> str:
    parts = [
        str(row.get("libellé métier", "")),
        str(row.get("libellé ROME", "")),
        f"Domaine: {row.get('domaine/sous-domaine','')}",
    ]
    if enrich:
        if d := enrich.get("description"):
            parts.append(f"Description: {d}")
        if c := enrich.get("centres_interet"):
            parts.append(f"Centres d'intérêt: {', '.join(c)}")
        if s := enrich.get("synonymes"):
            parts.append(f"Synonymes: {', '.join(s)}")
        if sec := enrich.get("secteurs"):
            parts.append(f"Secteurs: {', '.join(sec)}")
    return ". ".join([p for p in parts if p])


def _met_id(url: str) -> str:
    m = re.search(r"MET\.\d+", str(url) or "")
    return m.group(0) if m else ""


def main() -> None:
    df = pd.read_csv(DATA_DIR / "fiche_metiers.csv", sep=";")
    enriched = {}
    enr_path = DATA_DIR / "metiers_enriched.json"
    if enr_path.exists():
        enriched = json.loads(enr_path.read_text())

    texts: list[str] = []
    meta: list[dict] = []
    for _, row in df.iterrows():
        url = row.get("lien site onisep.fr") or row.get("lien onisep") or ""
        mid = _met_id(url)
        enr = enriched.get(mid, {})
        text = build_embedding_text(row, enr)
        ds = str(row.get("domaine/sous-domaine", ""))
        first = ds.split("|", 1)[0].strip()
        meta.append({
            "libelle": str(row.get("libellé métier", "")),
            "libelle_rome": str(row.get("libellé ROME", "")),
            "domaine_sous_domaine": ds,
            "sous_domaine_key": first,
            "niveau_min": enr.get("niveau_min", ""),
            "description": (enr.get("description") or "")[:1500],
            "centres_interet": enr.get("centres_interet", []),
            "lien_onisep": str(url),
        })
        texts.append(text)

    print(f"Encoding {len(texts)} metiers with {MODEL_NAME} (local)...")
    model = SentenceTransformer(MODEL_NAME)
    model.max_seq_length = 512
    # E5 requires "passage: " prefix for documents to be indexed
    prefixed = ["passage: " + t for t in texts]
    vecs = model.encode(prefixed, batch_size=16, normalize_embeddings=True, show_progress_bar=True)
    vecs = np.asarray(vecs, dtype="float32")

    dim = vecs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vecs)
    faiss.write_index(index, str(DATA_DIR / "metiers.faiss"))
    (DATA_DIR / "metiers_meta.json").write_text(json.dumps(meta, ensure_ascii=False))
    print(f"Wrote {DATA_DIR/'metiers.faiss'} (dim={dim}, n={len(meta)})")


if __name__ == "__main__":
    main()
