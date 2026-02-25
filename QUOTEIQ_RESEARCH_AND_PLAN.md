# QuoteIQ Research & Instant Quoting Plan

## What you asked for

You asked for research on QuoteIQ's instant quoting tool, how it works, and how to build a similar capability in this CRM — **research + planning only** (no implementation yet).

## Research constraints in this environment

I attempted external web research, but outbound HTTP requests to public sites are returning `403 Forbidden` from the runtime network gateway, so I could not directly verify QuoteIQ marketing pages, docs, videos, or reviews from this session.

Because of that, this document is split into:

1. **What we can verify now** from your codebase (current instant quote capabilities).
2. **QuoteIQ-style capabilities to benchmark** (industry-standard instant quoting patterns to research/replicate).
3. **A concrete plan** to close the gap in your app.
4. **A research execution checklist** so we can replace assumptions with verified facts quickly.

---

## 1) What your app already has (verified in repo)

Your current product already has a serious instant quoting foundation:

- Public quote experience with multi-step flow (`Address -> Contact -> Services -> Details -> Review -> Schedule -> Submit`) and real-time pricing calculations.
- Per-service pricing configs and global quote settings.
- Submission flow persisting quote requests to DB.
- Standalone link/embed/QR sharing concepts already present in UI.
- Admin-side quote-tool settings and service config screens.

### Verified architecture in your code

- Public quote endpoints are in `publicSite.quote.*` (`getPricing`, `submit`, `uploadPhoto`).
- Protected instant-quote admin/ops endpoints are in `instantQuotes` + related settings routers.
- Frontend has both public quote page(s) and admin quote-tool configuration pages.

### Why this matters

You are **not starting from zero**. You already have the platform primitives needed to evolve toward a QuoteIQ-like product:

- dynamic pricing engine,
- configurable service catalog,
- public quote funnel,
- CRM handoff.

---

## 2) QuoteIQ-style capability map to benchmark

Given external verification is blocked in this session, these are the **likely high-value capabilities** that top instant-quote tools in home services (including tools like QuoteIQ) tend to provide. Treat these as benchmark hypotheses to verify.

## A. Conversion-first quoting UX

- Address-first flow with autocomplete and property context.
- Service-by-service guided input (house wash, roof wash, concrete, windows, etc.).
- Dynamic price updates as users adjust scope.
- Strong trust UI (guarantees, social proof, before/after, "what's included").
- Fast completion on mobile in under ~2 minutes.

## B. Smart pricing logic

- Minimum charges and service floors.
- Tiered or package pricing (Good/Better/Best).
- Bundle discounts and add-on upsells.
- Travel radius / mileage pricing and service-area gating.
- Per-service formulas (sqft, linear feet, stories, roof pitch, etc.).

## C. Lead qualification + booking handoff

- Quote output + CTA to book call/estimate/date.
- Capture and route high-intent leads instantly.
- Automated SMS/email follow-up sequences when quote is abandoned or submitted.
- Staff alerts for hot leads.

## D. Website embed + channel distribution

- Standalone share link.
- Inline embed script and popup widget mode.
- QR codes for offline marketing assets.
- UTM/referral tracking by source campaign.

## E. Revenue optimization

- Suggested add-ons at checkout.
- Anchoring with package comparisons.
- "Order bump" style options (e.g., gutter brightening, rust removal, sealing).
- Conversion analytics per step and per service.

## F. Operational fit

- Push accepted quote into CRM pipeline (lead -> quote -> job).
- Team visibility in inbox/dashboard.
- Optional financing/payment deposit step.

## G. Quote flow logic + upsell tool (explicit research target)

Because you asked to match QuoteIQ's quote flow as closely as possible, the research sprint should explicitly capture:

- **Step sequence and branching logic**
  - Exact step order
  - Which answers cause branch paths (e.g., service type changes form fields)
  - Validation rules at each step
- **Pricing transformation logic**
  - Base price inputs by service
  - Multipliers (size, stories, condition, material, steepness, etc.)
  - Floors/ceilings/minimums and travel adjustments
