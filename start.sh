#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Exterior Experts CRM — Start Script
#  Run this once to set everything up, then again any time
#  you want to start the app.
# ─────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Exterior Experts CRM                   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check Node ────────────────────────────────────────
echo -e "${CYAN}[1/5] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗  Node.js not found. Install it from https://nodejs.org (v18 or higher)${NC}"
  exit 1
fi
NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗  Node.js v${NODE_VER} is too old. Need v18+. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓  Node.js $(node --version)${NC}"

# ── Step 2: Check .env ───────────────────────────────────────
echo -e "${CYAN}[2/5] Checking .env...${NC}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠  No .env found — copied from .env.example${NC}"
    echo -e "${YELLOW}   Open .env and set DATABASE_URL and JWT_SECRET, then re-run this script.${NC}"
    echo ""
    echo -e "   ${BOLD}DATABASE_URL${NC}=mysql://root:yourpassword@localhost:3306/exterior_experts_crm"
    echo -e "   ${BOLD}JWT_SECRET${NC}=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    echo ""
    exit 1
  else
    echo -e "${RED}✗  No .env file found. Create one based on .env.example${NC}"
    exit 1
  fi
fi

# Check DATABASE_URL is set
source_db=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)
if [ -z "$source_db" ] || [[ "$source_db" == *"yourpassword"* ]]; then
  echo -e "${YELLOW}⚠  DATABASE_URL in .env looks unconfigured.${NC}"
  echo -e "   Edit .env and set your MySQL connection string, then re-run."
  exit 1
fi

# Check JWT_SECRET is set
source_jwt=$(grep "^JWT_SECRET=" .env | cut -d= -f2-)
if [ -z "$source_jwt" ] || [[ "$source_jwt" == *"change-this"* ]]; then
  echo -e "${YELLOW}⚠  JWT_SECRET in .env is not set. Generating one for you...${NC}"
  NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  # Replace the placeholder line
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_SECRET}|" .env
  else
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_SECRET}|" .env
  fi
  echo -e "${GREEN}✓  JWT_SECRET generated and saved to .env${NC}"
fi

echo -e "${GREEN}✓  .env looks good${NC}"

# ── Step 3: Install dependencies ─────────────────────────────
echo -e "${CYAN}[3/5] Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  echo "    Running npm install (this takes ~30 seconds the first time)..."
  npm install --legacy-peer-deps --silent
  echo -e "${GREEN}✓  Dependencies installed${NC}"
else
  echo -e "${GREEN}✓  Dependencies already installed${NC}"
fi

# ── Step 4: Bootstrap DB ─────────────────────────────────────
echo -e "${CYAN}[4/5] Setting up database...${NC}"
node scripts/bootstrap.mjs
echo ""

# ── Step 5: Start ────────────────────────────────────────────
echo -e "${CYAN}[5/5] Starting app...${NC}"
echo ""
echo -e "${GREEN}${BOLD}  App running at → http://localhost:3000${NC}"
echo -e "${YELLOW}  (Use the cookie from Step 4 above to log in)${NC}"
echo -e "  Press Ctrl+C to stop."
echo ""

npm run dev
