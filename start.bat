@echo off
REM The Villa - local server launcher (Windows)
cd /d "%~dp0"
echo.
echo   The Villa is starting at http://localhost:8090
echo   Keep this window open while you play. Press Ctrl+C to stop.
echo.
start "" http://localhost:8090
python -m http.server 8090
