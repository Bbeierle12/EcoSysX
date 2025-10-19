@echo off
REM EcoSysX Qt GUI Launcher - Simple Batch Version
REM Double-click this file to launch the GUI

echo ========================================
echo   EcoSysX Qt GUI Launcher
echo ========================================
echo.

REM Set Qt paths
set "QT_PATH=C:\Qt\6.9.3\mingw_64\bin"
set "MINGW_PATH=C:\Qt\Tools\mingw1310_64\bin"
set "PATH=%QT_PATH%;%MINGW_PATH%;%PATH%"
set "QT_PLUGIN_PATH=C:\Qt\6.9.3\mingw_64\plugins"

REM Check if executable exists
if not exist "build\bin\ecosysx-gui.exe" (
    echo ERROR: Executable not found!
    echo Please build the project first.
    echo.
    pause
    exit /b 1
)

echo [OK] Starting EcoSysX GUI...
echo      Executable: build\bin\ecosysx-gui.exe
echo      Qt Path: %QT_PATH%
echo.

REM Launch the GUI
start "" "build\bin\ecosysx-gui.exe"

echo.
echo ========================================
echo   GUI Launched
echo ========================================
echo.
echo Make sure the engine server is running:
echo    npm run dev:engine
echo.
echo Then check the GUI status bar for
echo 'Connected to engine server'
echo.
echo Press any key to close this window...
pause >nul
