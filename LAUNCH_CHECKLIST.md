# Instant Quote v2 — Launch Checklist & Rollback Plan

> Complete every item before flipping the `isActive` toggle in Quote Tool → Deploy settings.

---

## Pre-Launch Checklist

### Environment & Config

- [ ] `DATABASE_URL` is set and points to production MySQL
- [ ] `JWT_SECRET` is a random 32+ char string (not the dev default)
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are production OAuth credentials
- [ ] `GOOGLE_REDIRECT_URI` matches the production domain exactly (`https://...`)
- [ ] `OWNER_OPEN_ID` is set to the correct admin Google email
- [ ] `NODE_ENV=production` is set on the host
- [ ] Optional: `TWILIO_*` keys set if SMS is needed at launch
- [ ] Optional: `ANTHROPIC_API_KEY` set if AI Receptionist is needed at launch
- [ ] `.env` file is NOT committed to git (check `.gitignore`)

### Database

- [ ] All 16 migrations have been applied (0000 → 0016)
- [ ] `quote_tool_settings` has all Phase 1–5 columns (run `DESCRIBE quote_tool_settings`)
- [ ] `quote_tool_services` has all Phase 1–5 columns
- [ ] `quote_sessions` and `quote_session_events` tables exist
- [ ] `quote_config_versions` table exists
- [ ] At least one company row exists in `companies`
- [ ] Owner user row exists in `users` with correct `companyId`
- [ ] Database backups are enabled and last backup is recent

### Quote Tool Configuration (Admin UI)

- [ ] Quote Tool → Services: at least 3 active services configured with pricing
- [ ] Quote Tool → Packages: tier labels set (good / better / best labels)
- [ ] Quote Tool → Pricing: job minimum and discount tiers reviewed
- [ ] Quote Tool → Appearance: header title, colors, logo URL set
- [ ] Quote Tool → Deploy: standalone token generated; `isActive = true`
- [ ] Standalone link tested in incognito browser end-to-end

### Smoke Test Pass

- [ ] `pnpm test` runs with 0 new failures (the `sendEmail` failure is pre-existing and requires RESEND_API_KEY)
- [ ] Manual walkthrough: address entry → service select → price preview → submit
- [ ] Upsell step appears and accepted upsells show in total
- [ ] Submitted quote appears in CRM → Requests / Instant Quotes list
- [ ] Owner notification fires on new submission (check console / email)
- [ ] Quote funnel analytics card in Quote Tool admin shows data

### Build & Deploy

- [ ] `pnpm build` completes with no TypeScript errors (`pnpm check`)
- [ ] Production build tested locally: `NODE_ENV=production node dist/index.js`
- [ ] Static assets load correctly (no 404s on JS/CSS)
- [ ] HTTPS is configured on the production domain
- [ ] Domain redirects HTTP → HTTPS

### Monitoring

- [ ] Server logs visible in hosting platform dashboard
- [ ] Error alerts configured (Sentry / Datadog / email — whatever your platform supports)
- [ ] Uptime monitoring configured (e.g. UptimeRobot — free tier)

---

## Go-Live Steps

1. Apply all DB migrations on production
2. Set all required env vars in the hosting platform
3. Deploy the production build
4. Run `node scripts/bootstrap.mjs` on production (safe to re-run)
5. Log in to the admin, open Quote Tool → Deploy, toggle `isActive = ON`
6. Open the public quote link in incognito — submit a test quote
7. Confirm the test quote appears in CRM and owner notification fires
8. Enable real traffic

---

## Rollback Plan

### Scenario: Quote tool broken but CRM working

**Impact:** Public quote submissions fail. CRM admin still works.

**Action:**
1. Admin → Quote Tool → Deploy → toggle `isActive = OFF`
   - Public form immediately shows "unavailable" message
   - All other CRM features unaffected
2. Investigate error in server logs
3. Fix and re-toggle `isActive = ON`

**RTO:** < 2 minutes (just toggle off)

---

### Scenario: Server won't start after deploy

**Impact:** Full outage.

**Action:**
1. In your hosting platform, roll back to the previous deployment (one click on Railway / Render / Fly)
2. Or locally: `git revert HEAD && git push` to the production branch

**RTO:** < 5 minutes with platform rollback

---

### Scenario: Database migration breaks schema

**Impact:** Queries fail after migration.

**Action:**
1. Restore from the pre-migration DB backup
2. Or manually revert the specific ALTER TABLE:
   ```sql
   -- Example: undo upsellCatalog column
   ALTER TABLE quote_tool_settings DROP COLUMN upsellCatalog;
   ```
3. Roll back the code to the commit before the bad migration
4. Re-deploy

**RTO:** 10–30 minutes depending on backup restore speed

---

### Scenario: Analytics data looks wrong

**Impact:** Funnel numbers are off. No customer impact.

**Action:**
1. No rollback needed — analytics are read-only views of `quote_sessions` + `quote_session_events`
2. Check for event tracking bugs in `publicSite.trackEvent` calls on the frontend
3. Fix and redeploy; historical data is preserved

---

## Post-Launch Monitoring (First 48 Hours)

| What to watch | Where | Threshold |
|---|---|---|
| Server error rate | Hosting logs | > 1% of requests = investigate |
| Quote submission rate | CRM → Quote Tool analytics | Drop > 50% vs prior day = investigate |
| Manual review rate | CRM → Instant Quotes list | > 30% = pricing config issue |
| DB connection errors | Server logs (`publicSite.noDb` warns) | Any = investigate immediately |
| Page load time | Browser DevTools (mobile) | > 3s on 4G = optimize |

---

## Known Non-Critical Issues (Pre-existing)

| Issue | Impact | Fix |
|---|---|---|
| `sendEmail` test fails without `RESEND_API_KEY` | CI only — no customer impact | Add key to CI secrets when email is needed |
| `LOCAL_SETUP.md` references MySQL but `docker-compose.yml` uses PostgreSQL | Docs inconsistency only | Update docs post-launch |
