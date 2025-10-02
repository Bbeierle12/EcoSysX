@echo off
REM Llama Service Startup Script for Windows

echo.
echo 🚀 Starting Llama 3.2-1B-Instruct Service for EcoSysX
echo ==================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

REM Check if requirements are installed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo 📋 Service Configuration:
echo   - Model: meta-llama/Llama-3.2-1B-Instruct
echo   - Port: 8000
echo   - Endpoint: http://localhost:8000
echo.
echo ⏳ Loading model (this may take a few minutes on first run)...
echo.

REM Start the service
python llama_server.py
