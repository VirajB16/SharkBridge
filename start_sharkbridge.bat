@echo off
title SharkBridge Launcher
color 0B

echo ==============================================================================
echo                      Starting SharkBridge Platform
echo ==============================================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/3] Starting Backend API Server (FastAPI on http://localhost:8000)...
start "SharkBridge - Backend (FastAPI)" cmd /k "cd /d "%ROOT_DIR%backend" && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting Frontend Dev Server (Vite on http://localhost:5173)...
start "SharkBridge - Frontend (Vite)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo ==============================================================================
echo                     SharkBridge is running successfully!
echo ==============================================================================
echo   - Frontend Application:   http://localhost:5173
echo   - Backend Swagger Docs:   http://localhost:8000/api/v1/docs
echo   - Backend Health Check:   http://localhost:8000/api/v1/health
echo ==============================================================================
echo.
echo Opening SharkBridge in your default browser...
start http://localhost:5173

echo.
echo Keep the backend and frontend terminal windows open while using SharkBridge.
echo To stop the application, simply close the respective terminal windows.
echo.
pause

