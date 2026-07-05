@echo off
REM ============================================================================
REM Trena-push.bat - Automatisation push GitHub
REM Utilisation: Trena-push.bat [message_commit] [branche]
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM --- Configuration par défaut ---
set "COMMIT_MSG=%~1"
set "BRANCH=%~2"
set "LOG_FILE=push_trena_%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"

if "!COMMIT_MSG!"=="" (
    set "COMMIT_MSG=Update: Trena project - %date% %time%"
)

if "!BRANCH!"=="" (
    set "BRANCH=main"
)

REM --- Initialisation log ---
echo [%date% %time%] === Demarrage push Trena === >> "!LOG_FILE!"
echo Commit: !COMMIT_MSG! >> "!LOG_FILE!"
echo Branche cible: !BRANCH! >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

REM --- Affichage console ---
cls
echo.
echo ========================================
echo  TRENA - Push GitHub
echo ========================================
echo Branche: !BRANCH!
echo Message: !COMMIT_MSG!
echo Log: !LOG_FILE!
echo.

REM --- Verifier git disponible ---
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe ou pas dans PATH
    echo [ERREUR] Git n'est pas installe ou pas dans PATH >> "!LOG_FILE!"
    pause
    exit /b 1
)

REM --- Verifier repo git ---
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Ce repertoire n'est pas un repository Git
    echo [ERREUR] Initialisation Git requise
    echo [ERREUR] Ce repertoire n'est pas un repository Git >> "!LOG_FILE!"
    pause
    exit /b 1
)

REM --- Afficher status ---
echo [INFO] Status actuel du repository:
echo [INFO] Status actuel du repository: >> "!LOG_FILE!"
git status --short
git status --short >> "!LOG_FILE!"
echo.

REM --- Stage tous les fichiers ---
echo [PROCESS] Ajout des fichiers (git add -A)...
git add -A
if errorlevel 1 (
    echo [ERREUR] Echec add
    echo [ERREUR] Echec git add -A >> "!LOG_FILE!"
    pause
    exit /b 1
)
echo [OK] Fichiers ajoutes
echo [OK] Fichiers ajoutes >> "!LOG_FILE!"

REM --- Verifier s'il y a des changes ---
git diff-index --quiet --cached HEAD >nul 2>&1
if errorlevel 1 (
    echo [INFO] Aucune modification a commiter
    echo [INFO] Repository a jour
    echo [INFO] Aucune modification a commiter >> "!LOG_FILE!"
    pause
    exit /b 0
)

REM --- Commit ---
echo [PROCESS] Creation du commit...
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo [ERREUR] Echec commit
    echo [ERREUR] Echec commit >> "!LOG_FILE!"
    pause
    exit /b 1
)
echo [OK] Commit cree
echo [OK] Commit cree >> "!LOG_FILE!"

REM --- Push ---
echo [PROCESS] Push vers origin/!BRANCH!...
git push origin !BRANCH!
if errorlevel 1 (
    echo [ERREUR] Echec push
    echo [ERREUR] Verifiez votre connexion et droits d'acces
    echo [ERREUR] Echec push vers origin/!BRANCH! >> "!LOG_FILE!"
    pause
    exit /b 1
)
echo [OK] Push complete
echo [OK] Push vers origin/!BRANCH! complete >> "!LOG_FILE!"

REM --- Afficher log commit ---
echo.
echo [INFO] Dernier commit:
echo [INFO] Dernier commit: >> "!LOG_FILE!"
git log -1 --pretty=format:"%%h - %%s (%%ar)"
git log -1 --pretty=format:"%%h - %%s (%%ar)" >> "!LOG_FILE!"
echo.
echo.

echo ========================================
echo  SUCCESS - Push termine avec succes
echo ========================================
echo [%date% %time%] === Push termine avec succes === >> "!LOG_FILE!"
echo.
pause
endlocal
exit /b 0
