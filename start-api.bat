@echo off
echo Starting UNVEIL API Server...
cd /d "%~dp0"
npx tsx src/api/server.ts
