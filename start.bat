@echo off
setlocal enabledelayedexpansion
title Exterior Experts CRM

echo.
echo ==========================================
echo   Exterior Experts CRM
echo ==========================================
echo.

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -e "process.stdout.write(process.version.slice(1))"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
  echo [ERROR] Node.js v%NODE_MAJOR% is too old. Need v18+.
  pause
  exit /b 1
)
echo [OK] Node.js found

:: Check .env
if not exist ".env" (
  if exist ".env.example" (
    copy .env.example .env >nul
    echo [WARN] No .env found - copied from .env.example
    echo        Open .env and set DATABASE_URL and JWT_SECRET, then re-run.
    pause
    exit /b 1
  )
  echo [ERROR] No .env file found.
  pause
  exit /b 1
)
echo [OK] .env found

:: Install deps
if not exist "node_modules\" (
  echo Installing dependencies - this takes about 30 seconds...
  call npm install --legacy-peer-deps --silent
  echo [OK] Dependencies installed
) else (
  echo [OK] Dependencies already installed
)

:: Bootstrap
echo Setting up database...
node scripts/bootstrap.mjs
if errorlevel 1 (
  echo [ERROR] Bootstrap failed. Check your DATABASE_URL in .env
  pause
  exit /b 1
)

:: Start
echo.
echo  App running at: http://localhost:3000
echo  Press Ctrl+C to stop.
echo.
npm run dev
