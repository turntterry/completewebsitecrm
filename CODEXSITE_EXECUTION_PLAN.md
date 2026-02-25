# CodexSite Execution Plan (Phased)

This plan converts the current CRM instant quote tool into a premium, QuoteIQ-style experience while keeping it fully admin-editable.

## Repo + delivery workflow

## Repository setup

- New repo name: `CodexSite`
- Source baseline: current `completewebsitecrm` quote stack and APIs
- Branch strategy:
  - `main` = stable releases
  - `feat/<phase>-<scope>` = active work

## Update cadence

- Target checkpoint cadence: **every 5 minutes** during active build windows.
- At each checkpoint:
  1. Commit latest working delta
  2. Push to remote branch
  3. Post short log note (`what changed`, `what next`, `blockers`)

## Practical note

- This cadence is aggressive and best for visibility. For quality, each 5-minute push should still keep the branch in a runnable state (or clearly marked WIP commit messages).

---

## Phase 0 — Project bootstrap (Day 0)

## Goals

- Create `CodexSite` repo and initialize CI/lint/test baseline.
- Mirror current quote functionality so there is no regression at kickoff.

## Deliverables

- Repo initialized and connected to remote.
- Environment template + setup instructions.
- Baseline smoke test pass for current quote flow.

## APIs touched

- None (bootstrap only).

---

## Phase 1 — Premium quote UX shell (Week 1)

## Goals

- Upgrade frontend experience to premium visual style while preserving current logic.
- Keep internal tier keys (`good|better|best`) but support editable customer-facing labels.

## Deliverables

- Service menu cards + sticky quote cart.
- Premium controls (chips/segmented options), sliders only for dimensional inputs.
- In-flow package step with editable public labels.

## APIs needed

- Extend read config endpoint:
  - `publicSite.quote.getPricing` -> include package display metadata and UI preferences.

## Data model

- Add package label/appearance config (JSON) attached to quote settings.

---

## Phase 2 — Pricing/upsell engine v2 (Week 1–2)

## Goals

- Support stackable modifiers and one-click upsells with transparent total changes.

## Deliverables

- Rule-stack evaluator (base + multipliers + modifiers + upsells + travel/minimum).
- Upsell panel integrated before submit.
- Deterministic quote breakdown for every line item.

## APIs needed

- `publicSite.quote.pricePreview` (new): returns live totals and applied rule trace.
- `publicSite.quote.submitV2` (new): saves package selection + accepted upsells.

## Data model

- `quote_packages`
- `quote_package_items`
- `quote_upsells`
- `quote_upsell_rules`

---

## Phase 3 — Admin editability (Week 2)

## Goals

- Make all quote behavior owner-editable without code changes.

## Deliverables

- Admin tabs: Packages, Upsells, Display Labels, UI Theme, Rule Builder.
- Draft/publish workflow for safe changes.
- Validation checks before publish (invalid formulas, empty labels, negative totals).

## APIs needed

- `quotePackages.list|upsert|reorder|toggle|delete`
- `quoteUpsells.list|upsert|rules|reorder|toggle|delete`
- `quoteExperience.get|update|publish|rollback`

## Data model

- `quote_config_versions` for snapshots + rollback.

---

## Phase 4 — Funnel analytics + attribution (Week 2–3)

## Goals

- Turn instant quote into measurable funnel with actionable reporting.

## Deliverables

- Event instrumentation from first view to scheduling.
- Funnel dashboard in admin.
- Source attribution (UTM/referrer/QR campaign).

## APIs needed

- `publicSite.quote.startSession` (new)
- `publicSite.quote.trackEvent` (new)
- `quoteAnalytics.funnelSummary|servicePerformance|upsellPerformance|attribution` (new)

## Data model

- `quote_sessions`
- `quote_session_events`
- `instant_quotes.sessionId` link

---

## Phase 5 — Scheduling handoff + confidence guardrails (Week 3)

## Goals

- Reduce drop-off and prevent over-promising.

## Deliverables

- Post-quote schedule handoff flow.
- Confidence modes in output:
  - exact price
  - estimated range
  - manual confirmation required
- Manual-review routing for low-confidence jobs.

## APIs needed

- Extend `submitV2` response with confidence + scheduling eligibility.
- Optional `quoteScheduling.getSlots|book` integration endpoint.

## Data model

- Confidence snapshot on submitted quote.
- Scheduling eligibility flags.

---

## Phase 6 — Hardening + launch (Week 3)

## Goals

- Production readiness and controlled rollout.

## Deliverables

- E2E tests for core quote path and upsells.
- Performance checks on mobile.
- Beta rollout toggle by service area/campaign.
- Launch checklist + rollback plan.

## APIs needed

- No major new APIs; stabilize and monitor.

---

## Build standards and checkpoint routine

For each 5-minute checkpoint push:

- Commit message format:
  - `wip(phase-X): <short status>`
- Include one-line state note:
  - done / in-progress / next
- Every 30 minutes:
  - squash/reviewable commit for readability

For each phase completion:

- Create PR with:
  - feature summary
  - schema/API diffs
  - screenshots for UI changes
  - test evidence

---

## MVP scope option (7–10 day compressed path)

If speed is the priority, ship this first:

1. Premium menu + sticky cart
2. Package/upsell step with editable labels
3. `pricePreview` API
4. Basic event tracking (`view`, `service_added`, `upsell_accepted`, `submit`)

Then add advanced analytics, versioning, and guardrails in follow-up iterations.
