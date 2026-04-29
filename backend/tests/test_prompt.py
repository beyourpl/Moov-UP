from src.metier.prompt import build_prompt, sanitize_chat_reply, SYSTEM_PROMPT


def test_build_prompt_returns_system_then_user():
    rag = [{
        "metier": {"libelle": "dev", "domaine_sous_domaine": "info", "niveau_min": "bac+5",
                   "description": "code", "centres_interet": ["logique"], "lien_onisep": "u"},
        "formations": [{"libelle": "BTS SIO", "niveau_label": "niveau 5", "duree": "2 ans", "lien": "f"}],
    }]
    history = [{"role": "user", "content": "salut"}, {"role": "assistant", "content": "bonjour"}]
    msgs = build_prompt("Profil X", history, rag, "Quels métiers ?")
    assert msgs[0]["role"] == "system"
    assert "Moov'Coach" in msgs[0]["content"]
    assert msgs[1]["role"] == "user"
    body = msgs[1]["content"]
    assert "Profil X" in body
    assert "dev" in body
    assert "BTS SIO" in body
    assert "salut" in body and "bonjour" in body
    assert "Quels métiers ?" in body


def test_user_block_orders_history_before_rag_context():
    """Le LLM doit lire le fil conversationnel AVANT de croiser avec les sources."""
    rag = [{
        "metier": {"libelle": "dev", "domaine_sous_domaine": "info", "niveau_min": "bac+5",
                   "description": "code", "centres_interet": [], "lien_onisep": "u"},
        "formations": [],
    }]
    history = [{"role": "user", "content": "MARQUEUR_HISTORIQUE"}]
    msgs = build_prompt("Profil X", history, rag, "Question Y")
    body = msgs[1]["content"]
    history_pos = body.index("MARQUEUR_HISTORIQUE")
    rag_pos = body.index("dev")
    assert history_pos < rag_pos, (
        f"Historique (pos {history_pos}) doit apparaitre avant RAG context (pos {rag_pos})"
    )


def test_sanitize_chat_reply_strips_onisep_boilerplate_and_urls():
    raw = (
        "Voici un métier intéressant.\n\n"
        "Pour plus de détails sur les missions de ce métier, tu peux consulter sa fiche : "
        "https://www.onisep.fr/http/redirection/metier/slug/MET.360\n"
    )
    out = sanitize_chat_reply(raw)
    assert "onisep.fr" not in out.lower()
    assert "pour plus de" not in out.lower()
    assert "Voici un métier" in out


    """Verifie que le system prompt contient les regles cles de continuite."""
    expected_keywords = [
        "Historique",          # mention explicite de la section
        "implicite",           # gestion des references implicites
        "bruit",               # consigne d'ignorer le hors-sujet
        "clarification",       # demander une clarification si ambigu
    ]
    for kw in expected_keywords:
        assert kw.lower() in SYSTEM_PROMPT.lower(), f"Mot-cle manquant dans SYSTEM_PROMPT: {kw!r}"
