@echo off
REM UNVEIL Startup Script for Windows
REM Runs API server and Dashboard with ShadowWire integration

echo.
echo ================================================
echo    UNVEIL - ShadowWire Integration
echo ================================================
echo.

REM Start API Server
echo Starting API Server on port 3005...
start "UNVEIL API" cmd /k "npx tsx src/api/server.ts"
timeout /t 5 /nobreak >nul

REM Test API
echo Testing API connection...
curl -s http://localhost:3005/api/stats >nul 2>&1
if %errorlevel% equ 0 (
    echo [32mAPI Server is running![0m
) else (
    echo [31mAPI Server failed to start[0m
    pause
    exit /b 1
)

REM Start Dashboard
echo.
echo Starting Dashboard...
start "UNVEIL Dashboard" cmd /k "cd src\dashboard && npm run dev"

echo.
echo ================================================
echo UNVEIL is running!
echo ================================================
echo.
echo API Server: http://localhost:3005
echo   - /api/stats
echo   - /api/compare (all 3 protocols)
echo   - /api/shadowwire/analysis
echo.
echo Dashboard: http://localhost:3000-3002
echo   (Check the Dashboard window for exact port)
echo.
echo Available Protocols:
echo   1. Privacy Cash (Purple) - 16/100 score
echo   2. Confidential Transfers (Blue) - 0%% adoption
echo   3. ShadowWire (Green) - 0 transactions
echo.
echo ================================================
echo.
echo Press any key to stop all servers...
pause >nul

REM Kill servers
taskkill /FI "WindowTitle eq UNVEIL API*" /F >nul 2>&1
taskkill /FI "WindowTitle eq UNVEIL Dashboard*" /F >nul 2>&1

echo.
echo Servers stopped.
echo.
