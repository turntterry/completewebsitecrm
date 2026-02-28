# Architecture Map (End-to-End)

This repository runs as a **single Node/Express process** that serves:

- a **tRPC API** (`/api/trpc`),
- auth/webhook HTTP endpoints (`/auth/*`, `/api/webhooks/twilio/inbound`), and
- the **React CRM + public website** frontend (via Vite in dev, static assets in prod).

## 1) Runtime entrypoint and request surface

## Boot process

1. `server/_core/index.ts` starts Express + HTTP server.
2. Registers middleware for large JSON/form payloads (`50mb`).
3. Mounts OAuth routes (`/auth/login`, `/auth/callback`).
4. Mounts Twilio inbound SMS webhook (`/api/webhooks/twilio/inbound`).
5. Mounts tRPC middleware at `/api/trpc` with `appRouter` + `createContext`.
6. In development, uses Vite middleware; in production, serves static assets.
7. Chooses the first available port starting at `PORT` (default `3000`).

## Public HTTP endpoints

- `GET /auth/login` and `GET /auth/callback` (Google OAuth flow).
- `POST /api/webhooks/twilio/inbound` (Twilio -> CRM + optional AI auto-reply).
- `POST/GET /api/trpc/*` (all typed app procedures).
- Frontend routes (`/`, `/admin/*`, etc.) rendered by the React app.

## 2) Frontend architecture (public site + CRM app)

## Frontend bootstrap

- `client/src/main.tsx` wires:
  - React Query `QueryClient`
  - typed tRPC client (`httpBatchLink` to `/api/trpc`)
  - `credentials: include` so cookie auth is sent
  - centralized unauthorized handling: if tRPC error message equals `UNAUTHED_ERR_MSG`, redirect to login.

## Route model

- `client/src/App.tsx` uses `wouter` and mixes:
  - **Public marketing site routes** (`/`, `/services/:slug`, `/gallery`, `/contact`, `/instant-quote`, ...)
  - **Shared routes** (`/login`, `/client`, `/field`)
  - **CRM admin routes** under `/admin/*` (dashboard, clients, leads, jobs, invoices, sms/messages, marketing, automations, AI receptionist, settings, etc.)

## Auth gating in UI

- `client/src/components/CrmLayout.tsx` wraps admin pages and requires auth via `useAuth()`.
- `client/src/_core/hooks/useAuth.ts` calls `trpc.auth.me` and exposes `isAuthenticated`, `logout`, loading state.
- Unauthenticated users are redirected to login URL.

## 3) API architecture (tRPC composition)

## Root router

- `server/routers.ts` composes `appRouter` from domain routers:
  - `company`, `customers`, `leads`, `quotes`, `jobs`, `invoices`, `dashboard`, `attachments`, `instantQuotes`, `clientHub`, `productCatalog`, `quoteToolSettings`, `instantQuoteConfig`, `serviceConfig`, `automations`, `marketing`, `sms`, `aiReceptionist`, and public-facing `publicSite`.
- Also includes `auth.me` and `auth.logout`.

## Procedure security model

- `server/_core/trpc.ts` defines:
  - `publicProcedure` (no auth required)
  - `protectedProcedure` (requires authenticated `ctx.user`)
  - `adminProcedure` (requires `ctx.user.role === 'admin'`)

## Request context

- `server/_core/context.ts` authenticates each request via `sdk.authenticateRequest(req)`.
- If auth fails, context still returns `user: null` so public procedures continue to work.

## Example domain pattern (Leads)

- `server/routers/leads.ts` demonstrates standard pattern:
  - zod input validation
  - `protectedProcedure` for CRM-only endpoints
  - company scoping via `getOrCreateCompany(ctx.user.id, ...)`
  - DB access through functions in `server/db.ts`
  - one `publicProcedure` (`submitPublic`) for website lead capture.

## 4) Authentication/session flow (Google OAuth + cookie JWT)

## Login sequence

1. Browser hits `GET /auth/login`.
2. Server creates OAuth state + redirects to Google consent.
3. Google redirects back to `GET /auth/callback` with code/state.
4. Server verifies state + ID token, upserts local user (`db.upsertUser`).
5. Server signs session JWT (`sdk.createSessionToken`) and sets session cookie (`COOKIE_NAME`).
6. Browser redirected to `/admin`.

## Session validation

