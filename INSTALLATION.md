# Exterior Experts CRM — Installation & Setup Guide

## Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **pnpm** package manager
- **MySQL** 5.7+ database
- **Google OAuth credentials** (see below)

### Installation Steps

#### 1. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the **Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - **Local:** `http://localhost:3000/auth/callback`
     - **Production:** `https://yourdomain.com/auth/callback`
   - Save Client ID and Client Secret

#### 2. Generate Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (32-character hex string).

#### 3. Create `.env` File

In project root, create `.env` with:

```bash
# Google OAuth (from step 1)
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Session Signing (from step 2)
JWT_SECRET=YOUR_32_CHAR_HEX_STRING_HERE

# Admin User (use your Google email)
OWNER_OPEN_ID=your-email@gmail.com

# Database (adjust for your setup)
DATABASE_URL=mysql://root:password@localhost:3306/exterior_experts_crm

# Optional: Twilio for SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Optional: Anthropic for AI Receptionist
ANTHROPIC_API_KEY=
```

#### 4. Install Dependencies

```bash
npm install
# or
pnpm install
```

#### 5. Set Up Database

```bash
# Push Drizzle schema to database
npm run db:push
```

#### 6. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000` (or next available port)

#### 7. Test Login

1. Visit `http://localhost:3000`
2. Click "Sign in with Google"
3. Google consent screen appears
4. Approve access
5. Redirected to dashboard
6. ✓ You're logged in!

---

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates:
- `dist/index.js` — Server bundle
- `dist/public/` — Client assets (HTML, JS, CSS)

### Run Production Server

```bash
# Option 1: Direct Node
NODE_ENV=production node dist/index.js

# Option 2: PM2 process manager (recommended)
npm install -g pm2
pm2 start dist/index.js --name "crm" --env production
pm2 save
pm2 startup

# Option 3: Docker
docker build -t exterior-experts-crm .
docker run -e DATABASE_URL=... -e GOOGLE_CLIENT_ID=... -p 3000:3000 exterior-experts-crm
```

### Production Checklist

- [ ] MySQL database configured and running
- [ ] Google OAuth credentials set to production domain
- [ ] GOOGLE_REDIRECT_URI updated to production URL
- [ ] JWT_SECRET set to strong random value
- [ ] OWNER_OPEN_ID set to admin email
- [ ] DATABASE_URL points to production database
- [ ] NODE_ENV=production environment variable set
- [ ] `.env` file NOT committed to git
- [ ] Backups enabled for database
- [ ] HTTPS/SSL configured on domain
- [ ] Firewall rules allow :3000 or reverse proxy configured

---

## Architecture Overview

### Authentication Flow

```
User visits app
    ↓
Click "Sign in with Google"
    ↓
GET /auth/login (server)
    ↓
Redirects to Google consent screen
    ↓
User approves
    ↓
Google redirects to /auth/callback?code=...&state=...
    ↓
Server exchanges code for JWT
    ↓
Server verifies Google signature
    ↓
Creates session JWT (HS256)
    ↓
Sets HttpOnly cookie
    ↓
Redirects to /
    ↓
User logged in ✓
```

### Session Management

All subsequent requests include the session cookie. The server:
1. Extracts JWT from cookie
2. Verifies signature with JWT_SECRET
3. Looks up user in database
4. Populates tRPC context with user info
5. Request proceeds with authentication

---

## Key Files

### Authentication
- `client/src/const.ts` — Login URL endpoint
- `client/src/_core/hooks/useAuth.ts` — Auth state hook
- `server/_core/oauth.ts` — OAuth endpoints (/auth/login, /auth/callback)
- `server/_core/sdk.ts` — Session JWT management
- `server/_core/env.ts` — Environment configuration

### Database Schema
- `drizzle/schema.ts` — All tables and relationships

### API
- `server/routers.ts` — tRPC router setup
- `server/_core/context.ts` — Auth context for tRPC

---

## Troubleshooting

### "Auth not configured" error

**Cause:** Missing Google OAuth credentials

