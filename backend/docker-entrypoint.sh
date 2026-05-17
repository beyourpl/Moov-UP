#!/bin/sh
set -e
echo "[moovup] Vérification import application…"
python -c "from src.main import app; print('[moovup] import OK')"
echo "[moovup] Démarrage uvicorn…"
exec uvicorn src.main:app --host 0.0.0.0 --port 8000
