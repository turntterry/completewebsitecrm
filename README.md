# Exterior Experts CRM

CRM and public marketing website for an exterior cleaning contractor, served from a single Express + Vite application.

## Stack

- **Frontend:** React 19, Vite, Wouter, TanStack Query, Tailwind CSS v4, Radix UI
- **Backend:** Express, tRPC v11, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **Auth:** Google OAuth 2.0, JWT session cookies
- **SMS:** Twilio
- **File storage:** S3 via Forge proxy, local fallback
- **LLM:** Gemini 2.5 Flash via Forge proxy

## Single-tenant

The schema has `companyId` columns, but the app is operationally single-tenant. `DEFAULT_COMPANY_ID = 1` is hardcoded. There is no multi-org support, tenant switching, or signup flow.

## Quick start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env: add DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Optional: TWILIO_*, ANTHROPIC_API_KEY, AWS_*

# 3. Install and run
pnpm install
pnpm dev
```

Dev server runs on http://localhost:3000 (Express + Vite HMR).

## Production

```bash
pnpm build
NODE_ENV=production node dist/index.js
```

Requires `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Database

```bash
npx drizzle-kit push   # Push schema to DB (do NOT use pnpm db:push)
```

Schema lives in `drizzle/schema.ts`. For manual changes, use `ALTER TABLE` directly.

## Feature maturity

See `FEATURES.md` for details.

| Level | Features |
|-------|----------|
| **Production** | Quote intake (submitV2), CRM pipeline, customers, quotes, jobs, invoicing, SMS inbox, Google reviews, customer portal, auth, file storage |
| **Beta** | Automations (partial engine), payment processing (no Stripe), campaigns (SMS only), referral program |
| **Internal** | AI receptionist (optional), scheduler (mock fallback), property intelligence (mock data), analytics |
| **Stubbed** | Map measurement, email delivery |
| **Archived** | Expert Cam, workflow engine |

## Key files

| Path | Purpose |
|------|---------|
| `server/_core/index.ts` | Express entry point |
| `server/_core/trpc.ts` | Procedure definitions (public, protected, admin) |
| `server/routers.ts` | Router registry |
| `server/db.ts` | Database helpers |
| `drizzle/schema.ts` | All table definitions |
| `client/src/App.tsx` | All routes |
| `client/src/components/CrmLayout.tsx` | Admin sidebar nav |

## Routes

- `/`, `/locations/*`, `/gallery`, `/contact` -- public marketing site
- `/admin/*` -- CRM (requires auth)
- `/quote/:token` -- public quote view
- `/portal` -- customer portal
