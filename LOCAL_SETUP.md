# Local Setup Guide — Exterior Experts CRM

Get the app running on your machine in about 10 minutes.

---

## What You Need

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 or higher | `node --version` |
| npm | 8 or higher | `npm --version` |
| MySQL | 8.0 | `mysql --version` |

**Don't have MySQL?** The easiest options:
- **macOS**: `brew install mysql && brew services start mysql`
- **Windows**: Download [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
- **Any OS (Docker)**: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=exterior_experts_crm mysql:8`

---

## Step 1 — Create the Database

Open a terminal and run:

```bash
mysql -u root -p
```

Then inside MySQL:

```sql
CREATE DATABASE exterior_experts_crm;
EXIT;
```

---

## Step 2 — Configure Environment

Copy the example env file and edit it:

```bash
cd exterior-experts-crm   # your project folder
cp .env.example .env
```

Open `.env` and update at minimum these two lines:

```env
DATABASE_URL=mysql://root:yourpassword@localhost:3306/exterior_experts_crm
JWT_SECRET=any-random-string-at-least-32-characters-long
```

> **Generate a good JWT_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

Everything else in `.env` is optional — the app runs fine without Twilio or Anthropic keys.

---

## Step 3 — Install Dependencies

```bash
npm install
```

---

## Step 4 — Bootstrap (one time only)

This creates all the database tables and sets up your owner account:

```bash
node scripts/bootstrap.mjs
```

You'll see output like this:

```
🚀  Exterior Experts CRM — Local Bootstrap

📡  Connecting to MySQL at localhost:3306/exterior_experts_crm...
✅  Connected!

📦  Running 13 migrations...
   ✓  0000_thankful_morg.sql
   ✓  0001_equal_scarlet_witch.sql
   ... (all migrations)

👤  Setting up owner account...
   ✓  User created
   ✓  Company created
   ✓  User linked to company

🔑  Generating session cookie...

══════════════════════════════════════════════════════════════════════
✅  Bootstrap complete! Here's how to log in:

1. Start the app:    npm run dev
2. Open:             http://localhost:3000
3. Open DevTools → Application → Cookies → http://localhost:3000
4. Add a cookie named:   crm_session
   With this value:

   eyJhbGc... (long JWT token)

5. Refresh the page — you'll be logged in as Owner
══════════════════════════════════════════════════════════════════════

💡  Tip: Alternatively, paste this into your browser console:

   document.cookie = "crm_session=eyJhbGc...; path=/; max-age=31536000";

   Then refresh the page.
```

---

## Step 5 — Start the App

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Step 6 — Log In

Since we're not using an external OAuth server locally, you log in by setting a cookie.

**Easiest way — browser console:**

1. Open http://localhost:3000 (you'll see the login page)
2. Open DevTools → Console (F12 → Console tab)
3. Paste the `document.cookie = ...` line the bootstrap script printed
4. Press Enter
5. Refresh the page → you're in ✅

**Alternative — DevTools cookie editor:**

1. Open DevTools → Application → Storage → Cookies → http://localhost:3000
2. Click the `+` button to add a new cookie
3. Name: `crm_session`
4. Value: the JWT token the bootstrap script printed
5. Path: `/`
6. Refresh the page

> **Lost your cookie value?** Just run `node scripts/bootstrap.mjs` again — it's safe to re-run and will print a fresh cookie.

---

## Day-to-Day Development

```bash
# Start the dev server (auto-reloads on changes)
npm run dev

# If you add new schema changes, run the SQL migration manually:
mysql -u root -p exterior_experts_crm < drizzle/XXXX_migration_name.sql
```

---

## Optional: Enable SMS (Twilio)

1. Create a free account at [twilio.com](https://www.twilio.com)
2. Buy a phone number (~$1/month)
3. Add to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+19315550100
   ```
4. For inbound SMS, set your Twilio number's webhook to:
   `http://your-public-url/api/webhooks/twilio/inbound`
   (Use [ngrok](https://ngrok.com) to expose your local server: `ngrok http 3000`)

---

## Optional: Enable AI Receptionist (Anthropic)

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
   ```
4. Go to CRM → AI Receptionist → enable it and fill in your instructions

---

## Deploying to Production

The cheapest reliable options for a small business:

| Platform | Free tier | MySQL | Est. cost |
|----------|-----------|-------|-----------|
| [Railway](https://railway.app) | $5 credit | ✅ built-in | ~$10/mo |
| [Render](https://render.com) | 750 hrs/mo | ✅ add-on | ~$14/mo |
| [Fly.io](https://fly.io) | Generous free | ✅ add-on | ~$7/mo |

For any of these, you just set the same `.env` variables as environment variables in their dashboard, and they handle HTTPS, restarts, and scaling automatically.

---

## Troubleshooting

**"Cannot connect to MySQL"**
- Make sure MySQL is running: `sudo service mysql start` (Linux) or `brew services start mysql` (Mac)
- Check your password and database name in DATABASE_URL
- Make sure the database exists: `CREATE DATABASE exterior_experts_crm;`

**"Cannot find module" errors**
- Run `npm install` again

**Page shows login but cookie won't stick**
- Make sure you're on http://localhost:3000 (not a different port) when setting the cookie
- Try the console method: `document.cookie = "crm_session=TOKEN; path=/; max-age=31536000";`

**Bootstrap runs but I can't log in**
- Re-run `node scripts/bootstrap.mjs` to get a fresh cookie
- Make sure your `.env` JWT_SECRET hasn't changed since bootstrap ran

**SMS not sending**
- Check Twilio credentials in `.env`
- Verify your Twilio phone number is SMS-capable in the Twilio console
