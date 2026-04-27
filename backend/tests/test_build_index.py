import json
import numpy as np
import pandas as pd


def test_build_index_writes_faiss_and_meta(tmp_path, monkeypatch):
    csv = tmp_path / "fiche_metiers.csv"
    pd.DataFrame([
        {"libellé métier": "dev", "libellé ROME": "M1805",
         "domaine/sous-domaine": "informatique, Internet/informatique",
         "lien site onisep.fr": "https://x/MET.1"},
        {"libellé métier": "infirmier", "libellé ROME": "J1506",
         "domaine/sous-domaine": "santé, social, sport/santé",
         "lien site onisep.fr": "https://x/MET.2"},
    ]).to_csv(csv, sep=";", index=False)
    (tmp_path / "metiers_enriched.json").write_text("{}")

    import scripts.build_index as bi
    monkeypatch.setattr(bi, "DATA_DIR", tmp_path)

    class FakeST:
        def __init__(self, *a, **k): pass
        def encode(self, texts, **k):
            return np.random.RandomState(0).rand(len(texts), 8).astype("float32")

    monkeypatch.setattr(bi, "SentenceTransformer", FakeST)
    bi.main()

    assert (tmp_path / "metiers.faiss").exists()
    meta = json.loads((tmp_path / "metiers_meta.json").read_text())
    assert len(meta) == 2
    assert meta[0]["libelle"] == "dev"
