@echo off
chcp 65001 >nul
title Claude API Adapter Server

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║       Claude API Adapter - Quick Launcher            ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Kiểm tra Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js chưa được cài đặt!
    echo.
    echo Vui lòng cài đặt Node.js từ: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Kiểm tra token file
if not exist "%USERPROFILE%\.codex_cursor" (
    echo ⚠️  Cảnh báo: Token file không tồn tại!
    echo.
    echo File: %USERPROFILE%\.codex_cursor
    echo.
    echo Vui lòng chạy CursorPool extension để tạo token.
    echo.
    echo Bạn có muốn tiếp tục? (Y/N)
    set /p continue=
    if /i not "%continue%"=="Y" exit /b 1
)

REM Kiểm tra dependencies
if not exist "node_modules" (
    echo 📦 Đang cài đặt dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Cài đặt dependencies thất bại!
        pause
        exit /b 1
    )
    echo.
    echo ✅ Dependencies đã được cài đặt!
    echo.
)

echo 🚀 Đang khởi động Claude API Adapter...
echo.
echo Server sẽ chạy tại: http://localhost:8000
echo.
echo Nhấn Ctrl+C để dừng server
echo.
echo ═══════════════════════════════════════════════════════
echo.

REM Chạy server
node claude-api-adapter.js

REM Nếu server dừng
echo.
echo.
echo Server đã dừng.
pause
