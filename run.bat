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
echo ============================================================
echo   SERVER INFORMATION
echo ============================================================
echo.
echo   Server URL:  http://localhost:8000
echo   API Format:  Claude API v1 Compatible
echo   Status:      Starting...
echo.
echo ============================================================
echo   CONFIGURATION FOR IDE (Anthropic Compatible)
echo ============================================================
echo.
echo   Name (Ten):              Cursor
echo   Prefix:                  cursor
echo   Base URL:                http://localhost:8000
echo   API Key:                 [Generate after server starts]
echo   Model ID (optional):     claude-3-5-sonnet-20241022
echo.
echo ============================================================
echo   AVAILABLE ENDPOINTS
echo ============================================================
echo.
echo   POST /v1/messages        Create message
echo   POST /v1/complete        Legacy completions
echo   GET  /v1/models          List models
echo   POST /v1/keys            Generate API key
echo   GET  /health             Health check
echo.
echo ============================================================
echo   SUPPORTED MODELS
echo ============================================================
echo.
echo   - claude-3-5-sonnet-20241022  (Recommended)
echo   - claude-3-opus-20240229
echo   - claude-3-sonnet-20240229
echo   - claude-3-haiku-20240307
echo.
echo ============================================================
echo   HOW TO GET API KEY
echo ============================================================
echo.
echo   1. Wait for server to start
echo   2. Open new terminal and run:
echo      curl -X POST http://localhost:8000/v1/keys -H "Content-Type: application/json" -d "{\"name\":\"My Key\"}"
echo   3. Copy the API key from response
echo   4. Use it in your IDE configuration
echo.
echo ============================================================
echo   USAGE EXAMPLE
echo ============================================================
echo.
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