- **Package upsell mechanics**
  - Where upsell appears (before final total, at summary, post-submit, etc.)
  - Offer structure (Good/Better/Best, add-ons, one-click bumps)
  - Copy style and price anchoring strategy
  - Acceptance tracking and conversion impact measurement
- **Fallback / human handoff logic**
  - Out-of-range or low-confidence cases
  - "Request manual estimate" or call booking fallback

Deliverable from Phase 0 should include a **"Quote Flow & Upsell Decision Map"** with screenshots and exact behavior notes.

---

## 3) Gap analysis: your current app vs QuoteIQ-style target

## Strengths already in your app

- Multi-step instant quote flow.
- Public submissions + CRM persistence.
- Pricing config surfaces in admin.
- Standalone sharing concepts (link/embed/popup/QR) already present in UI copy.

## Likely gaps to close for "best-in-class" parity

1. **Property intelligence depth**
   - If you want QuoteIQ-level confidence, add stronger address enrichment (property attributes, validation, risk flags).

2. **Formula sophistication per service**
   - Expand pricing formulas and guardrails by service type (including complexity multipliers, not just size inputs).

3. **Conversion instrumentation**
   - Track step drop-off, quote completion rates, average quoted value, and upsell attach rate.

4. **Automated recovery flows**
   - Trigger SMS/email sequences for quote starts that do not submit.

5. **Booking/payment bridge**
   - Add optional deposit or direct schedule request after quote acceptance.

6. **Experimental optimization framework**
   - Add A/B testing for CTA copy, package framing, and step order.

---

## 4) Implementation plan (research-informed, no build yet)

## Phase 0 — Verified competitor research sprint (2–4 days)

Goal: replace all assumptions with direct evidence.

- Collect and review:
  - QuoteIQ homepage/product pages
  - onboarding/demo videos
  - help docs/knowledge base
  - review sites and user testimonials
  - pricing tiers/feature matrix
- Build a "Feature Evidence Table" with columns:
  - capability
  - confirmed? (Y/N)
  - source URL
  - proof snippet/screenshot
  - implementation notes for our stack

## Phase 1 — Product requirements definition (1 week)

- Define v1 "Instant Quote 2.0" scope:
  - must-have vs nice-to-have
  - exact service formulas
  - service-area and minimum pricing policy
  - handoff rules into CRM pipeline
- Write success metrics and targets:
  - quote-start rate
  - completion rate
  - quote-to-booking rate
  - average job value

## Phase 2 — Data and pricing model hardening (1–2 weeks)

- Normalize pricing schema for:
  - service formula types
  - multipliers
  - package tiers
  - upsell rules
  - geo rules
- Add versioned pricing snapshots so old quotes remain reproducible.

## Phase 3 — Funnel UX optimization (1–2 weeks)

- Improve mobile-first flow speed.
- Add confidence-building content and transparent "included/excluded" details.
- Add context-aware upsells.
- Add stronger quote summary and CTA outcomes.

## Phase 4 — Automation and attribution (1 week)

- Quote-start and quote-submit events to analytics.
- Abandonment recovery automations.
- UTM/source attribution and campaign reporting.

## Phase 5 — Controlled rollout (1 week)

- Beta on one service area first.
- Compare old vs new funnel performance.
- Tune formulas and copy from real conversion data.

---

## 5) Technical blueprint for your existing stack

## Frontend

- Keep current multi-step quote structure.
- Add a configurable step manifest (to allow easy step ordering and A/B tests).
- Add event instrumentation at each step transition.

## Backend/API

- Keep tRPC public submission model.
- Add quote session entity for partial-progress tracking.
- Add endpoints for analytics and conversion reporting.

## Database

- Extend pricing config tables with formula metadata and effective dates.
- Add quote session + event tables for funnel analytics.
- Add attribution fields (`utm_*`, `referrer`, campaign id).

## Automation

- Reuse existing automation engine for quote funnel triggers:
  - quote_started
  - quote_abandoned
  - quote_submitted
  - quote_accepted

---

