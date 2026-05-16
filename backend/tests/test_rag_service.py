import json
import faiss
import numpy as np
import pandas as pd
import pytest

from src.service.rag_service import RagService


@pytest.fixture
def fake_data(tmp_path, monkeypatch):
    meta = [
        {"libelle": "dev", "domaine_sous_domaine": "informatique, Internet/informatique",
         "sous_domaine_key": "informatique, Internet", "niveau_min": "bac+5",
         "description": "code", "centres_interet": [], "lien_onisep": "x"},
        {"libelle": "infirmier", "domaine_sous_domaine": "santé/santé",
         "sous_domaine_key": "santé", "niveau_min": "bac+3",
         "description": "soigne", "centres_interet": [], "lien_onisep": "y"},
    ]
    (tmp_path / "metiers_meta.json").write_text(json.dumps(meta))

    vecs = np.eye(2, 8, dtype="float32")
    idx = faiss.IndexFlatIP(8)
    idx.add(vecs)
    faiss.write_index(idx, str(tmp_path / "metiers.faiss"))

    pd.DataFrame([
        {
            "libellé formation principal": "Master Info",
            "libellé type formation": "master",
            "niveau de certification": 7,
            "libellé niveau de certification": "niveau 7",
            "niveau de sortie indicatif": "bac + 5",
            "durée": "2 ans",
            "URL et ID Onisep": "u1",
            "domaine/sous-domaine": "informatique, Internet/informatique",
        },
        {
            "libellé formation principal": "BTS SIO",
            "libellé type formation": "brevet de technicien supérieur",
            "niveau de certification": 5,
            "libellé niveau de certification": "niveau 5",
            "niveau de sortie indicatif": "bac + 2",
            "durée": "2 ans",
            "URL et ID Onisep": "u2",
            "domaine/sous-domaine": "informatique, Internet/informatique",
        },
    ]).to_csv(tmp_path / "fiche_formation.csv", sep=";", index=False)

    monkeypatch.setattr("src.service.rag_service.DATA_DIR", tmp_path)

    class FakeST:
        def __init__(self, *a, **k): pass
        def encode(self, texts, **k):
            return np.eye(len(texts), 8, dtype="float32")

    monkeypatch.setattr("src.service.rag_service.SentenceTransformer", FakeST)
    return tmp_path


def test_initial_recommendations_returns_top_metiers_with_filtered_formations(fake_data):
    svc = RagService()
    res = svc.initial_recommendations("profil dev", niveau_max=5, top_k=1)
    assert len(res) == 1
    assert res[0]["metier"]["libelle"] == "dev"
    levels = [f["niveau_certif"] for f in res[0]["formations"]]
    assert all(l <= 5 for l in levels)
    libs = [f["libelle"] for f in res[0]["formations"]]
    assert "BTS SIO" in libs
    assert "Master Info" not in libs
    bts = next(f for f in res[0]["formations"] if f["libelle"] == "BTS SIO")
    assert bts.get("resume")
    assert bts.get("niveau_sortie") or bts.get("niveau_label")


def test_search_for_message_uses_message_only(fake_data):
    svc = RagService()
    res = svc.search_for_message("question libre", niveau_max=7, top_k=2)
    assert {r["metier"]["libelle"] for r in res} == {"dev", "infirmier"}


def test_filter_by_q1_returns_only_matching_domain(fake_data, monkeypatch):
    monkeypatch.setattr(
        "src.service.rag_service.Q1_TO_ONISEP_DOMAINS",
        {"tech": ["informatique, Internet"]},
    )
    svc = RagService()
    res = svc.search_for_message("question libre", niveau_max=7, top_k=2, q1="tech")
    assert len(res) == 1
    assert res[0]["metier"]["libelle"] == "dev"


def test_filter_by_q1_with_no_match_returns_empty(fake_data, monkeypatch):
    monkeypatch.setattr(
        "src.service.rag_service.Q1_TO_ONISEP_DOMAINS",
        {"tech": ["nonexistent domain"]},
    )
    svc = RagService()
    res = svc.search_for_message("question libre", niveau_max=7, top_k=2, q1="tech")
    assert res == []


