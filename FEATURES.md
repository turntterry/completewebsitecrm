# Feature Maturity & Status

This document outlines the maturity level of all major systems in the Exterior Experts CRM application. Use this as a reference for feature readiness, known limitations, and roadmap priorities.

**Maturity Levels:**
- 🟢 **Production** — Fully implemented, tested, and ready for customer use
- 🟡 **Beta** — Functional but may have edge cases; use with caution in production
- 🔵 **Internal** — Works for basic use; not intended for customer-facing use
- ⚪ **Stubbed** — Placeholder implementation; core functionality missing
- 🔴 **Unavailable** — Not implemented

---

## Money Path (Quote → Job → Invoice → Payment)

### Quote Funnel
**Status: 🟢 Production**

- ✅ Public quote submission form (`/contact`, `/instant-quote`)
- ✅ Confidence levels: "exact", "range", "manual_review"
- ✅ Auto-creates CRM leads for manual review submissions
- ✅ Auto-creates CRM leads when instant quotes marked "converted"
- ✅ Property intelligence with source tracking (mock vs. real)
- ✅ Draft quote auto-generation from instant quote data

### CRM Pipeline (Leads → Quotes → Jobs → Invoices)
**Status: 🟡 Beta**

- ✅ Lead creation and status tracking
- ✅ Quote generation from leads
- ✅ Job creation from quotes
- ⚠️ **Job → Invoice auto-creation**: Implemented but needs verification under load
- ⚠️ **State transition logging**: Activity events logged but inconsistent in some paths
- ⚠️ **Manual job creation**: Jobs can be created directly without quote; may cause pipeline confusion

**Known Issues:**
- Job auto-creation from accepted quotes is manual (by design)
- Activity logging not guaranteed on all state transitions

### Invoice Generation
**Status: 🟡 Beta**

- ✅ Auto-creates draft invoices when jobs completed
- ✅ Line items populated from job costs
- ✅ Invoice number sequencing
- ⚠️ **Webhook idempotency**: Payment webhooks not fully hardened against duplicates
- ⚠️ **State sync**: Invoice state may drift if payment webhook fails mid-transaction

**Files:** `server/services/invoiceEngine.ts`, `server/routers/invoices.ts`

### Payment Processing
**Status: 🟡 Beta**

- ✅ Payment records linked to invoices
- ✅ Invoice status updated on payment received
- ⚠️ **Stripe integration**: Connected but webhooks may have race conditions
- ⚠️ **Portal payment flow**: Shows invoice status but doesn't reflect real-time payment state
- ⚠️ **Duplicate payment handling**: Not fully tested under network failures

**Files:** `server/routers/payments.ts`, webhooks in `server/_core/index.ts`

**Recommendation:** Before accepting production payments, test webhook idempotency and payment-invoice state sync under failure scenarios.

---

## Marketing & Customer Engagement

### Google Reviews
**Status: 🟢 Production**

- ✅ Review request creation and tracking
- ✅ SMS + email delivery
- ✅ Google Place ID configuration
- ✅ Review link generation

### Campaigns (SMS/Email)
**Status: 🟡 Beta**

- ✅ Campaign creation and editing
- ✅ SMS delivery via Twilio
- ⚠️ **Email delivery**: Not implemented (only SMS works)
- ⚠️ **Campaign templates**: Limited to simple {{firstName}}, {{lastName}} substitution
- ⚠️ **Scheduling**: Sends immediately; no scheduled send support

### Referral Program
**Status: 🟢 Production**

- ✅ Create referrals with credit amounts
- ✅ Track referral status (pending → converted → rewarded)
- ✅ Store credit amount for referrer

---

## CRM Core Features

### Customers
**Status: 🟢 Production**

- ✅ Customer creation, editing, deletion
- ✅ Customer contact history
- ✅ Tags and notes
- ✅ Deduplication by email (upsert logic)

### Quotes
**Status: 🟢 Production**

- ✅ Quote generation from templates
- ✅ Line item editing
- ✅ Public share tokens
- ✅ Status tracking (draft → sent → accepted → archived)
- ✅ PDF export

### Jobs
**Status: 🟢 Production**

- ✅ Job creation and scheduling
- ✅ Job status tracking
- ✅ Cost tracking and budgeting
- ✅ Photo attachments
- ✅ Team member assignment

### SMS Inbox
**Status: 🟡 Beta**

- ✅ Twilio SMS receiving
- ✅ Conversation threading by phone number
- ✅ Outbound SMS sending
- ⚠️ **Conversation context**: Limited; doesn't tie to leads/customers automatically
- ⚠️ **AI assistance**: Stubbed (see AI Receptionist below)

---

## Advanced Features

### AI Receptionist
**Status: 🔵 Internal**

- ✅ SMS routing to AI for "no match" cases
- ✅ Anthropic API integration via Forge proxy
- ⚠️ **Response quality**: Uses flash model; may not handle complex inquiries well
- ⚠️ **Context awareness**: No multi-turn memory; each message treated independently
- ⚠️ **Handoff logic**: No clear escalation path to human

