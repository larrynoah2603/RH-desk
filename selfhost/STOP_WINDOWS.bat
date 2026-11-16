@echo off
cd /d "%~dp0"
docker compose stop
echo RH Desk est arrete. Le volume de donnees reste conserve.
pause
