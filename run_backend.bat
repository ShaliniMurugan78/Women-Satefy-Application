@echo off
title Guardian AI - Backend API (Port 8000)
cd /d "%~dp0"
echo Starting Women Safety Guardian AI Backend...
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
pause
