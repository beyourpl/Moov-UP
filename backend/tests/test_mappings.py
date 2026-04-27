import pandas as pd
from pathlib import Path
import pytest

from src.metier.mappings import (
    Q1_TO_ONISEP_DOMAINS, Q3_TO_NIVEAU_MAX,
    validate_mappings,
)


def test_q3_levels_cover_quiz_choices():
    expected = {"college", "seconde", "terminale", "bac", "bac2", "bac3", "bac5"}
    assert set(Q3_TO_NIVEAU_MAX.keys()) == expected


def test_q3_levels_are_valid_certif_levels():
    for v in Q3_TO_NIVEAU_MAX.values():
        assert 3 <= v <= 7


def test_q1_keys_cover_quiz_choices():
    expected = {"tech", "business", "creative", "sante", "education",
                "droit", "industrie", "batiment", "agriculture", "service"}
    assert set(Q1_TO_ONISEP_DOMAINS.keys()) == expected


def test_validate_mappings_passes_against_real_csv():
    csv = Path(__file__).resolve().parent.parent / "data" / "fiche_metiers.csv"
    if not csv.exists():
        pytest.skip("CSV not present in test env")
    df = pd.read_csv(csv, sep=";")
    validate_mappings(df)
