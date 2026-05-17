#!/usr/bin/env bash
set -exuo pipefailcd /root/tempo
git pull --ff-only
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
fi
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi
eval "${DC} -f docker-compose.yml build backend"
if [ ! -f backend/data/metiers.faiss ]; then
  echo "Building FAISS index..."
  eval "${DC} -f docker-compose.yml run --rm backend python scripts/build_index.py"
fi
eval "${DC} -f docker-compose.yml up -d --force-recreate"
eval "${DC} -f docker-compose.yml ps"
ok=0
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/api/health >/tmp/moovup-health.json; then
    echo "Backend health OK:"
    cat /tmp/moovup-health.json
    ok=1
    break
  fi
  echo "Waiting backend (${i}/30)..."
  sleep 10
done
if [ "${ok}" != 1 ]; then
  eval "${DC} -f docker-compose.yml logs backend --tail 120" || true
  exit 1
fi
