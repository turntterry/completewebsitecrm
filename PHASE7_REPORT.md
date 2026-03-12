# Phase 7 Findings Report

## 1. Dangling References Found

| Reference | Location | Status | Action Taken |
|-----------|----------|--------|-------------|
| `instantQuotes` router | `server/routers.ts` | Already commented out (Phase 6) | None needed |
| `instantQuotes` table queries | `portal.ts`, `clientHub.ts` | **Acceptable** — reads historical customer data, not the archived router | None needed |
| `workflowEngine` service | `server/services/workflowEngine.ts` | Dead code — exists but never called (commented out in `publicSite.ts` since Phase 6) | None needed — orphaned but harmless |
| `ExpertCam` router | `server/routers.ts` | Already commented out (Phase 6) | None needed |
| `ExpertCam` pages | `ExpertCam.tsx`, `ShareGallery.tsx` | Orphaned — routes disabled, nav hidden, `@ts-nocheck` applied | None needed |
| `ExpertCam` Photos tab | `JobDetail.tsx` | Tab button visible but content commented out — blank area on click | **Fixed**: removed dead tab UI and imports |
| `instantQuotes` tRPC calls | `Requests.tsx` | `(trpc as any).instantQuotes.list.useQuery()` and `.updateStatus.useMutation()` would throw at runtime | **Fixed**: stubbed with safe fallbacks |
| Old `quote.submit` | `publicSite.ts` | Already archived (Phase 6) | None needed |

**Verdict:** Two active runtime references were found and fixed. All archived code is now properly disconnected.

## 2. Fixes Made (This Phase)

### Critical: Double Balance Update in Money Path
**Bug:** Both `invoices.recordPayment` and `portal.payInvoice` called `createPayment()` (which updates invoice balance internally), then immediately overwrote the balance with their own calculation using stale pre-payment values — effectively double-counting every payment.

**Impact:** Every payment recorded would show 2x the actual amount paid, and invoices would show as "paid" prematurely.

**Fix:**
- `server/routers/invoices.ts` — Removed duplicate balance update after `createPayment()` call. Single line: `return { success: true }`.
- `server/routers/portal.ts` — Removed duplicate balance overwrite (lines 472-478). Now re-reads the invoice after `createPayment()` to get the correct balance for webhook event type determination.

**Single source of truth:** `createPayment()` in `server/db.ts` is now the only place that updates `amountPaid`, `balance`, `status`, and `paidAt` on invoices.

## 3. Tests Passed

### Canonical Intake Path (submitV2)
- ✅ Session creation via `publicSite.quote.startSession`
- ✅ Event tracking via `publicSite.quote.trackEvent`
- ✅ Price preview via `publicSite.quote.pricePreview` with correct breakdown
- ✅ `submitV2` normal submission creates `instant_quote` + `lead`
- ✅ Accepted upsells persist via `acceptedUpsells` JSON field
- ✅ Session marked submitted (`submittedAt` set after submit)
- ✅ Manual review fallback for low-confidence inputs (`manualReviewReason` populated)

### Adjacent Systems (Smoke Test)
- ✅ Portal session validation via `portal_sessions` table + `verifyPortalSession()`
- ✅ Invoice balance computation uses SUM(payments) on update (not stale cached values)
- ✅ `createPayment()` is single source of truth for balance updates
- ✅ Webhook dedup via `webhook_events` table with provider+eventId unique index
- ✅ HMAC signature verification on payment webhooks
- ✅ TypeScript compiles clean (`npx tsc --noEmit` — zero errors)

### Known Limitations (Honest)
- Portal payment provider is stub — no Stripe configured, falls back to immediate capture
- SMS requires A2P 10DLC registration for reliable delivery
- `workflowEngine` is dead code but preserved for potential future use

## 4. Recommended Next Rebuild Target

**Target: Payment/Webhook Hardening**

**Rationale:**
1. The double-balance bug we just fixed was the most dangerous defect in the app — it affected the money path
2. `createPayment()` works correctly but has no protection against concurrent calls (two simultaneous payments could race on balance computation)
3. Portal payment is stub-only — connecting Stripe would make the intake→invoice→payment→paid pipeline complete
4. The webhook handler exists and has signature verification + dedup, but hasn't been tested against a real payment provider

**Specific scope:**
- Add row-level locking or atomic balance update to `createPayment()` (use `UPDATE ... SET balance = total - (SELECT SUM(amount) FROM payments WHERE invoiceId = ?) WHERE id = ?` instead of read-then-write)
- Connect Stripe test mode to portal payment flow
- End-to-end test: intake → quote → job → invoice → portal payment → paid status
- Verify webhook fires correctly on real Stripe events

**Not in scope:** AI receptionist, multi-tenant, ExpertCam, broad UI redesign.
