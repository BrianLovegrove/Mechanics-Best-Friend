@echo off
REM Mechanic's Best Friend Auto-Start Script for Windows
REM This script automatically sets up and starts the application

echo 🔧 Mechanic's Best Friend - Auto-Setup Starting...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js from https://nodejs.org/
    echo    After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo ⚙️ Creating environment configuration...
    (
        echo # Auto-generated environment file for Mechanic's Best Friend
        echo GITHUB_OWNER=BrianLovegrove
        echo GITHUB_REPO=Mechanics-Best-Friend
        echo GITHUB_BRANCH=main
        echo GITHUB_TOKEN=development_mode_no_token_required
        echo SESSION_SECRET=mechanics_best_friend_%random%
        echo PORT=3000
    ) > .env
    echo ✅ Environment file created
) else (
    echo ✅ Environment file already exists
)

REM Check if users.json exists
if not exist "users.json" (
    echo ❌ users.json file not found. Creating default users...
    (
        echo [
        echo   {
        echo     "username": "ADMIN",
        echo     "password": "$2b$10$v3W6DvuunOzkYBDzAHxqeeZm25nxJ2ATjjqg/2p/b1EOhb2zSRqCi",
        echo     "role": "admin"
        echo   },
        echo   {
        echo     "username": "MECH", 
        echo     "password": "$2b$10$DHyq.gQgfAnHuzY5jpNSqeyPVhYq0sjU5jJwbKoZcYiVicl/si6Cm",
        echo     "role": "mech"
        echo   }
        echo ]
    ) > users.json
    echo ✅ Default users created (ADMIN/1234, MECH/1234)
)

echo.
echo 🚀 Starting Mechanic's Best Friend...
echo    Server will be available at: http://localhost:3000
echo    Login credentials:
echo    - ADMIN: 1234 (full access + file upload)
echo    - MECH:  1234 (read-only access)
echo.
echo    Press Ctrl+C to stop the server
echo.

REM Start the server
npm start

pause