@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo === Compiling LibraryManager.java ===
javac LibraryManager.java
if %errorlevel% neq 0 (
    echo Compile FAILED!
    pause
    exit /b 1
)

echo === Running LibraryManager ===
echo.
java LibraryManager
pause
