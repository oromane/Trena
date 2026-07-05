@echo off
title Trena - Arret
cd /d "%~dp0"
echo Arret de la stack Trena...
docker compose stop
echo Conteneurs arretes. (Docker Desktop reste ouvert)
timeout /t 3 /nobreak >nul
exit