## 6) "Definition of done" for QuoteIQ-like parity

You can consider parity reached when:

1. A homeowner can get a trusted quote on mobile in <2 minutes.
2. Pricing reflects real operational constraints (minimums, travel, complexity).
3. Upsells increase average quoted value without harming conversion.
4. Every quote journey is measurable end-to-end.
5. Sales ops can follow up automatically and quickly.
6. Quote flow contributes measurable booked revenue, not just leads.

---

## 7) Immediate next actions (no coding)

1. Run the external competitor research sprint (Phase 0) from an environment with normal web access.
2. Fill the Feature Evidence Table with direct QuoteIQ proofs.
3. Review together and lock v1 scope for your "Instant Quote 2.0" roadmap.
4. Convert this plan into tickets grouped by phase.

If you want, next I can produce the **exact Feature Evidence Table template + ticket breakdown format** so your team can execute research and planning in one pass.

---

## 8) Owner-provided QuoteIQ findings (primary input)

The following findings come from your direct research and should be treated as the highest-priority product input for parity planning.

## A. What InstaQuote is

- QuoteIQ's instant quote tool is **InstaQuote**.
- Businesses configure service library + pricing logic in QuoteIQ.
- Deployment supports public link and iframe embedding.
- Public URL patterns include:
  - `https://pub.quoteiq.io/new/<code>`
  - `https://pub.quoteiq.io/estimates/<code>`

## B. Core flow logic to emulate

1. **Service menu first** with an always-visible running total ("menu + cart" model).
2. **Rule stacking** for pricing:
   - dimensions/square footage
   - dropdown upcharges
   - yes/no modifiers
3. **Quote -> schedule** continuation path as part of conversion flow.
4. **Consistency via standardized inputs** (pricing consistency theme).

## C. Upsell model to explicitly replicate

- Package framing and add-ons are surfaced during quote construction.
- Upsell should feel like ecommerce order-building, not a post-hoc sales call.
- Key behavior to mirror:
  - users add services/options and immediately see total impact,
  - package comparisons anchor higher-value selection,
  - one-click bumps can raise AOV before submit.

## D. Funnel instrumentation direction

Your research indicates QuoteIQ now treats InstaQuote like a measurable funnel with metrics for:

- form views,
- quotes submitted,
- average quote value,
- acceptance/conversion rates,
- top-requested services,
- segmentation of InstaQuote submissions from standard estimates.

Implication for this app: analytics is not optional; it is core product behavior.

## E. Adoption and go-to-market observations

- Prebuilt templates reduce setup friction and improve launch speed.
- QR-based distribution (truck wraps, yard signs, hangers) is a major acquisition channel.
- Public sentiment shows strong value in time savings, but trust/reputation concerns and occasional link-delivery friction exist in community reports.

## F. Strategic cautions to design around

1. **Edge-case complexity**: self-quote forms can miss real-world variables.
2. **Fixed-price risk**: instant price can backfire without guardrails.
3. **Embed constraints**: iframe deployment can introduce UX/SEO tradeoffs.
4. **Ops dependency**: quote form wins only if follow-up + scheduling + payment operations are disciplined.

## G. Copyable spec for Exterior Experts (v1 parity target)

Use this as the product spec baseline for your implementation planning:

- **Flow architecture**
  1. Service menu (card grid + running total)
  2. Service-specific modifiers (dimensions + conditional questions)
  3. Package/upsell step (Good/Better/Best + add-ons)
  4. Contact + property confirmation
  5. Price review + confidence/guardrail messaging
  6. Instant schedule handoff

- **Pricing engine behavior**
  - Base rate per service
  - Modifier stack (size, condition, stories, difficulty)
  - Travel/service-area logic
  - Minimum job floor
  - Guardrail outcomes:
    - exact price (high confidence)
    - estimated range (medium confidence)
    - needs manual review (low confidence)

- **Upsell mechanics**
  - In-flow package anchors (not hidden at end)
  - One-click add-ons with live delta in total
  - Upsell acceptance event tracking

