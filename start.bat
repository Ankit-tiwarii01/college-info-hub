@echo off
title College Info Hub Launcher
cd /d "%~dp0"
echo Starting College Info Hub...
echo.

if not exist "%~dp0backend\venv\Scripts\python.exe" (
  echo ERROR: Backend virtual environment was not found.
  echo Run setup_backend.bat first.
  pause
  exit /b 1
)

if not exist "%~dp0frontend\node_modules\.bin\vite.cmd" (
  echo ERROR: Frontend dependencies were not found.
  echo Run: cd frontend ^&^& npm install
  pause
  exit /b 1
)

echo [1/2] Starting Backend API...
start "College Hub - Backend" /D "%~dp0backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

echo [2/2] Starting Frontend App...
start "College Hub - Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo Both services have been launched in separate windows!
echo - Frontend Application: http://127.0.0.1:5173
echo - Backend API: http://127.0.0.1:8001
echo - API Documentation: http://127.0.0.1:8001/docs
echo.
pause
