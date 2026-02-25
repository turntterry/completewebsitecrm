# SETUP & INSTALLATION GUIDE

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+ 
- MySQL 8.0+ (or MariaDB 10.5+)
- Google Cloud Account

### 2. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 credential (Web application)
5. Add authorized redirect URI: `http://localhost:3000/auth/callback`
6. Copy **Client ID** and **Client Secret**

### 3. Clone & Install
```bash
git clone <repo-url>
cd exterior-experts-crm
npm install --legacy-peer-deps
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database (local MySQL)
DATABASE_URL=mysql://root:yourpassword@localhost:3306/exterior_experts_crm

# Google OAuth (from step 2)
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Session signing (generate random)
JWT_SECRET=<random-32-char-hex-string>

# Admin user (use your Google ID after first login, or email)
OWNER_OPEN_ID=your-email@gmail.com
```

### 5. Database Setup
```bash
npm run db:push
```

### 6. Run
```bash
npm run dev
# App opens at http://localhost:3000
```

Click "Sign in with Google" and log in with your test account.

---

## 📋 FULL SETUP GUIDE

### Step 1: Create MySQL Database

```bash
# Using mysql CLI
mysql -u root -p

CREATE DATABASE exterior_experts_crm;
USE exterior_experts_crm;
EXIT;
```

Or use a GUI like MySQL Workbench:
1. Create schema named `exterior_experts_crm`
2. Use InnoDB engine

### Step 2: Configure Environment Variables

Create `.env` file in project root:

```bash
# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════

# MySQL connection string
# Format: mysql://username:password@host:port/database
# Local example:
DATABASE_URL=mysql://root:password@localhost:3306/exterior_experts_crm

# PlanetScale (serverless MySQL):
# DATABASE_URL=mysql://user:pass@aws.connect.psdb.cloud/database?ssl={"rejectUnauthorized":true}

# ═══════════════════════════════════════════════════════════════
# AUTHENTICATION (Google OAuth 2.0)
# ═══════════════════════════════════════════════════════════════

# From Google Cloud Console
# 1. https://console.cloud.google.com
# 2. Create project
# 3. Enable Google+ API
# 4. Create OAuth 2.0 credentials (Web application)
# 5. Add redirect URI: http://localhost:3000/auth/callback
GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<32-character-hex-string>

# Admin user: set to your Google ID (sub claim from JWT)
# You'll see it after logging in for the first time
# For now, use your email or any identifier
OWNER_OPEN_ID=your-email@gmail.com

# ═══════════════════════════════════════════════════════════════
# OPTIONAL: Twilio (SMS Features)
# ═══════════════════════════════════════════════════════════════

# Leave blank to skip SMS features
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ═══════════════════════════════════════════════════════════════
# OPTIONAL: AI Receptionist (Anthropic)
# ═══════════════════════════════════════════════════════════════

# Leave blank to skip AI features
ANTHROPIC_API_KEY=

# ═══════════════════════════════════════════════════════════════
# INTERNAL (Leave blank for local dev)
# ═══════════════════════════════════════════════════════════════

BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

### Step 3: Install Dependencies
```bash
npm install --legacy-peer-deps

# Verify build works
npm run check
npm run build
```

### Step 4: Initialize Database
```bash
npm run db:push
```

This creates all tables and runs migrations.

### Step 5: Run Development Server
```bash
npm run dev
```

Server starts on http://localhost:3000

### Step 6: Test Login Flow

1. Navigate to http://localhost:3000
2. Should redirect to login page
3. Click "Sign in with Google"
4. Authenticate with your test Google account
5. Should redirect back and show dashboard

**After first login:**
- Copy the Google ID (sub claim) from database
- Update `OWNER_OPEN_ID` in `.env` to make this user an admin
- Restart server

---

## 🔐 FINDING YOUR GOOGLE ID

After first login, your Google ID is stored in the database:

```bash
# Direct database query
mysql -u root -p exterior_experts_crm
SELECT openId, email, name FROM users LIMIT 5;
```

The `openId` field is your Google ID. Use this for `OWNER_OPEN_ID`.

---

## 📦 PRODUCTION DEPLOYMENT

### Environment Variables (Production)

```bash
# Use same .env structure, but with:

# Database: Use production-safe connection string
DATABASE_URL=mysql://prod-user:strong-password@prod-host/db

# Google OAuth: Add production redirect URI to Google Cloud
GOOGLE_CLIENT_ID=<production-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<production-secret>
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback

# Strong JWT secret (generate new one)
JWT_SECRET=<new-32-char-hex-for-prod>

# Admin users (comma-separated if multiple)
OWNER_OPEN_ID=admin@yourcompany.com
```

### Build for Production
```bash
npm run build
```

This creates:
- `dist/public/` — Frontend assets
- `dist/index.js` — Backend server

### Run Production Server
```bash
NODE_ENV=production node dist/index.js
```

Server listens on port 3000 (or next available port).

### Using Docker
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build
RUN npm run build

# Set production mode
ENV NODE_ENV=production

# Run server
CMD ["node", "dist/index.js"]
```

Build image:
```bash
docker build -t exterior-experts-crm .
```

Run container:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e JWT_SECRET="..." \
  -e OWNER_OPEN_ID="..." \
  exterior-experts-crm
```

---

## ✅ VERIFY INSTALLATION

### Check 1: Build Succeeds
```bash
npm run build
# Should complete with no errors
```

### Check 2: Database Connected
```bash
npm run dev
# Server logs should show no database errors
# Check: "Server running on http://localhost:3000"
```

### Check 3: Auth Working
1. Visit http://localhost:3000/login
2. Should show "Sign in with Google" button (not error)
3. Click button → redirects to Google
4. After auth → redirected to dashboard

### Check 4: Admin Gating
1. Log in as non-admin user
2. Try to access admin routes (e.g., /settings)
3. Should get permission denied error
4. Log out, log in as admin, try again
5. Should have access

---

## 🐛 TROUBLESHOOTING

### "OAuth not configured" error
**Solution:** Verify in .env:
```bash
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

Both should have values. Restart dev server after changing .env.

### Database connection error
**Solution:** Verify DATABASE_URL in .env:
```bash
# Test connection
mysql -u root -p -h localhost -e "USE exterior_experts_crm; SELECT 1;"
```

If MySQL not running:
```bash
# macOS (Homebrew)
brew services start mysql

# Linux (systemd)
sudo systemctl start mysql

# Windows
# Start MySQL from Services or use MySQL command line
```

### Port 3000 in use
**Solution:** Dev server auto-finds next available port. Check logs:
```bash
npm run dev
# Logs show which port is used
```

### Build fails with type errors
**Solution:** These are pre-existing CRM errors, not auth-related. Safe to ignore for auth testing.

---

## 📖 NEXT STEPS

1. **Configure Business Settings**
   - Set company name, address, phone
   - Configure service offerings
   - Upload logo/branding

2. **Add Team Members**
   - Share login credentials
   - Set up field crew accounts
   - Configure SMS/notifications

3. **Create Service Templates**
   - Define pricing models
   - Create quote templates
   - Set up automation rules

4. **Integrate Payments** (optional)
   - Stripe, PayPal, etc.
   - Invoice delivery automation

5. **Enable SMS** (optional)
   - Add Twilio credentials
   - Configure text notification templates

---

## 📞 SUPPORT

For issues, check:
1. `PHASE_A_DISCOVERY.md` — Auth architecture overview
2. `PHASE_B_IMPLEMENTATION.md` — Implementation details
3. `PHASE_C_INTEGRATION.md` — Integration test procedures
4. `.env.example` — Configuration reference

---

**Happy installing! 🎉**
