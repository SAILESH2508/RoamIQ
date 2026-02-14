@echo off
echo ===================================================
echo   STOPPING ALL ROAMIQ SERVERS (Backend & Frontend)
echo ===================================================

:: Kill Python (Backend)
taskkill /F /IM python.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Python/Backend processes stopped.
) else (
    echo [INFO] No Python processes found.
)

:: Kill Node.js (Frontend)
taskkill /F /IM node.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Node.js/Frontend processes stopped.
) else (
    echo [INFO] No Node.js processes found.
)

echo.
echo ===================================================
echo   STARTING SERVERS FRESHLY
echo ===================================================

:: Start Backend in a new window
echo Starting Backend Server...
start "RoamIQ Backend" cmd /k "python run_backend.py"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in a new window
echo Starting Frontend Server...
cd frontend
start "RoamIQ Frontend" cmd /k "npm start"

echo.
echo [DONE] Both servers are launching in new windows.
pause
