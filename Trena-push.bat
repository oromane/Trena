@echo off
title Trena - Push GitHub
cd /d "%~dp0"

REM --- Git installe ? ---
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe. Telecharge-le : https://git-scm.com/download/win
    pause
    exit /b 1
)

REM --- Init du depot au premier lancement ---
if not exist ".git" (
    echo Initialisation du depot...
    git init -b main
    git remote add origin https://github.com/oromane/Trena.git
)

REM --- Verrou de securite : .env ne doit jamais partir ---
git check-ignore .env >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] .env n'est pas ignore par git - push annule pour proteger tes cles.
    pause
    exit /b 1
)

REM --- Commit + push ---
git add -A
git commit -m "Trena - maj du %date% %time:~0,5%"
if errorlevel 1 echo (Rien de nouveau a commiter)

echo Push vers github.com/oromane/Trena...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [ERREUR] Push refuse. Causes probables :
    echo   - Premiere fois : une fenetre GitHub aurait du s'ouvrir pour te connecter
    echo   - Le depot distant contient deja des fichiers ^(README cree sur GitHub^) :
    echo       git pull origin main --allow-unrelated-histories --no-rebase
    echo     puis relance ce script.
    pause
    exit /b 1
)

echo.
echo [OK] Pousse sur https://github.com/oromane/Trena
timeout /t 4 /nobreak >nul
exit
