@echo off
chcp 65001 >nul
title Stop CursorPool API

echo.
echo ========================================================
echo       Stopping CursorPool API Servers
echo ========================================================
echo.

REM Kill Node.js processes running our servers
echo [INFO] Stopping all Node.js servers...
echo.

REM Kill by port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo Stopping process on port 8000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    echo Stopping process on port 8080 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Stopping process on port 3000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Stopping process on port 3001 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do (
    echo Stopping process on port 3002 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do (
    echo Stopping process on port 3003 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [SUCCESS] All servers stopped.
echo.
pause
