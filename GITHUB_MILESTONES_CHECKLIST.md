# Instant Quote v2 — Milestones Checklist

> Visual progress tracker for GitHub. Keep this file pinned in the repo and update checkboxes at the end of each phase.

## Overall Progress

- **Progress:** `6 / 7 milestones complete` (86%)
- **Current phase:** `Phase 6 — Hardening + launch`
- **Environment:** Running on `http://localhost:3001` (port 3000 occupied by older build)
- **DB migrations applied:** 0000–0016 (includes Phase 1–5 schema: quote_sessions, quote_session_events, quote_config_versions, upsellCatalog, customerTierLabels, premiumTheme)
- **Last updated by:** Claude Code (Sonnet 4.6) — merged Phase 1–5 Codex branch into fresh main-branch baseline; all migrations applied; app running

---

## Milestones

- [x] **Phase 0 — Branch + delivery workflow setup**
  - [x] Branch strategy defined
  - [x] Execution plan documented
  - [x] Phase gate process agreed (stop after each phase)

- [x] **Phase 1 — Premium quote UX foundation**
  - [x] Public quote flow upgraded
  - [x] Tier labels integrated
  - [x] Improved review + submit UX

- [x] **Phase 2 — Pricing + upsell engine v2**
  - [x] Upsell step added to public flow
  - [x] Server-side `pricePreview` implemented
  - [x] `submitV2` supports upsells/session linkage

- [x] **Phase 3 — Admin editability + versioning**
  - [x] Upsell CRUD APIs added
  - [x] Rules + ordering controls wired
  - [x] Experience draft/publish/rollback flows added

- [x] **Phase 4 — Funnel analytics + attribution**
  - [x] Session/event tracking foundation in place
  - [x] Analytics router added (`funnelSummary`, `servicePerformance`, `upsellPerformance`, `attribution`)
  - [x] Admin analytics card added in Quote Tool

- [x] **Phase 5 — Scheduling handoff + confidence guardrails**
  - [x] Confidence modes finalized (`exact`, `range`, `manual review`)
  - [x] Scheduling eligibility + handoff UX complete
  - [x] Low-confidence routing workflow implemented

- [ ] **Phase 6 — Hardening + launch**
  - [x] E2E smoke suite for quote funnel and upsells
  - [ ] Error handling + observability pass
  - [ ] Launch checklist + rollback plan complete

---

## Next Up (Immediate)

- [ ] Begin **Phase 6 hardening: e2e smoke + launch checklist**

---

## Update Rule

At the end of every phase:

1. Mark completed milestone checkboxes.
2. Update **Overall Progress** count.
3. Move **Current phase** to the next active phase.
4. Commit this file with that phase’s code updates.