- **Analytics events**
  - quote_viewed
  - service_added
  - upsell_shown
  - upsell_accepted
  - quote_submitted
  - quote_accepted
  - schedule_started
  - schedule_completed

- **Operator controls**
  - templates for common service bundles
  - per-service rules + multipliers + guardrails
  - QR/link/iframe distribution settings
  - funnel dashboard (views -> submit -> accept -> booked)

---

## 9) QuoteIQ upsell research focus: window cleaning + pressure washing

### Environment constraint

Direct first-party QuoteIQ web verification remains blocked in this environment (`403 Forbidden` for `quoteiq.com`, `help.quoteiq.com`, and `pub.quoteiq.io`), so the section below combines:

1. your owner-provided QuoteIQ findings,
2. existing findings already captured in this document,
3. practical service-biz upsell patterns that fit the InstaQuote flow model.

### A. Highest-impact upsells for **window cleaning** (QuoteIQ-style flow)

Recommended order in flow (highest conversion impact first):

1. **Exterior-only -> Inside + Outside upgrade**
   - Why it converts: customer already selected windows; incremental value is obvious.
   - UX pattern: one-tap package jump with immediate total delta.
2. **Screen deep clean add-on**
   - Why it converts: easy to explain and naturally paired with windows.
   - UX pattern: checkbox add-on with short value copy (visibility + airflow).
3. **Track/sill detailing add-on**
   - Why it converts: premium finish signal; supports “best tier” anchoring.
   - UX pattern: available in top package and as à-la-carte bump.
4. **Hard-water / stain treatment**
   - Why it converts: solves a pain point for selected customers with visible stains.
   - UX pattern: conditional upsell shown when user indicates spot/stain issues.

### B. Highest-impact upsells for **pressure washing / exterior cleaning**

Recommended order in flow (highest conversion impact first):

1. **Driveway + walkway bundle bump**
   - Why it converts: obvious visual pair and a strong “whole-frontage clean” outcome.
   - UX pattern: bundle card with savings badge and one-click apply.
2. **House wash + gutter face brightening / gutter cleanout**
   - Why it converts: maintenance jobs are naturally associated in homeowner mindset.
   - UX pattern: add-on chip shown immediately after house wash selection.
3. **Surface sealing/protection add-on (where applicable)**
   - Why it converts: positions protection/longevity as premium value.
   - UX pattern: premium upsell card with expected lifespan copy.
4. **Deck/fence restoration prep add-on**
   - Why it converts: extends project scope when these surfaces are present.
   - UX pattern: conditional upsell when deck/fence service or property attributes match.

### C. Practical “best upsell packs” to test first

For your tool, these are the first bundles to instrument as controlled experiments:

1. **Window Care Pack**
   - Interior + exterior glass
   - screen cleaning
   - track/sill detailing
2. **Curb Appeal Pack**
   - House wash
   - driveway cleaning
   - walkway cleaning
3. **Maintenance Pack**
   - House wash
   - gutter cleanout/brightening
   - optional annual cadence prompt

### D. Conversion rules to keep upsells effective (and trusted)

1. Keep upsell offers to **1–3 max per step** to avoid fatigue.
2. Show **price delta, not just total**, on every upsell action.
3. Prefer **contextual offers** (based on chosen services) over generic offers.
4. Use **package anchoring** with editable customer-facing labels; keep internal keys stable.
5. Track attach-rate + completion-rate together so AOV gains do not hide conversion drop.

### E. Metrics to determine “best” upsells in your app

Treat these as the scorecard for each upsell or package:

- upsell shown rate,
- upsell accept rate,
- quote submit rate after upsell shown,
- schedule completion rate after upsell accepted,
- AOV lift vs control,
- gross margin proxy (if labor/material assumptions are available).

### F. Research backlog to tighten QuoteIQ parity when access is available

When external access is unblocked, capture direct proof for:

1. exact upsell placements by step,
2. default-on vs default-off behavior,
3. copy patterns on highest-performing offers,
4. whether window/pressure offers differ by channel (embed vs public link),
5. how InstaSchedule handoff changes upsell acceptance.
