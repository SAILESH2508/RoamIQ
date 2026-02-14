@echo off
echo ========================================
echo Restarting RoamIQ Backend with Multi-Provider AI
echo ========================================
echo.
echo Stopping existing backend...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq python run_backend.py*" 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting backend with updated configuration...
echo.
python run_backend.py
