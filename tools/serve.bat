@echo off
rem Double-click to serve the game at http://localhost:8000. Close this window to stop it.
cd /d "%~dp0"
py -3 --version >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py
) else (
  python serve.py
)
echo.
pause
