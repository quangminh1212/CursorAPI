@echo off
chcp 65001 >nul
title CursorPool API - Claude API Adapter

cls
echo.
echo ============================================================
echo.
echo            CursorPool API - Claude API Adapter
echo.
echo ============================================================
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
echo   Server URL:  http://localhost:8000
echo   API Format:  Claude API v1 Compatible
echo   Status:      Starting...
echo.
echo ============================================================
echo.
echo   Available Endpoints:
echo   - POST /v1/messages      Create message
echo   - POST /v1/complete      Legacy completions
echo   - GET  /v1/models        List models
echo   - POST /v1/keys          Generate API key
echo   - GET  /health           Health check
echo.
echo ============================================================
echo.
echo   Usage Example:
echo   curl -X POST http://localhost:8000/v1/messages \
echo     -H "x-api-key: YOUR_API_KEY" \
echo     -H "Content-Type: application/json" \
echo     -d "{\"model\":\"claude-3-5-sonnet-20241022\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
echo.
echo ============================================================
echo.
echo   Press Ctrl+C to stop the server
echo.
echo ============================================================
echo.

node src/claude-api-adapter.js

echo.
echo.
echo ============================================================
echo   Server stopped
echo ============================================================
echo.
pause
