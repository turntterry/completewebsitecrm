# Money Path Verification — Phase 3 Status

## ✅ FIXED: Quote Funnel (3.1)

### Problem
When customers submitted quotes with "exact" or "range" confidence levels, quotes were only stored in the `instantQuotes` table. Admins could update the status to "converted", but no CRM lead was created. Quote data never entered the actual CRM pipeline.

### Solution Implemented
Updated `instantQuotes.updateStatus()` to automatically create a CRM Lead when an instant quote is marked "converted":

1. Fetch the instant quote record
2. Extract customer details, services, and pricing
3. Create a CRM Lead with:
   - Status: "follow_up" (triggers admin action)
   - Source: "instant_quote_converted"
   - All customer and service details
   - Reference to the instant quote in notes
4. Populate `convertedToLeadId` to track the connection
5. Notify owner of conversion

**Result**: Quote funnel now reliable for all confidence levels.

### Property Intel Source
- ✅ Already marked: `mockPropertyIntel()` sets `source: "mock"`
- ✅ Real data would have different source (e.g., "api_provider")
- ✅ Quotes can distinguish synthetic vs real property data

---

## 🔍 VERIFIED: CRM Pipeline (3.2)

### Data Model
```
Leads → Quotes → Jobs → Invoices → Payments
  ↓        ↓       ↓        ↓
leads   quotes   jobs   invoices   payments
```

### Status Fields
- **Leads**: "new", "contacted", "follow_up", "quoted", "won", "lost"
- **Quotes**: "draft", "sent", "accepted", "changes_requested", "expired", "archived"
- **Jobs**: (verified exists; see jobs schema)
- **Invoices**: "draft", "sent", "viewed", "partially_paid", "paid", "overdue", "cancelled"

### Workflow Verification
- ✅ Lead creation from instant quotes: **FIXED**
- ✅ Quote can reference lead ID: schema supports `leadId`
- ✅ Quote can reference customer ID: schema supports `customerId`
- ✅ Job can reference quote ID: schema supports `quoteId`
- ✅ Invoice can reference job ID: schema supports `jobId`
- ✅ Payment can reference invoice ID: schema supports `invoiceId`

### Outstanding Questions
1. **Automatic job creation**: Are jobs auto-created when quotes are accepted?
   - Code shows `jobs.create()` accepts quoteId, but creation is manual
   - May be intentional (admin control) or oversight
   - **Recommendation**: Verify intended workflow with business logic

2. **Invoice auto-creation**: Are invoices auto-created when jobs are completed?
   - Needs verification in jobs/invoices routers
   - **Recommendation**: Check `jobs.update()` status transitions

3. **Activity logging**: Are transitions (lead→quote→job→invoice→payment) logged?
   - `activityEvents` table exists
   - **Recommendation**: Verify all state changes create activity records

---

## ⚠️ NEEDS INVESTIGATION: Invoices & Payments (3.3)

### Requirements
- [ ] Verify invoice creation path (job complete → invoice generated)
- [ ] Verify payment updates invoice state correctly
- [ ] Confirm portal payment flow is honest about status
- [ ] Harden webhook edge cases (duplicate payments)
- [ ] Prevent invoice state drift from payment reality

### Files to Check
- `server/routers/invoices.ts` — invoice lifecycle
- `server/routers/payments.ts` — payment handling
- `server/services/automationEngine.ts` — auto-invoice creation rules
- Webhooks (Stripe/payment provider) — duplicate handling

### Known Risks
- Webhook idempotency: if a payment webhook fires twice, does invoice get double-credited?
- State sync: if payment recorded but webhook fails to update invoice, can they drift?
- Portal honesty: does payment portal show actual vs. expected status?

---

## Summary by Phase

| Phase | Task | Status | Risk |
|-------|------|--------|------|
| 3.1 | Quote funnel | ✅ FIXED | RESOLVED |
| 3.1 | Property intel source | ✅ OK | LOW |
| 3.2 | CRM pipeline structure | ✅ OK | LOW |
| 3.2 | Status transitions | 🔍 NEEDS CHECK | MEDIUM |
| 3.2 | Activity logging | 🔍 NEEDS CHECK | MEDIUM |
| 3.3 | Invoice creation | 🔍 NEEDS CHECK | HIGH |
| 3.3 | Payment sync | 🔍 NEEDS CHECK | HIGH |
| 3.3 | Webhook idempotency | 🔍 NEEDS CHECK | HIGH |

---

## Recommended Next Steps

**High Priority:**
1. Verify invoice auto-creation when jobs complete
2. Verify payment webhook duplicate handling
3. Test state sync: payment recorded → invoice status updated

**Medium Priority:**
4. Verify job auto-creation when quotes accepted (or confirm manual is intentional)
5. Verify activity events logged on all state transitions
6. Test portal payment status accuracy

**Follow-up:**
- Run integration tests on full quote → lead → quote → job → invoice → payment flow
- Load test webhook handling for duplicate payments
- Review automation engine rules for invoice generation
