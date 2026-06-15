@echo off
:: TPT Infrastructure Engineer - One Click Local Run for Windows
:: NO DOCKER REQUIRED - Runs natively on any Windows 10+ desktop
:: Double click this file to start the application automatically

echo ===================================================
echo TPT Infrastructure Engineer
echo Starting local instance...
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Python...
    winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    echo Please restart this file after installation completes
    pause
    exit /b
)

:: Create virtual environment if not exists
if not exist ".venv" (
    echo Creating environment...
    python -m venv .venv
)

:: Activate environment
call .venv\Scripts\activate.bat

:: Install dependencies
echo Installing dependencies...
pip install -r backend/requirements.txt >nul

:: Install Node.js if needed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Node.js...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
)

:: Build frontend
echo Building frontend...
cd frontend
npm install --silent
npm run build
cd ..

:: Start application
echo.
echo ===================================================
echo Application is starting!
echo Open your browser at:  http://localhost:8000
echo ===================================================
echo.
echo Press CTRL+C to stop the server
echo.

uvicorn backend.main:app --host 127.0.0.1 --port 8000