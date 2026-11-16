@echo off
rem Double-click to pull the published Google Sheets into data\*.csv and data\narrative\*.csv (M2j section 5, M5a section 1.1).
cd /d "%~dp0"
py -3 --version >nul 2>nul
if %errorlevel%==0 (
  py -3 pull_sheet.py
) else (
  python pull_sheet.py
)
echo.
pause
