import pytest
from src.metier.profile_builder import build_profile, InvalidQuizAnswers


def test_build_profile_returns_text_niveau_and_domains():
    answers = {
        "q1": "tech", "q2": "pratique", "q3": "terminale", "q4": "developpement",
        "q5": "bureau", "q6": "mixte", "q7": "autonome", "q8": "fort",
        "q9": "expertise", "q10": "mobile",
    }
    text, niveau_max, domains = build_profile(answers)
    assert "tech" in text.lower() or "informatique" in text.lower()
    assert "terminale" in text
    assert niveau_max == 4
    assert "informatique, Internet" in domains


def test_build_profile_rejects_unknown_q1():
    with pytest.raises(InvalidQuizAnswers):
        build_profile({"q1": "nonsense", "q3": "terminale"})


def test_build_profile_rejects_missing_required():
    with pytest.raises(InvalidQuizAnswers):
        build_profile({"q1": "tech"})
