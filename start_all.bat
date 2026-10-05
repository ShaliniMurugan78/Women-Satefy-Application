@echo off
title Guardian AI - Full System Launcher
cd /d "%~dp0"
echo ====================================================
echo  Launching Women Safety AI Guardian Full Platform
echo ====================================================
echo.
echo [1/2] Starting Backend API Server (http://localhost:8000)...
start "Guardian AI Backend" run_backend.bat

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend UI (http://localhost:5173)...
start "Guardian AI Frontend" run_frontend.bat

echo.
echo System launched successfully!
echo Open your browser at: http://localhost:5173
echo.
pause
