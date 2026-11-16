@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo RH Desk - Edition locale auto-hebergee
echo ==========================================
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker est introuvable. Installez et lancez Docker Desktop.
  pause
  exit /b 1
)
docker compose version >nul 2>nul
if errorlevel 1 (
  echo Docker Compose est indisponible. Verifiez Docker Desktop.
  pause
  exit /b 1
)
if not exist ".env" (
  echo Premiere installation : creation du compte administrateur local...
  where node >nul 2>nul
  if errorlevel 1 (
    docker run --rm -it -v "%cd%:/config" -w /config node:22-alpine node setup.mjs
  ) else (
    node setup.mjs
  )
  if errorlevel 1 (
    echo Initialisation interrompue.
    pause
    exit /b 1
  )
)
echo Demarrage de RH Desk avec stockage local...
docker compose up --build -d
if errorlevel 1 (
  echo Echec du lancement. Consultez les journaux Docker.
  pause
  exit /b 1
)
docker compose ps
echo.
echo Adresse : http://localhost:3000
echo Attendez le statut healthy, puis actualisez la page si necessaire.
start "" "http://localhost:3000"
pause