**Files:** `server/_core/llm.ts`, `server/routers/sms.ts`

**Recommendation:** Use only for simple routing/acknowledgments. For customer-facing deployment, implement proper handoff and escalation.

### Automations (Workflow Rules Engine)
**Status: ⚪ Stubbed**

- ✅ Database tables exist (`automationRules`, `automationTriggers`, `automationActions`)
- ❌ No rule creation UI
- ❌ No trigger evaluation engine
- ❌ No action execution engine

**Intended:** Auto-create tasks, send messages, update leads based on triggers (e.g., "when lead contacted 3+ times, mark won")

**Files:** `drizzle/schema.ts` (schema only), no implementation files

### Property Intelligence
**Status: 🔵 Internal**

- ✅ Mock property data generation
- ✅ Property value estimation
- ✅ Tax/lot data mocking
- ⚠️ **Real data**: Not connected to any external API
- ⚠️ **Accuracy**: Mock values are illustrative only

**Files:** `server/services/propertyIntel.ts`

**Recommendation:** Before customer use, connect to real property data API (Zillow, county assessor, etc.) or clearly label all data as estimates.

### Scheduler (Appointment Scheduling)
**Status: ⚪ Stubbed**

- ✅ Database schema exists (`scheduleEntries`, `scheduleBlocks`)
- ❌ No booking UI
- ❌ No calendar view
- ❌ No availability checking

**Intended:** Allow customers to self-service book appointment slots; show availability for field teams

**Files:** `drizzle/schema.ts` (schema only)

### Expert Cam (Virtual Site Inspection)
**Status: ⚪ Stubbed**

- ✅ Database schema exists (`expertCamSessions`, `expertCamMessages`)
- ❌ No video/camera integration
- ❌ No session management UI
- ❌ No real-time messaging

**Intended:** Allow customers to share camera feed with expert for remote site assessment

**Files:** `drizzle/schema.ts` (schema only)

---

## Infrastructure & DevOps

### Database
**Status: 🟢 Production**

- ✅ PostgreSQL via docker-compose
- ✅ Drizzle ORM with migrations
- ✅ Schema strongly typed
- ✅ Database driver unified (postgres-js)

### Authentication
**Status: 🟢 Production**

- ✅ Google OAuth 2.0
- ✅ JWT session cookies
- ✅ Role-based access control (admin, user, guest)
- ✅ Protected procedures via tRPC

### File Storage
**Status: 🟢 Production**

- ✅ AWS S3 via Forge proxy
- ✅ Local fallback to `/public/uploads`
- ✅ Photo attachments for jobs

### API (tRPC)
**Status: 🟢 Production**

- ✅ Type-safe procedures
- ✅ Middleware support (auth, logging)
- ✅ Error handling with TRPC codes
- ✅ All routers properly registered

### Frontend (React + Vite)
**Status: 🟢 Production**

- ✅ Wouter client-side routing
- ✅ React 19
- ✅ HMR during development
- ✅ Build optimization

---

## Known Risks & TODOs

| Feature | Risk Level | Issue | Action |
|---------|-----------|-------|--------|
| Payments | HIGH | Webhook idempotency not hardened | Test under duplicate payment scenarios |
| Invoices | HIGH | Auto-creation under load untested | Load test invoice generation pipeline |
| Email Campaigns | MEDIUM | Not implemented | Decide: add email or remove from UI |
| Automations | MEDIUM | Stubbed; no UI or engine | Build rule engine or remove from nav |
| AI Receptionist | MEDIUM | No escalation path | Implement human handoff flow |
| Property Data | MEDIUM | All mock data | Connect to real API or label clearly |
| Scheduler | LOW | Stubbed; low priority | Implement if customer demand exists |
| Expert Cam | LOW | Stubbed; low priority | Implement if customer demand exists |

---

## Development Guidance

### Adding a New Feature

1. **Planning Phase:**
   - Define maturity level (beta, internal, stubbed)
   - Document known limitations in FEATURES.md
   - Get stakeholder approval before labeling as "production"

2. **Implementation Phase:**
   - Add schema to `drizzle/schema.ts`
   - Implement DB helpers in `server/db.ts`
   - Create router in `server/routers/`
   - Add UI in `client/src/pages/` or `client/src/components/`

3. **Hardening Phase:**
   - Test happy path
   - Test error scenarios (missing data, network failures)
   - Test edge cases (duplicates, race conditions)
   - Update FEATURES.md with actual maturity level

4. **Before Production:**
   - Features should be "production" not "beta" or lower
   - All "high risk" items resolved
   - Integration tests pass
   - Security review completed

### Deprecating a Feature

1. Mark as ⚪ **Stubbed** or 🔴 **Unavailable** in this file
2. Add deprecation notice to UI
3. Communicate timeline to users
4. Remove from navigation after grace period
5. Keep schema/DB code for at least one release (data preservation)

---

## Last Updated

Updated: 2026-03-07
- Database driver: PostgreSQL with postgres-js ✅
- All infrastructure dependencies verified ✅
- Feature audit completed ✅