- `server/_core/sdk.ts` parses cookie, verifies HS256 JWT with `ENV.cookieSecret`, resolves user by `openId`, updates `lastSignedIn`, and returns the user object.
- tRPC protected procedures rely on this resolved `ctx.user`.

## Logout

- `auth.logout` in `server/routers.ts` clears the session cookie using shared cookie options.

## 5) Data layer and storage model

## DB access strategy

- `server/db.ts` is a centralized data-access module (CRUD/query helpers).
- Uses Drizzle ORM with MySQL (`drizzle-orm/mysql2`).
- Uses lazy singleton connection via `getDb()` using `DATABASE_URL`.
- Routers/services call this module instead of writing SQL inline.

## Schema domains

- `drizzle/schema.ts` defines many business tables for CRM and website flows, including:
  - identity/company (`users`, `companies`)
  - CRM core (`customers`, `properties`, `leads`, `quotes`, `quote_line_items`, `jobs`, `visits`, `invoices`, `payments`, attachments)
  - growth/public flows (`campaigns`, `referrals`, `review_requests`, `instant_quotes`, quote tool config tables)
  - ops extensions (`job_costs`, `sms_conversations`, `sms_messages`, `automation_rules`, `automation_logs`)

## Migrations

- SQL migrations are stored in `drizzle/*.sql`; snapshots/journal in `drizzle/meta/*`.

## 6) Integrations and async-ish workflows

## Twilio inbound + AI receptionist

- `server/webhooks/twilioWebhook.ts` receives inbound SMS, associates sender with customer, persists conversation/message, and (if enabled) can generate/send reply via AI receptionist + Twilio outbound API.
- AI text generation lives in `server/services/aiReceptionist.ts` (Anthropic API call with business-hours + customer/job context prompt).

## Automation engine

- `server/services/automationEngine.ts` evaluates enabled automation rules on trigger events (e.g., `job_created`, `quote_accepted`, `payment_received`) and executes actions (SMS now, email/note placeholders).
- Expected integration point: call `fireAutomation(...)` from domain mutation paths.

## Public website API surface

- `server/routers/publicSite.ts` bundles public quote tool, gallery, and contact-form procedures.
- Public quote flow can persist instant quotes, notify owner, and optionally upload photos via S3-backed storage adapter.

## 7) End-to-end request/feature flows

## A) Admin CRM page load (authenticated)

1. Browser requests `/admin/...` route.
2. React app mounts, `CrmLayout` calls `trpc.auth.me`.
3. tRPC context resolves user from cookie.
4. If authenticated, page-specific queries/mutations run (e.g., leads/jobs/invoices).
5. Router handlers validate input -> resolve company scope -> call `server/db.ts` -> return typed data to React Query cache.

## B) Public instant quote submission

1. Visitor uses `/instant-quote` page.
2. Frontend calls `publicSite.quote.submit` (publicProcedure).
3. Backend writes record to `instant_quotes`, sends owner notification, and returns quote id + computed total.
4. CRM users can later act on the generated lead/quote artifacts through admin views.

## C) Inbound customer SMS

1. Twilio POSTs message to `/api/webhooks/twilio/inbound`.
2. Backend resolves customer + conversation and stores inbound message.
3. If AI receptionist is enabled and configured, generate AI reply, send outbound SMS via Twilio, persist outbound message.
4. CRM message inbox reads conversation/message records via SMS router endpoints.

## 8) Configuration/environment dependencies

`server/_core/env.ts` centralizes environment reads for:

- core runtime (`DATABASE_URL`, cookie secret, production mode)
- auth (`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `OWNER_OPEN_ID`)
- integrations (`TWILIO_*`, `ANTHROPIC_API_KEY`, optional Forge vars)

If a required env var is missing, many paths degrade gracefully (return null/no-op) but some endpoints respond with explicit errors.

## 9) Practical extension points

- Add new API domain: create `server/routers/<domain>.ts`, export router, compose in `server/routers.ts`.
- Add new protected page: create `client/src/pages/<Page>.tsx`, add route under `/admin/*` in `client/src/App.tsx`, add nav item in `CrmLayout` if needed.
- Add DB feature: update `drizzle/schema.ts`, generate migration, implement data helpers in `server/db.ts`, expose through router procedures.
- Add background/triggered behavior: wire `fireAutomation(...)` calls where business events occur.
