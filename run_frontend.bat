@echo off
title Guardian AI - Frontend UI (Port 5173)
cd /d "%~dp0frontend"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo Starting Women Safety Guardian AI Frontend...
call npm run dev -- --host 0.0.0.0
pause
