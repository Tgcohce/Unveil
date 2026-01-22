@echo off
echo Stopping any running servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM tsx.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting API server with fresh database...
start "UNVEIL API" cmd /k "npm run api"

timeout /t 5 /nobreak >nul

echo Starting dashboard...
start "UNVEIL Dashboard" cmd /k "npm run dashboard"

echo.
echo ========================================
echo UNVEIL is starting!
echo ========================================
echo API Server: http://localhost:3002
echo Dashboard:  http://localhost:3001
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