def test_formations_filtered_by_sous_domain_overlap(fake_data, monkeypatch):
    meta = [
        {
            "libelle": "cascadeur",
            "domaine_sous_domaine": "arts, culture, artisanat/arts du spectacle",
            "sous_domaine_key": "arts, culture, artisanat/arts du spectacle",
            "niveau_min": "bac",
            "description": "stunt",
            "centres_interet": [],
            "lien_onisep": "x",
        },
    ]
    (fake_data / "metiers_meta.json").write_text(json.dumps(meta))
    pd.DataFrame([
        {
            "libellé formation principal": "jeu d'acteur",
            "niveau de certification": 5,
            "libellé niveau de certification": "niveau 5",
            "durée": "2 ans",
            "URL et ID Onisep": "u1",
            "domaine/sous-domaine": "arts, culture, artisanat/arts du spectacle",
        },
        {
            "libellé formation principal": "bachelor dev jeu vidéo",
            "niveau de certification": 6,
            "libellé niveau de certification": "niveau 6",
            "durée": "3 ans",
            "URL et ID Onisep": "u2",
            "domaine/sous-domaine": "arts, culture, artisanat/arts graphiques | informatique, Internet/développement, programmation, logiciel",
        },
        {
            "libellé formation principal": "études professionnelles en danse",
            "niveau de certification": 5,
            "libellé niveau de certification": "niveau 5",
            "durée": "2 ans",
            "URL et ID Onisep": "u3",
            "domaine/sous-domaine": "arts, culture, artisanat/arts du spectacle",
        },
    ]).to_csv(fake_data / "fiche_formation.csv", sep=";", index=False)

    class FakeST:
        def __init__(self, *a, **k):
            pass

        def encode(self, texts, **k):
            return np.ones((len(texts), 8), dtype="float32")

    monkeypatch.setattr("src.service.rag_service.SentenceTransformer", FakeST)
    svc = RagService()
    res = svc.initial_recommendations("profil spectacle", niveau_max=7, top_k=1)
    libs = [f["libelle"] for f in res[0]["formations"]]
    assert "jeu d'acteur" in libs
    assert "bachelor dev jeu vidéo" not in libs


def test_journalisme_specialty_guarantees_journaliste_in_top(fake_data, monkeypatch):
    meta = [
        {
            "libelle": "graphiste",
            "domaine_sous_domaine": "arts, culture, artisanat/arts graphiques",
            "sous_domaine_key": "arts, culture, artisanat/arts graphiques",
            "niveau_min": "bac",
            "description": "visuel",
            "centres_interet": [],
            "lien_onisep": "x",
        },
        {
            "libelle": "journaliste",
            "domaine_sous_domaine": "information-communication, audiovisuel/journalisme, édition, publicité",
            "sous_domaine_key": "information-communication, audiovisuel/journalisme, édition, publicité",
            "niveau_min": "bac+3",
            "description": "presse information",
            "centres_interet": [],
            "lien_onisep": "y",
        },
    ]
    (fake_data / "metiers_meta.json").write_text(json.dumps(meta))
    vecs = np.array([[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]], dtype="float32")
    idx = faiss.IndexFlatIP(8)
    idx.add(vecs)
    faiss.write_index(idx, str(fake_data / "metiers.faiss"))

    class FakeST:
        def __init__(self, *a, **k):
            pass

        def encode(self, texts, **k):
            return np.array([[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]], dtype="float32")

    monkeypatch.setattr("src.service.rag_service.SentenceTransformer", FakeST)
    monkeypatch.setattr(
        "src.service.rag_service.Q1_TO_ONISEP_DOMAINS",
        {"creative": ["arts, culture, artisanat", "information-communication, audiovisuel"]},
    )
    svc = RagService()
    res = svc.initial_recommendations(
        "profil créatif design", niveau_max=7, top_k=1, q1="creative", specialty="journalisme",
    )
    assert len(res) == 1
    assert res[0]["metier"]["libelle"] == "journaliste"


def test_filter_with_unknown_q1_falls_back_to_full_search(fake_data, monkeypatch):
    monkeypatch.setattr(
        "src.service.rag_service.Q1_TO_ONISEP_DOMAINS",
        {"tech": ["informatique, Internet"]},
    )
    svc = RagService()
    res = svc.search_for_message("question libre", niveau_max=7, top_k=2, q1="unknown_key")
    assert {r["metier"]["libelle"] for r in res} == {"dev", "infirmier"}
