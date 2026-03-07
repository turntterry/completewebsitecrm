# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

This is a **dual-purpose app**: a public marketing website and a private CRM admin, served from one Express + Vite server.

```
server/_core/index.ts     ← Express entry point; registers OAuth, webhooks, tRPC, Vite
server/_core/trpc.ts      ← publicProcedure / protectedProcedure / adminProcedure
server/_core/context.ts   ← tRPC context (req, res, user from JWT cookie)
server/_core/llm.ts       ← invokeLLM() wrapper (gemini-2.5-flash via Forge proxy)
server/routers.ts         ← appRouter: registers all sub-routers
server/routers/*.ts       ← One file per domain (quotes, jobs, customers, etc.)
server/db.ts              ← All Drizzle DB helper functions
server/storage.ts         ← File upload (Forge proxy → local /public/uploads fallback)
drizzle/schema.ts         ← Single source of truth for all table definitions
drizzle/*.sql             ← Numbered migration files (0000–0025+)
```

```
client/src/App.tsx                    ← All Wouter routes (public + /admin/*)
client/src/components/CrmLayout.tsx   ← Admin sidebar layout; navItems array
client/src/lib/trpc.ts               ← tRPC client setup
client/src/pages/                    ← One file per page
```

### Route split
- `/` through `/locations/*`, `/gallery`, `/contact`, etc. → public marketing site
- `/admin/*` → CRM pages, all wrapped in `<CrmLayout>`
- `/portal`, `/client`, `/field` → authenticated non-sidebar pages
- `/quote/:token`, `/share/:token` → public unauthenticated pages

### tRPC patterns
- `publicProcedure` — no auth required (use for public-facing endpoints)
- `protectedProcedure` — requires valid JWT session cookie
- `adminProcedure` — requires `role === 'admin'`
- All routers use `router({...})` from `server/_core/trpc.ts` (not plain objects)
- New routers must be registered in `server/routers.ts`

### Data model highlights
- **Multi-tenant**: most tables have `companyId`; all queries must filter by it
- **Attachments** are polymorphic: `attachableType` ("job" | "quote" | ...) + `attachableId`
- `quotes.publicToken` — shareable token for client-facing quote view (`/quote/:token`)
- Auth: Google OAuth sets a JWT in a cookie; `useAuth()` hook on client reads it

### Adding a new feature checklist
1. Add columns to `drizzle/schema.ts` + run `npx drizzle-kit push`
2. Add DB helper functions to `server/db.ts`
3. Create `server/routers/myFeature.ts` with procedures
4. Register in `server/routers.ts`
5. Add route(s) in `client/src/App.tsx`
6. Add nav item in `client/src/components/CrmLayout.tsx` if needed
