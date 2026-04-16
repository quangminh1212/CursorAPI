@echo off
chcp 65001 >nul
title CursorPool API - Server Manager

:menu
cls
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         CursorPool API - Server Manager              ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo  Chọn server để chạy:
echo.
echo  1. Claude API Adapter (Port 8000) - RECOMMENDED
echo  2. Token Service (Port 8080)
echo  3. Token API Server (Port 3002)
echo  4. VIP Pool API (Port 3001)
echo  5. Switch API (Port 3003)
echo  6. Chat Emulator (Port 3000)
echo.
echo  7. Show Tokens
echo  8. Run Tests
echo  9. Run Examples
echo.
echo  0. Exit
echo.
echo ═══════════════════════════════════════════════════════
echo.
set /p choice="Nhập lựa chọn (0-9): "

if "%choice%"=="1" goto claude_adapter
if "%choice%"=="2" goto token_service
if "%choice%"=="3" goto token_api
if "%choice%"=="4" goto vip_pool
if "%choice%"=="5" goto switch_api
if "%choice%"=="6" goto emulator
if "%choice%"=="7" goto show_tokens
if "%choice%"=="8" goto run_tests
if "%choice%"=="9" goto run_examples
if "%choice%"=="0" goto end

echo.
echo ❌ Lựa chọn không hợp lệ!
timeout /t 2 >nul
goto menu

:claude_adapter
cls
echo.
echo 🚀 Đang khởi động Claude API Adapter...
echo.
node claude-api-adapter.js
pause
goto menu

:token_service
cls
echo.
echo 🚀 Đang khởi động Token Service...
echo.
node cursor-token-service.js
pause
goto menu

:token_api
cls
echo.
echo 🚀 Đang khởi động Token API Server...
echo.
node cursor-token-api-server.js
pause
goto menu

:vip_pool
cls
echo.
echo 🚀 Đang khởi động VIP Pool API...
echo.
node vip-pool-api-server.js
pause
goto menu

:switch_api
cls
echo.
echo 🚀 Đang khởi động Switch API...
echo.
node cursorpool-switch-api.js
pause
goto menu

:emulator
cls
echo.
echo 🚀 Đang khởi động Chat Emulator...
echo.
node cursor-api-emulator.js
pause
goto menu

:show_tokens
cls
echo.
echo 🔑 Hiển thị Tokens...
echo.
node show-tokens.js
echo.
pause
goto menu

:run_tests
cls
echo.
echo 🧪 Đang chạy tests...
echo.
node test-claude-api.js
echo.
pause
goto menu

:run_examples
cls
echo.
echo 💡 Đang chạy examples...
echo.
node example-claude-api.js
echo.
pause
goto menu

:end
echo.
echo Tạm biệt!
exit /b 0
