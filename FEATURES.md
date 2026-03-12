# Feature Status

Quick-reference for what is real, what is beta, and what is archived.

**Levels:** Production | Beta | Internal | Stubbed | Archived

---

## Production

- **Quote Intake** — One canonical path: `publicSite.quote.submitV2`. Confidence levels, auto-lead creation, property intel with source tracking.
- **CRM Pipeline** — Leads, Quotes, Jobs, Invoices. Full CRUD, status tracking, activity logging.
- **Customers** — CRUD, tags, notes, dedup by email.
- **Quotes** — Line items, public share tokens, PDF export, status lifecycle.
- **Jobs** — Scheduling, cost tracking, photo attachments, team assignment.
- **SMS Inbox** — Real Twilio integration. Inbound/outbound, conversation threading by phone number, send/receive working.
- **Invoicing** — Auto-created from jobs, line items, balance tracking, `recordPayment` updates balance + status.
- **Google Reviews** — Review request creation, SMS/email delivery, Place ID config.
- **Customer Portal** — View quotes/invoices, approve quotes (auto-creates job), pay invoices.
- **Auth** — Google OAuth, JWT cookies, RBAC (admin/user/guest), tRPC protected procedures.
- **File Storage** — S3 via Forge proxy, local fallback.
- **Database** — PostgreSQL, Drizzle ORM, strongly typed schema.

## Beta

- **Automations** — Has rule CRUD router (`server/routers/automations.ts`), admin UI, engine (`server/services/automationEngine.ts`) with SMS action and condition evaluation. Email action is placeholder (logs only). `wait_then_sms` runs immediately (no delay scheduling yet).
- **Payment Processing** — Real invoice payment flow with balance updates. No external payment provider (Stripe) configured; falls back to immediate capture. Works correctly for the stub path.
- **Campaigns** — SMS delivery via Twilio. No email delivery. Simple variable substitution. Immediate send only (no scheduling).
- **Referral Program** — Create referrals, track status, store credit amounts.

## Internal / Beta

- **AI Receptionist** — Working. Twilio webhook routes SMS to Anthropic (direct API call, not Forge). Conversation context included. No multi-turn memory or human handoff. Requires `ANTHROPIC_API_KEY`.
- **Scheduler** — Partially real. Slot lookup with external fetch, mock fallback when provider unavailable. Portal-created visits work. No self-service booking UI.
- **Property Intelligence** — Mock data from address hash. Never authoritative. Used in quote flow for estimates.
- **Analytics** — Quote session events, pipeline metrics. Admin dashboards only.

## Stubbed

- **Map Measurement** — Map integration exists for service areas/address only. Full measurement workflow never completed.
- **Email Delivery** — No email provider wired in. Automation `send_email` action just logs.

## Archived

- **Expert Cam** — Photo documentation module groundwork exists (schema tables, DB functions, router, UI pages) but disconnected from active routes and nav. Not maintained.
- **Workflow Engine** — Cut from active use.

---

Updated: 2026-03-11
