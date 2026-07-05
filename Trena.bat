@echo off
title Trena - Adaptive Training System
cd /d "%~dp0"

echo.
echo   ===== Trena - Adaptive Training System =====
echo.

REM --- 1. Docker Desktop demarre ? Sinon on le lance ---
docker info >nul 2>&1
if errorlevel 1 (
    echo   Demarrage de Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo   Attente de Docker ^(peut prendre 30-60s^)...
    :waitdocker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto waitdocker
)
echo   [OK] Docker operationnel

REM --- 2. Demarrage de la stack ---
echo   Demarrage des conteneurs...
docker compose up -d
if errorlevel 1 (
    echo.
    echo   [ERREUR] docker compose a echoue - voir message ci-dessus.
    pause
    exit /b 1
)
echo   [OK] Conteneurs demarres

REM --- 3. Attente du frontend puis ouverture du navigateur ---
echo   Attente du site ^(localhost:3000^)...
set /a tries=0
:waitweb
timeout /t 2 /nobreak >nul
set /a tries+=1
if %tries% gtr 60 (
    echo   [ERREUR] Le site ne repond pas apres 2 minutes.
    echo   Consulte les logs : docker compose logs frontend
    pause
    exit /b 1
)
curl -s -o nul --max-time 2 http://localhost:3000
if errorlevel 1 goto waitweb

echo   [OK] Site pret - ouverture du navigateur
start "" http://localhost:3000
timeout /t 2 /nobreak >nul
exit
