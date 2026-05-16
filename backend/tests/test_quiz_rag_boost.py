from src.metier.quiz_rag_boost import quiz_answers_score_boost


def test_activity_resoudre_tech_boosts_developer_metier():
    metier = {
        "libelle": "développeur / développeuse informatique",
        "description": "Concevoir et coder des applications",
    }
    qa = {"q1": "tech", "activity": "resoudre-tech", "q3": "terminale"}
    assert quiz_answers_score_boost(metier, qa) > 0.05


def test_activity_resoudre_tech_low_boost_for_nurse():
    metier = {
        "libelle": "infirmier / infirmière",
        "description": "Soigner des patients",
    }
    qa = {"q1": "tech", "activity": "resoudre-tech", "q3": "terminale"}
    assert quiz_answers_score_boost(metier, qa) < 0.03
