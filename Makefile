.PHONY: scrape index dev test up down logs build dev-api

build:
	docker compose build

# API démo locale (Node, sans Docker) — port 8787. Avec frontend : npm run dev dans ./frontend
dev-api:
	node scripts/dev-api.mjs

scrape:
	docker compose run --rm backend python -m scripts.scrape

index:
	docker compose run --rm backend python -m scripts.build_index

dev: up

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f backend frontend

test:
	docker compose run --rm backend pytest -v
