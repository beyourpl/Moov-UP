from src.metier.formation_info import build_formation_resume, formation_row_from_csv


def test_formation_row_from_csv_builds_resume():
    row = {
        "libellé formation principal": "BTS services informatiques aux organisations",
        "libellé type formation": "brevet de technicien supérieur",
        "niveau de certification": 5,
        "libellé niveau de certification": "niveau 5",
        "niveau de sortie indicatif": "bac + 2",
        "durée": "2 ans",
        "URL et ID Onisep": "https://www.onisep.fr/example",
        "domaine/sous-domaine": "informatique, Internet/informatique",
    }
    f = formation_row_from_csv(row, ["informatique, Internet/informatique"])
    assert f["libelle"].startswith("BTS")
    assert f["type_formation"] == "brevet de technicien supérieur"
    assert f["niveau_sortie"] == "bac + 2"
    assert f["domain_label"] == "informatique"
    assert "bac + 2" in f["resume"]
    assert "2 ans" in f["resume"]


def test_build_formation_resume_fallback():
    f = {
        "niveau_label": "niveau 5",
        "duree": "2 ans",
        "niveau_certif": 5,
    }
    resume = build_formation_resume(f)
    assert "2 ans" in resume
