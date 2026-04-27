"""One-shot scraper for ONISEP metier pages.

Usage (in Docker): docker compose run --rm backend python -m scripts.scrape
"""
from __future__ import annotations

import json
import re
import time
from html import unescape
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
from bs4 import BeautifulSoup


UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def parse_metier_html(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    description = ""
    h2_metier = soup.find("h2", string=re.compile(r"Le métier", re.I))
    if h2_metier:
        chunks = []
        for el in h2_metier.find_all_next():
            if el.name == "h2":
                break
            if el.name in ("h3", "p"):
                txt = el.get_text(" ", strip=True)
                if txt:
                    chunks.append(txt)
        description = "\n".join(chunks)
    description = unescape(description)

    def _value_for_label(label: str) -> str:
        """Find a label (in plain text or in a <strong>), return the associated value.

        ONISEP pages use two patterns:
          1. <div>Label : <strong>Value</strong></div>  (tag/callout style)
          2. <p><strong>Label :</strong> Value, Value, Value</p>  (synonymes / secteurs / centres)
        """
        rx = re.compile(label, re.I)

        # Pattern 1: a parent element whose text contains the label,
        # whose <strong> child is the value (label NOT inside the strong).
        for strong in soup.find_all("strong"):
            strong_text = strong.get_text(" ", strip=True)
            if rx.search(strong_text):
                continue  # this strong is the label itself, handled below
            parent = strong.parent
            if not parent:
                continue
            full_text = parent.get_text(" ", strip=True)
            if rx.search(full_text):
                return unescape(strong_text)

        # Pattern 2: <strong>Label :</strong> followed by sibling text.
        node = soup.find("strong", string=rx)
        if not node:
            # try with surrounding whitespace / newlines stripped
            for s in soup.find_all("strong"):
                if rx.search(s.get_text(" ", strip=True)):
                    node = s
                    break
        if not node:
            return ""
        out = []
        for sib in node.next_siblings:
            t = getattr(sib, "get_text", lambda *_: str(sib))(" ", strip=True)
            if t:
                out.append(t)
            if len(out) > 4:
                break
        return unescape(" ".join(out)).lstrip(":").strip()

    niveau_min = _value_for_label(r"Niveau minimum")
    statut = _value_for_label(r"^Statut")
    synonymes_raw = _value_for_label(r"Synonymes")
    secteurs_raw = _value_for_label(r"Secteurs professionnels")
    centres_raw = _value_for_label(r"Centres d.{0,3}intérêt")

    def _split(s: str) -> list[str]:
        return [p.strip() for p in re.split(r"[,;]\s*", s) if p.strip()]

    return {
        "description": description,
        "niveau_min": niveau_min,
        "statut": statut,
        "synonymes": _split(synonymes_raw),
        "secteurs": _split(secteurs_raw),
        "centres_interet": _split(centres_raw),
    }


def _met_id_from_url(url: str) -> str | None:
    m = re.search(r"MET\.\d+", url)
    return m.group(0) if m else None


def main() -> None:
    csv_path = DATA_DIR / "fiche_metiers.csv"
    out_path = DATA_DIR / "metiers_enriched.json"
    df = pd.read_csv(csv_path, sep=";")

    enriched: dict[str, Any] = {}
    if out_path.exists():
        enriched = json.loads(out_path.read_text())

    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as client:
        for i, row in df.iterrows():
            url = row.get("lien site onisep.fr") or row.get("lien onisep")
            libelle = row["libellé métier"]
            if not isinstance(url, str) or not url.startswith("http"):
                continue
            met_id = _met_id_from_url(url) or f"row_{i}"
            if met_id in enriched:
                continue

            try:
                r = client.get(url)
                r.raise_for_status()
            except Exception as e:
                print(f"[ERR] {libelle}: {e}")
                continue

            data = parse_metier_html(r.text)
            data["libelle"] = libelle
            data["lien_canonique"] = str(r.url)
            enriched[met_id] = data

            if i % 25 == 0:
                out_path.write_text(json.dumps(enriched, ensure_ascii=False, indent=2))
                print(f"[OK] {i}/{len(df)} {libelle}")

            time.sleep(1.0)

    out_path.write_text(json.dumps(enriched, ensure_ascii=False, indent=2))
    print(f"Done. {len(enriched)} metiers in {out_path}")


if __name__ == "__main__":
    main()