**Solution:**
```bash
# Check .env file has:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

### "Invalid state" error during login

**Cause:** State token expired or mismatched

**Solution:**
1. Clear browser cookies
2. Start login again
3. Verify GOOGLE_REDIRECT_URI matches exactly in both Google Console and .env

### Database connection error

**Cause:** MySQL not accessible or wrong credentials

**Solution:**
```bash
# Test connection
mysql -u root -p -h 127.0.0.1 -e "SELECT 1;"

# Update DATABASE_URL in .env
DATABASE_URL=mysql://root:password@host:3306/dbname
```

### "User not found" after login

**Cause:** Database schema not migrated

**Solution:**
```bash
npm run db:push
```

### Port 3000 already in use

**Cause:** Another process using port

**Solution:**
```bash
# Server auto-finds next available port (3001, 3002, etc)
# Or kill process:
lsof -i :3000  # Find process ID
kill -9 <PID>  # Kill it
```

---

## Admin Access

To make a user an admin:

1. User logs in with Google
2. Admin's Google email is captured
3. Set in `.env`:
   ```bash
   OWNER_OPEN_ID=admin@company.com
   ```
4. That user now has admin access

To add multiple admins (in future enhancement):
- Modify `OWNER_OPEN_ID` handling in routers (currently single admin)
- Or create an `admins` table in database

---

## Environment Variables Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | ✓ | `xxx.apps.googleusercontent.com` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | ✓ | `xxx` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | ✓ | `http://localhost:3000/auth/callback` | OAuth callback URL |
| `JWT_SECRET` | ✓ | `abc123...` (32 chars) | Session signing key |
| `OWNER_OPEN_ID` | ✓ | `admin@company.com` | Admin user identifier |
| `DATABASE_URL` | ✓ | `mysql://user:pass@host/db` | MySQL connection |
| `NODE_ENV` | | `production` | Dev or production mode |
| `PORT` | | `3000` | Server port (optional, auto-detects) |
| `TWILIO_ACCOUNT_SID` | | | SMS feature (optional) |
| `TWILIO_AUTH_TOKEN` | | | SMS feature (optional) |
| `TWILIO_PHONE_NUMBER` | | | SMS feature (optional) |
| `ANTHROPIC_API_KEY` | | | AI Receptionist (optional) |

---

## Security Best Practices

1. **Never commit `.env` to git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use strong JWT_SECRET**
   ```bash
   # NOT: "dev-secret-123"
   # YES: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **HTTPS only in production**
   - Use reverse proxy (nginx, Cloudflare)
   - Set GOOGLE_REDIRECT_URI to https://

4. **Restrict database access**
   - Only allow connections from app server
   - Use strong database password

5. **Keep dependencies updated**
   ```bash
   npm audit fix
   npm update
   ```

6. **Monitor logs**
   - Watch for failed login attempts
   - Monitor auth errors
   - Track database issues

---

## Support & Documentation

### Built-in Docs
- `PHASE_A_DISCOVERY.md` — Architecture analysis
- `PHASE_B_COMPLETION.md` — Implementation details
- `PHASE_C_INTEGRATION.md` — Integration verification
- `PHASE_D_CLEANUP.md` — Production setup

### External Resources
- [Google OAuth Documentation](https://developers.google.com/identity/oauth2)
- [Express.js Guide](https://expressjs.com/)
- [tRPC Documentation](https://trpc.io/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## Version Info

- **Node.js:** 18+
- **npm:** 9+
- **Google Auth Library:** 10.5.0
- **Express:** 4.21.2
- **tRPC:** 11.6.0
- **React:** 19.2.1
- **TypeScript:** 5.9.3

---

## License

MIT — See LICENSE file for details

---

## Changelog

### Version 1.0.0 (Auth Rebuild)
- ✅ Migrated from Manus OAuth to Google OAuth 2.0
- ✅ Implemented standard session management
- ✅ Added CSRF protection with state tokens
- ✅ Secured session cookies with HttpOnly flag
- ✅ Removed legacy Manus-specific code
- ✅ Added comprehensive documentation
- ✅ Production build tested and verified

---

**Ready to go live!** 🚀
