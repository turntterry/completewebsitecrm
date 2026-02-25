@echo off
:: ─────────────────────────────────────────────────────────────────────────────
::  run.bat — Exterior Experts CRM starter (Windows)
:: ─────────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║   Exterior Experts CRM               ║
echo   ╚══════════════════════════════════════╝
echo.

:: Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found.
    echo  Install it from https://nodejs.org ^(version 18 or higher^)
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -e "process.stdout.write(process.versions.node)"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
    echo  ERROR: Node.js %NODE_MAJOR% found but version 18+ required.
    echo  Download from https://nodejs.org
    pause
    exit /b 1
)

echo  OK  Node.js found

:: Check .env
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo.
        echo  SETUP NEEDED: .env file created from template.
        echo.
        echo  Open .env in a text editor and set:
        echo    DATABASE_URL  =  mysql://root:yourpassword@localhost:3306/exterior_experts_crm
        echo    JWT_SECRET    =  any random 32+ character string
        echo.
        echo  Then run this script again.
        pause
        exit /b 0
    ) else (
        echo  ERROR: No .env file found.
        pause
        exit /b 1
    )
)

echo  OK  .env found

:: Install dependencies
if not exist "node_modules" (
    echo.
    echo  Installing dependencies ^(first run only^)...
    call npm install --legacy-peer-deps
    echo  OK  Dependencies installed
) else (
    echo  OK  Dependencies ready
)

:: Bootstrap
if not exist ".bootstrapped" (
    echo.
    echo  Setting up database ^(first run only^)...
    echo.
    call node scripts/bootstrap.mjs
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: Bootstrap failed. See above for details.
        echo  Make sure MySQL is running and run:
        echo    mysql -u root -p -e "CREATE DATABASE exterior_experts_crm;"
        pause
        exit /b 1
    )
    type nul > .bootstrapped
    echo.
    echo  Copy the cookie line printed above - you will need it to log in.
    echo  Press any key to start the server...
    pause >nul
) else (
    echo  OK  Database ready
)

:: Start
echo.
echo  Starting CRM...
echo.
echo  Open your browser:  http://localhost:3000
echo.
echo  Press Ctrl+C to stop.
echo.

call npm run dev
