@echo off
chcp 65001 >nul
title Claude API - Test & Examples

:menu
cls
echo.
echo ========================================================
echo         Claude API - Test & Examples
echo ========================================================
echo.
echo  1. Run Test Suite (10 tests)
echo  2. Run JavaScript Examples
echo  3. Run Python Examples
echo  4. Show Tokens
echo  5. Check Health
echo  6. List Models
echo  7. Create API Key
echo.
echo  0. Back to Main Menu
echo.
echo ========================================================
echo.
set /p choice="Enter choice (0-7): "

if "%choice%"=="1" goto run_tests
if "%choice%"=="2" goto run_js_examples
if "%choice%"=="3" goto run_py_examples
if "%choice%"=="4" goto show_tokens
if "%choice%"=="5" goto check_health
if "%choice%"=="6" goto list_models
if "%choice%"=="7" goto create_key
if "%choice%"=="0" goto end

echo.
echo [ERROR] Invalid choice!
timeout /t 2 >nul
goto menu

:run_tests
cls
echo.
echo ========================================================
echo              Running Test Suite
echo ========================================================
echo.
echo [WARNING] Make sure server is running at http://localhost:8000
echo.
timeout /t 3 >nul
cd /d "%~dp0.."
node examples/test-claude-api.js
echo.
pause
goto menu

:run_js_examples
cls
echo.
echo ========================================================
echo           Running JavaScript Examples
echo ========================================================
echo.
echo [WARNING] Make sure server is running at http://localhost:8000
echo.
timeout /t 3 >nul
cd /d "%~dp0.."
node examples/example-claude-api.js
echo.
pause
goto menu

:run_py_examples
cls
echo.
echo ========================================================
echo            Running Python Examples
echo ========================================================
echo.
echo [WARNING] Make sure server is running at http://localhost:8000
echo.
timeout /t 3 >nul

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo.
    pause
    goto menu
)

cd /d "%~dp0.."
python examples/example-claude-api.py
echo.
pause
goto menu

:show_tokens
cls
echo.
echo ========================================================
echo                 Show Tokens
echo ========================================================
echo.
cd /d "%~dp0.."
node src/show-tokens.js
echo.
pause
goto menu

:check_health
cls
echo.
echo ========================================================
echo                 Health Check
echo ========================================================
echo.
echo Checking http://localhost:8000/health ...
echo.
curl -s http://localhost:8000/health
echo.
echo.
pause
goto menu

:list_models
cls
echo.
echo ========================================================
echo                 List Models
echo ========================================================
echo.
echo Fetching models from http://localhost:8000/v1/models ...
echo.
curl -s http://localhost:8000/v1/models
echo.
echo.
pause
goto menu

:create_key
cls
echo.
echo ========================================================
echo                 Create API Key
echo ========================================================
echo.
set /p keyname="Enter name for API key: "
echo.
echo Creating API key "%keyname%"...
echo.
curl -X POST http://localhost:8000/v1/keys -H "Content-Type: application/json" -d "{\"name\":\"%keyname%\"}"
echo.
echo.
echo [WARNING] SAVE THIS API KEY! It will not be shown again.
echo.
pause
goto menu

:end
exit /b 0
