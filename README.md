# Exterior Experts CRM

A full-stack business OS: website, instant quotes, CRM, jobs, invoicing, SMS inbox, and customer portal for Exterior Experts (exteriorexperts.co).

## Tech Stack
- **Frontend**: React 19 + Vite + Wouter (client-side routing)
- **Backend**: Express + tRPC + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Google OAuth 2.0 with JWT session cookies
- **SMS**: Twilio
- **Communications**: Anthropic (AI receptionist)
- **File uploads**: AWS S3 (with local fallback)

## Architecture
Single full-stack app, not a monorepo:
- `server/_core/index.ts` — Express entry point
- `server/routers/*.ts` — tRPC router endpoints
- `client/src/App.tsx` — All Wouter routes (public + admin)
- `drizzle/schema.ts` — Database schema (single source of truth)

Routes:
- `/` through `/locations`, `/gallery`, `/contact`, etc. → public marketing site
- `/admin/*` → CRM pages (protected, requires auth)
- `/quote/:token` → public quote view (unauthenticated)
- `/portal` → customer portal

## Quick Start

1. **Start database:**
   ```bash
   docker compose up -d
   ```
   Starts PostgreSQL on `:5432` (user: `crm_user`, db: `exterior_experts_crm`)

2. **Setup:**
   ```bash
   cp .env.example .env
   # Edit .env: add Google OAuth credentials, Twilio (optional), Anthropic (optional)
   ```

3. **Install and run dev:**
   ```bash
   pnpm install
   pnpm dev
   ```
   Runs Express on `:3000` + Vite HMR. Open http://localhost:3000

4. **Build for production:**
   ```bash
   pnpm build     # Vite + esbuild server
   pnpm start     # Run dist/index.js
   ```

## Database

**Schema changes:**
```bash
npx drizzle-kit push   # Push schema directly to DB
```

Do NOT use `pnpm db:push` (it fails on existing tables).

See `drizzle/schema.ts` for all tables. For manual schema changes, write SQL migrations in `drizzle/*.sql` or run `ALTER TABLE` directly.

## Key Files
- `server/_core/index.ts` — HTTP server and middleware setup
- `server/_core/trpc.ts` — procedure definitions (publicProcedure, protectedProcedure, adminProcedure)
- `server/routers.ts` — registers all sub-routers
- `server/db.ts` — database helpers
- `client/src/App.tsx` — all routes and route definitions

## Conventions
- All admin routes require `role === 'admin'` (checked in tRPC context)
- All data mutations require company context (`companyId`); queries filter by company
- Use `npx drizzle-kit push` for schema changes, not migrations
- New routers: create `server/routers/featureName.ts`, then register in `server/routers.ts`
