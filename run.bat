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
echo   Choose startup mode:
echo.
echo   1. Normal Mode (Show window)
echo   2. Hidden Mode (Run in background/tray)
echo.
set /p MODE="Enter choice (1 or 2): "

if "%MODE%"=="2" goto hidden_mode

:normal_mode
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

REM Start server in background
start /B node src/claude-api-adapter.js > nul 2>&1

REM Wait for server to start
echo [INFO] Waiting for server to start...
timeout /t 3 /nobreak >nul

REM Generate API key
echo [INFO] Generating API key...
echo.

for /f "delims=" %%i in ('curl -s -X POST http://localhost:8000/v1/keys -H "Content-Type: application/json" -d "{\"name\":\"Auto-Generated Key\"}"') do set API_RESPONSE=%%i

REM Extract API key from response - improved parsing
echo %API_RESPONSE% > temp_key.txt
for /f "tokens=2 delims=:" %%a in ('findstr "api_key" temp_key.txt') do (
    set API_KEY_RAW=%%a
)
REM Remove quotes and comma
set API_KEY=%API_KEY_RAW:"=%
set API_KEY=%API_KEY:,=%
set API_KEY=%API_KEY: =%
del temp_key.txt

cls
echo.
echo ============================================================
echo.
echo            CursorPool API - Claude API Adapter
echo.
echo ============================================================
echo.
echo ============================================================
echo   SERVER INFORMATION
echo ============================================================
echo.
echo   Server URL:  http://localhost:8000
echo   API Format:  Claude API v1 Compatible
echo   Status:      RUNNING
echo.
echo ============================================================
echo   CONFIGURATION FOR IDE (Anthropic Compatible)
echo ============================================================
echo.
echo   Name (Ten):              Cursor
echo   Prefix:                  cursor
echo   Base URL:                http://localhost:8000
echo   API Key:                 %API_KEY%
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
echo   USAGE EXAMPLE
echo ============================================================
echo.
echo   curl -X POST http://localhost:8000/v1/messages \
echo     -H "x-api-key: %API_KEY%" \
echo     -H "Content-Type: application/json" \
echo     -d "{\"model\":\"claude-3-5-sonnet-20241022\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
echo.
echo ============================================================
echo.
echo   Server is running. Press Ctrl+C to stop.
echo.
echo ============================================================
echo.

REM Keep window open and wait for Ctrl+C
pause >nul

REM This won't be reached unless user closes window
echo.
echo.
echo ============================================================
echo   Server stopped
echo ============================================================
echo.
pause
exit /b 0

:hidden_mode
cls
echo.
echo ============================================================
echo.
echo            CursorPool API - Hidden Mode
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

echo [INFO] Starting server in hidden mode...
echo.

REM Start server completely hidden
start /MIN cmd /c "node src/claude-api-adapter.js > nul 2>&1"

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Generate API key
for /f "delims=" %%i in ('curl -s -X POST http://localhost:8000/v1/keys -H "Content-Type: application/json" -d "{\"name\":\"Auto-Generated Key\"}"') do set API_RESPONSE=%%i

REM Extract API key
echo %API_RESPONSE% > temp_key.txt
for /f "tokens=2 delims=:" %%a in ('findstr "api_key" temp_key.txt') do set API_KEY_RAW=%%a
for /f "tokens=1 delims=," %%b in ("%API_KEY_RAW%") do set API_KEY=%%b
set API_KEY=%API_KEY:"=%
del temp_key.txt

REM Save API key to file for later reference
echo API Key: %API_KEY% > api-key-current.txt
echo Server URL: http://localhost:8000 >> api-key-current.txt
echo Status: Running in background >> api-key-current.txt
echo. >> api-key-current.txt
echo To stop server, run: stop.bat >> api-key-current.txt

cls
echo.
echo ============================================================
echo.
echo            Server Started in Hidden Mode
echo.
echo ============================================================
echo.
echo   Status:      Running in background
echo   Server URL:  http://localhost:8000
echo   API Key:     %API_KEY%
echo.
echo   Configuration saved to: api-key-current.txt
echo.
echo ============================================================
echo.
echo   To stop server: run stop.bat
echo.
echo ============================================================
echo.
echo   This window will close in 10 seconds...
echo.

timeout /t 10 /nobreak
exit /b 0
