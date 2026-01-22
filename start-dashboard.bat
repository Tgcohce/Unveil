@echo off
echo.
echo ========================================
echo   UNVEIL Dashboard Startup
echo ========================================
echo.
echo Starting API server and dashboard...
echo.

REM Start API server in new window
start "UNVEIL API" cmd /k "npx tsx src/api/server.ts"

timeout /t 3 /nobreak >nul

REM Start dashboard
cd src\dashboard
start "UNVEIL Dashboard" cmd /k "npm run dev"

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo   API Server: http://localhost:3005
echo   Dashboard:  http://localhost:3001
echo.
echo   Press Ctrl+C in each window to stop
echo ========================================
echo.
pause
