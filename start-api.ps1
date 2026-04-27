# Lance l'API Moov'Up : Docker si dispo, sinon API démo Node (sans RAG / sans OpenRouter).
# Dans un 2e terminal : cd frontend ; npm run dev

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Demarrage backend + frontend (Docker)..." -ForegroundColor Green
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "docker compose a echoue. Verifie Docker Desktop." -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host ""
    Write-Host "OK (Docker). API http://localhost:8000 — Site http://localhost:5173" -ForegroundColor Green
    Write-Host "Copie backend\.env.example vers backend\.env (OPENROUTER_API_KEY, JWT_SECRET)." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host "Docker non disponible : demarrage de l'API **demo** Node (port 8787)." -ForegroundColor Yellow
Write-Host "Donnees factices — pour le vrai RAG + Gemini, installe Docker puis relance ce script." -ForegroundColor DarkGray
Write-Host "Assure-toi que frontend/.env.development contient VITE_API_URL=http://localhost:8787" -ForegroundColor Cyan
Write-Host "Puis dans un autre terminal : cd frontend ; npm run dev" -ForegroundColor Cyan
Write-Host ""
node scripts/dev-api.mjs
