@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║          CURSOR ACCESS TOKENS EXTRACTOR              ║
echo ╚══════════════════════════════════════════════════════╝
echo.

set "DB_PATH=%APPDATA%\Cursor\User\globalStorage\state.vscdb"

if not exist "%DB_PATH%" (
    echo ❌ Không tìm thấy Cursor database
    echo.
    pause
    exit /b 1
)

echo 📁 Database: %DB_PATH%
for %%A in ("%DB_PATH%") do echo 📊 File size: %%~zA bytes
echo.
echo 🔍 Đang extract tokens...
echo.

REM Tạo Node.js script với path đúng
set "SCRIPT=%TEMP%\cursor_extract.js"
set "DB_ESCAPED=%DB_PATH:\=\\%"

(
echo const fs = require('fs'^);
echo const dbPath = '%DB_ESCAPED%';
echo try {
echo   const data = fs.readFileSync(dbPath^);
echo   const content = data.toString('utf8', 0, data.length^);
echo   const pattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
echo   const tokens = content.match(pattern^);
echo   if (tokens^) {
echo     const unique = [...new Set(tokens^)];
echo     unique.slice(0, 3^).forEach((token, idx^) =^> {
echo       console.log('╔═══════════════════════════════════════════════════════════════════════════════╗'^);
echo       console.log('║ TOKEN ' + (idx + 1^) + '                                                                       ║'^);
echo       console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\\n'^);
echo       console.log(token + '\\n'^);
echo       try {
echo         const parts = token.split('.'^);
echo         const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+'^).replace(/_/g, '/'^), 'base64'^).toString(^)^);
echo         console.log('👤 User: ' + (payload.sub ^|^| 'N/A'^)^);
echo         if (payload.exp^) {
echo           const expDate = new Date(payload.exp * 1000^);
echo           const now = new Date(^);
echo           const status = expDate ^> now ? '(VALID^)' : '(EXPIRED^)';
echo           console.log('⏰ Expires: ' + expDate.toISOString(^) + ' ' + status^);
echo         }
echo         console.log(''^);
echo       } catch (e^) {}
echo     }^);
echo     console.log('═══════════════════════════════════════════════════════════════════════════════════\\n'^);
echo     console.log('✅ Tìm thấy ' + unique.length + ' token(s^) (hiển thị tối đa 3^)\\n'^);
echo   } else {
echo     console.log('❌ Không tìm thấy JWT token nào\\n'^);
echo   }
echo } catch (e^) {
echo   console.error('❌ Lỗi:', e.message^);
echo }
) > "%SCRIPT%"

node "%SCRIPT%"

if errorlevel 1 (
    echo.
    echo ❌ Lỗi khi chạy script. Đảm bảo Node.js đã được cài đặt.
    echo.
)

del "%SCRIPT%" 2>nul

echo.
pause
