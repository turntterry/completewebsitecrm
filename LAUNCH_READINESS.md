# Launch Readiness Assessment

## Gap List

### Blockers (fixed this session)
| # | Gap | Status |
|---|-----|--------|
| 1 | No HTTPS redirect — HTTP requests served without redirect | **Fixed** — added redirect + HSTS + security headers in production |
| 2 | No `trust proxy` — Express ignores `x-forwarded-proto` from Render | **Fixed** — `app.set("trust proxy", 1)` |
| 3 | Mock scheduler exposed in production | **Fixed** — gated to `NODE_ENV !== "production"` |
| 4 | `render.yaml` missing critical env vars (Google OAuth, OWNER_OPEN_ID, Maps API, webhook secret) | **Fixed** — all 5 added |

### Non-Blockers (acceptable at launch)
| # | Gap | Impact | When to Fix |
|---|-----|--------|-------------|
| 1 | No Stripe integration — portal payments use stub/immediate capture | Low — manual payment recording works fine | Post-launch sprint |
| 2 | SMS requires A2P 10DLC registration | Medium — outbound SMS may be filtered by carriers | Separate Twilio process |
| 3 | Client JS bundle is 1.9MB (gzipped 464KB) | Low — works fine, just slow on 3G | Code-split later |
| 4 | No error tracking service (Sentry etc.) | Medium — errors only visible in host logs | Post-launch |
| 5 | OAuth state stored in memory (not Redis) | Low — single instance is fine, only matters if you scale to multiple instances | Much later |

## Current State: Ready

### Build & Runtime
- [x] `pnpm check` (TypeScript) — clean, zero errors
- [x] `pnpm build` — passes, outputs `dist/index.js` + `dist/public/`
- [x] `render.yaml` — configured with all required env vars
- [x] HTTPS redirect + security headers — added for production
- [x] Mock endpoints gated to dev-only

### Database
- [x] 1 company row exists
- [x] 1 admin user exists
- [x] 10 active services with pricing configs
- [x] 10 service_configs with pricing rules
- [x] Quote tool settings: active, standalone token generated
- [x] Schema: 25 migrations applied

### Quote Tool (Money Path)
- [x] Quote tool active (`isActive: true`)
- [x] Standalone token: `1c5503c16d596fa8d8eeab3a044134a2`
- [x] Standalone URL: `https://yourdomain.com/quote-tool?token=1c5503c16d596fa8d8eeab3a044134a2`
- [x] submitV2 flow: session → events → pricePreview → submit → lead + instant_quote
- [x] Balance updates: single source of truth in `createPayment()`

### Env Vars Needed in Render Dashboard
| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 64+ char random string |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Yes | `https://yourdomain.com/auth/callback` — must match Console |
| `OWNER_OPEN_ID` | Yes | Your Google email (gets admin role) |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | For address autocomplete in quote tool |
| `RESEND_API_KEY` | Recommended | Email notifications |
| `TWILIO_ACCOUNT_SID` | Optional | SMS features |
| `TWILIO_AUTH_TOKEN` | Optional | SMS features |
| `TWILIO_PHONE_NUMBER` | Optional | SMS features |
| `WEBHOOK_SECRET` | Recommended | HMAC signing for payment webhooks |

## Controlled Go-Live Steps

1. **Deploy to Render** — push to main (Render auto-deploys from `render.yaml`)
2. **Set all env vars** in Render dashboard (see table above)
3. **Run schema push** — `npx drizzle-kit push` against production DB
4. **Verify OAuth** — visit `https://yourdomain.com/auth/login`, confirm Google consent screen works
5. **Verify quote tool** — open standalone link in incognito, submit a test quote
6. **Verify CRM** — confirm test quote appears in Requests page
7. **Enable real traffic** — share standalone link / embed on website

## First 48 Hours Watch List

| Signal | Where to Check | Action if Bad |
|--------|---------------|---------------|
| Server errors | Render dashboard → Logs | Check stack traces, fix, redeploy |
| Quote submissions | CRM → Requests page | If zero after sharing link, check quote tool settings |
| Manual review rate | CRM → Requests (flagged items) | High rate = pricing config needs tuning |
| DB connection drops | Render logs → "connection" errors | Check DB plan limits, connection pooling |
| Page load time | Chrome DevTools → Network | If >5s, check static asset serving |
| OAuth failures | Render logs → "auth" errors | Verify redirect URI matches exactly |
| SMS delivery | CRM → Messages tab | A2P registration issue if failing |

## Next Hardening Sprint (after launch proven)

Pick **one** after 48 hours of stable operation:
1. **Payments/invoice state sync** — atomic balance updates, Stripe test mode
2. **Portal polish** — loading states, error handling, mobile UX
3. **Analytics cleanup** — real conversion tracking, submission funnel
4. **Operational alerts** — error notifications, uptime monitoring
