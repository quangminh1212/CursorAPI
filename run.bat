@echo off
chcp 65001 >nul
title CursorPool API - Quick Start

echo.
echo ========================================================
echo       CursorPool API - Quick Start
echo ========================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed!
    echo.
)

echo [INFO] Starting Claude API Adapter...
echo.
echo Server: http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo.
echo ========================================================
echo.

node src/claude-api-adapter.js

echo.
echo Server stopped.
pause
