from pathlib import Path
import pytest

from scripts.scrape import parse_metier_html


def test_parse_extracts_description_and_meta():
    fixture = Path(__file__).parent / "fixtures" / "onisep_aes.html"
    if not fixture.exists() or fixture.stat().st_size < 1000:
        pytest.skip("fixture not available")
    html = fixture.read_text()
    out = parse_metier_html(html)
    assert "publics divers" in out["description"].lower() or "vulnérables" in out["description"].lower()
    assert any("contact" in c.lower() or "utile" in c.lower() for c in out["centres_interet"])
    assert "CAP" in out["niveau_min"] or "équivalent" in out["niveau_min"].lower()
