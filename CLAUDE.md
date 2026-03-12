# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A single-tenant CRM + public marketing website for an exterior cleaning contractor (Exterior Experts). One Express + Vite server serves both the public site and the admin CRM.

**Operationally single-tenant.** The schema has `companyId` columns, but the app hardcodes `DEFAULT_COMPANY_ID = 1` (see `client/src/lib/tenancy.ts`, `server/_core/tenancy.ts`). There is no tenant switching, no signup flow, no multi-org support. Treat it as single-tenant.

## Commands

```bash
pnpm dev          # Start dev server (tsx watch, Vite HMR)
pnpm build        # Build for production (Vite + esbuild)
pnpm start        # Run production build
pnpm check        # TypeScript type check (npx tsc --noEmit)
pnpm format       # Prettier format
pnpm test         # Vitest
```

**Schema changes:**
```bash
npx drizzle-kit push   # Push schema directly to DB (use this, NOT pnpm db:push)
```
`pnpm db:push` runs `drizzle-kit generate && drizzle-kit migrate`, which fails on existing tables. For live DB changes, run `ALTER TABLE` directly via a node script when needed.

## Architecture

### Server

```
server/_core/index.ts     <- Express entry point; registers OAuth, webhooks, tRPC, Vite
server/_core/trpc.ts      <- publicProcedure / protectedProcedure / adminProcedure
server/_core/context.ts   <- tRPC context (req, res, user from JWT cookie)
server/_core/tenancy.ts   <- DEFAULT_COMPANY_ID = 1 (single-tenant)
server/_core/llm.ts       <- invokeLLM() wrapper (gemini-2.5-flash via Forge proxy)
server/routers.ts         <- appRouter: registers all sub-routers
server/routers/*.ts       <- One file per domain (quotes, jobs, customers, etc.)
server/db.ts              <- All Drizzle DB helper functions
server/storage.ts         <- File upload (Forge proxy -> local /public/uploads fallback)
drizzle/schema.ts         <- Single source of truth for all table definitions
drizzle/*.sql             <- Numbered migration files
```

### Client

```
client/src/App.tsx                    <- All Wouter routes (public + /admin/*)
client/src/components/CrmLayout.tsx   <- Admin sidebar layout; navItems array
client/src/lib/trpc.ts               <- tRPC client setup
client/src/pages/                     <- One file per page
```

### Route split

- `/` through `/locations/*`, `/gallery`, `/contact`, etc. -> public marketing site
- `/admin/*` -> CRM pages, all wrapped in `<CrmLayout>`
- `/portal`, `/client`, `/field` -> authenticated non-sidebar pages
- `/quote/:token` -> public unauthenticated quote view

### tRPC patterns

- `publicProcedure` -- no auth required (public-facing endpoints)
- `protectedProcedure` -- requires valid JWT session cookie
- `adminProcedure` -- requires `role === 'admin'`
- All routers use `router({...})` from `server/_core/trpc.ts` (not plain objects)
- New routers must be registered in `server/routers.ts`

## Quote intake (canonical path)

There is one active intake path:

1. Public quote tool (`PublicQuoteTool.tsx`) collects service/property info
2. Calls `publicSite.quote.submitV2`
3. Server creates an `instant_quote` record + `lead`, optionally creates customer and full quote
4. Confidence levels determine whether result is estimate vs firm quote

**Archived alternatives (do not use):**
- `instantQuotes.ts` router -- commented out in `server/routers.ts`, duplicate intake
- `workflowEngine.ts` -- cut from active use, test file still exists

## Feature maturity

See `FEATURES.md` for the full list. Key things to know:

- **Automations** -- Beta. Rule CRUD and engine exist. SMS action works, email action logs only, `wait_then_sms` has no real delay.
- **Scheduler** -- Internal/partial. Mock fallback when no real provider configured.
- **AI Receptionist** -- Internal/beta. Twilio -> Anthropic direct API. Optional, not on critical path. Requires `ANTHROPIC_API_KEY`.
- **Expert Cam** -- Archived. Schema, router, and UI pages exist but are disconnected from active routes and nav.
- **Payment Processing** -- Beta. Balance tracking works. No Stripe configured; immediate capture stub.

## Data model notes

- `companyId` exists on most tables but is always `1` in practice
- **Attachments** are polymorphic: `attachableType` ("job" | "quote" | ...) + `attachableId`
- `quotes.publicToken` -- shareable token for client-facing quote view
- Auth: Google OAuth sets a JWT in a cookie; `useAuth()` hook on client reads it

## Adding a new feature

1. Add columns to `drizzle/schema.ts` + run `npx drizzle-kit push`
2. Add DB helper functions to `server/db.ts`
3. Create `server/routers/myFeature.ts` with procedures
4. Register in `server/routers.ts`
5. Add route(s) in `client/src/App.tsx`
6. Add nav item in `client/src/components/CrmLayout.tsx` if needed
