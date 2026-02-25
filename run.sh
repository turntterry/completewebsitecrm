#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  run.sh — Exterior Experts CRM starter
#  Handles: .env check → deps → bootstrap → dev server
# ─────────────────────────────────────────────────────────────────────────────

set -e
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
RESET="\033[0m"

cd "$(dirname "$0")"

echo ""
echo -e "${BOLD}${CYAN}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}  ║   Exterior Experts CRM               ║${RESET}"
echo -e "${BOLD}${CYAN}  ╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Step 1: Check Node ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗  Node.js not found.${RESET}"
  echo "   Install it from https://nodejs.org (version 18 or higher)"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗  Node.js $NODE_VER found but version 18+ is required.${RESET}"
  echo "   Download the latest LTS from https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓${RESET}  Node.js $(node --version)"

# ── Step 2: Check .env ────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo ""
    echo -e "${YELLOW}⚠   No .env file found. Creating one from .env.example...${RESET}"
    cp .env.example .env
    echo ""
    echo -e "${BOLD}  Before continuing, open .env and set these two values:${RESET}"
    echo ""
    echo -e "  ${CYAN}DATABASE_URL${RESET}  =  mysql://root:yourpassword@localhost:3306/exterior_experts_crm"
    echo -e "  ${CYAN}JWT_SECRET${RESET}    =  run this to generate one:"
    echo -e "               node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
    echo "  Then run this script again."
    exit 0
  else
    echo -e "${RED}✗  No .env or .env.example found. Is this the right folder?${RESET}"
    exit 1
  fi
fi

# Check DATABASE_URL is actually set (not still the placeholder)
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)
if [ -z "$DB_URL" ] || [[ "$DB_URL" == *"yourpassword"* ]]; then
  echo ""
  echo -e "${RED}✗  DATABASE_URL in .env looks like it hasn't been set yet.${RESET}"
  echo -e "   Open ${BOLD}.env${RESET} and set your MySQL connection string."
  echo ""
  echo "   Example:"
  echo "   DATABASE_URL=mysql://root:mypassword@localhost:3306/exterior_experts_crm"
  echo ""
  echo "   Then run this script again."
  exit 1
fi

JWT=$(grep "^JWT_SECRET=" .env | cut -d= -f2-)
if [ -z "$JWT" ] || [[ "$JWT" == *"change-this"* ]]; then
  echo ""
  echo -e "${RED}✗  JWT_SECRET in .env hasn't been set yet.${RESET}"
  echo "   Generate one with:"
  echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  echo ""
  echo "   Paste it into .env as JWT_SECRET=<value>"
  exit 1
fi

echo -e "${GREEN}✓${RESET}  .env configured"

# ── Step 3: Install dependencies ──────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo -e "${CYAN}→  Installing dependencies (first run only, takes ~1 min)...${RESET}"
  npm install --legacy-peer-deps
  echo -e "${GREEN}✓${RESET}  Dependencies installed"
else
  echo -e "${GREEN}✓${RESET}  Dependencies ready"
fi

# ── Step 4: Bootstrap if this is the first run ────────────────────────────────
BOOTSTRAP_FLAG=".bootstrapped"
if [ ! -f "$BOOTSTRAP_FLAG" ]; then
  echo ""
  echo -e "${CYAN}→  First run — setting up database tables and owner account...${RESET}"
  echo ""
  if node scripts/bootstrap.mjs; then
    touch "$BOOTSTRAP_FLAG"
    echo ""
    echo -e "${YELLOW}  ↑ Copy the cookie line above — you'll need it to log in.${RESET}"
    echo ""
    echo -e "${BOLD}  Press Enter to start the server, then paste the cookie in your browser.${RESET}"
    read -r
  else
    echo ""
    echo -e "${RED}✗  Bootstrap failed. Check the error above.${RESET}"
    echo "   Common fix: make sure MySQL is running and the database exists:"
    echo "   mysql -u root -p -e \"CREATE DATABASE exterior_experts_crm;\""
    exit 1
  fi
else
  echo -e "${GREEN}✓${RESET}  Database already bootstrapped"
fi

# ── Step 5: Start dev server ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  Starting CRM...${RESET}"
echo ""
echo -e "  ${BOLD}Open your browser:${RESET}  ${CYAN}http://localhost:3000${RESET}"
echo ""
echo -e "  ${YELLOW}To log in:${RESET} open the browser console and paste the"
echo -e "  ${CYAN}document.cookie = ...${RESET} line that bootstrap printed."
echo -e "  (Run ${BOLD}node scripts/bootstrap.mjs${RESET} again if you need a new one.)"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

npm run dev
