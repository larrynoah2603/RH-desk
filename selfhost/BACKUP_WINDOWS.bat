@echo off
setlocal
cd /d "%~dp0"
if not exist "backups" mkdir "backups"
for /f "tokens=1-4 delims=/ " %%a in ("%DATE%") do set today=%%a-%%b-%%c
docker compose cp rh-desk:/data/workspace.json "backups\rhdesk-backup-%RANDOM%-%RANDOM%.json"
if errorlevel 1 (
  echo Sauvegarde echouee. Verifiez que le service est demarre.
) else (
  echo Sauvegarde creee dans le dossier backups.
  echo ATTENTION : ce fichier peut contenir des donnees confidentielles.
)
pause
