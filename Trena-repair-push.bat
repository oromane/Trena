@echo off
REM ============================================================
REM  Trena - Reparation index git corrompu + commit + push
REM  A executer sur Windows (les fichiers .git/index sont
REM  verrouilles par un process Windows, non reparables depuis
REM  le sandbox Linux de Cowork).
REM ============================================================
setlocal
cd /d C:\Projets\Trena

echo [1/5] Fermeture des process git residuels...
taskkill /F /IM git.exe >nul 2>&1

echo [2/5] Suppression du verrou et de l'index corrompu...
if exist ".git\index.lock" del /F /Q ".git\index.lock"
if exist ".git\index" del /F /Q ".git\index"

echo [3/5] Reconstruction de l'index depuis HEAD...
git reset
if errorlevel 1 (
  echo [ERREUR] Reset echoue. Un process tient encore le repo ^(editeur, appli Trena^).
  echo Ferme VS Code / l'appli Trena puis relance ce script.
  pause
  exit /b 1
)

echo [4/5] Etat du repository apres reparation :
git status --short

echo.
echo [5/5] Index repare. Verifie l'etat ci-dessus.
echo   - Ne committe PAS .env.example s'il contient de vraies cles ^(voir deploy/DEPLOY.md^).
echo   - Pour committer + pousser : lance ensuite Trena-push.bat
echo.
pause
endlocal
