# CRM Automation Pipeline Research: Jobber vs QuoteIQ

## Executive Summary
Industry leaders (Jobber, QuoteIQ) have shifted from "manual workflow steps" to "event-driven automation pipelines." Key insight: data flows through a tightly connected sequence of auto-generated records, not manual user actions.

---

## Jobber's Automated Pipeline Architecture

### Quote Generation Flow
- **Trigger**: Customer submits service request (phone, web form, or import)
- **Auto-draft quote**: System creates draft quote instantly using:
  - Historical job templates for that service + location
  - Material costs from supplier database
  - Labor estimates based on crew rates
  - Markup rules (margin targets)
- **Delivery**: Auto-sent to customer via SMS/email with portal link
- **Customer action**: Approve, request changes, or decline
- **Admin fallback**: If auto-draft confidence is low, mark for manual review

### Quote Acceptance → Job Automation
- **Trigger**: Customer clicks "Accept" in portal
- **Auto-create job**:
  - Copy all scope, line items, and pricing from quote
  - Create as "scheduled" or "draft" depending on admin rules
  - Assign to crew/schedule (if pre-set in quote template)
  - Generate default job phases (inspection → proposal → completion)
- **Auto-notify**: Crew receives job assignment SMS; customer gets scheduling link
- **No conversion step**: Quote and job are different entities. Acceptance doesn't "convert"—it auto-creates.

### Automation Follow-up Sequences
- **Declined quotes**: Auto-trigger follow-up sequence (day 3, 7, 14)
- **Overdue quotes**: Auto-archive or auto-send reminder
- **Job completion**: Auto-generate invoice with line items from job
- **Invoice payment**: Auto-close job if payment received

### Key Design Principle
All automations are **idempotent and event-driven**: If a customer accepts a quote twice, the system doesn't create two jobs. If a job completion event fires twice, the invoice doesn't double-generate.

---

## QuoteIQ's InstaQuote Model

### Instant Quote Submission
- **Trigger**: Customer fills instant quote form on landing page
- **Immediate response**: AI calculates rough estimate from form inputs (roof size, material, etc.)
- **Customer sees**:
  - Price range (e.g., "$8,000 - $12,000")
  - Confidence level (high/medium/low based on input completeness)
  - "Book now" option if high confidence
  - "Request detailed quote" if uncertain

### Automation on Submission
1. **Customer auto-created**: Email + phone dedup; if new, INSERT; if existing, UPDATE
2. **Instant quote record created** with form data and AI-calculated price
3. **Draft quote auto-generated** (if high confidence):
   - Copy AI price to quote
   - Add standard line items for that service type
   - Create as "draft" awaiting review
4. **Job auto-created** (only if customer chose "Book now"):
   - Status: "draft"
   - Copy scope from instant quote + draft quote
   - Marked for crew assignment

### Portal Experience
- **Customer portal**: View quote, approve/decline, see job status, schedule crew
- **Admin dashboard**: See all inbound quotes, auto-generated jobs, track conversion rate
- **Analytics**: Track which form fields predict acceptance, which price ranges convert

### Key Design Principle
**Instant book = zero-step job creation**. If customer approves at form time, the system has already created a customer, draft quote, and draft job. Admin reviews, assigns crew, schedules. No extra clicks.

---

## Critical Differences from Manual Workflows

| Step | Manual CRM | Jobber/QuoteIQ |
|------|-----------|------------------|
| Customer creation | Manual after form | Auto on form submit |
| Quote generation | Manual by admin | Auto-draft from template |
| Quote delivery | Manual email/SMS | Auto via portal + SMS |
| Job creation | Manual after quote accept | Auto on quote accept |
| Invoice generation | Manual after job complete | Auto when job marked complete |
| Follow-up sequences | Manual or missing | Automatic based on status |

---

## Data Flow Architecture

```
Form submission
    ↓
[Auto] customer (upsert via email+phone)
    ↓
[Auto] instant_quote (record the form input)
    ↓
[Auto] quote (draft, using template + AI estimate)
    ↓
[If high confidence] portal link sent to customer SMS
    ↓
Customer decision in portal
    ↓
[If accepted] [Auto] job (draft, copy scope from quote)
    ↓
Admin reviews, assigns crew, sets schedule
    ↓
[On job completion] [Auto] invoice (copy line items)
    ↓
[On payment received] [Auto] close job + invoice
```

---

## Implementation Checklist for App 2

### Phase A: Request → Customer → Quote Automation
- [ ] Add `initiate_workflow()` helper in `server/services/`
- [ ] Update instant quote route to call helper instead of just INSERT
- [ ] Helper creates/upserts customer (raw SQL for dedup)
- [ ] Helper auto-generates draft quote from template
- [ ] Helper sends SMS with portal link
- [ ] Tests: verify idempotency (double-submit = single customer + quote)

### Phase B: Instant Book Feature
- [ ] Add `instantBook` checkbox to instant quote form
- [ ] If checked: helper also creates draft job
- [ ] Job status = "draft", marked for crew assignment
- [ ] Tests: verify job has scope + line items from quote

### Phase C: Quote Acceptance Automation
- [ ] Add webhook/listener for quote acceptance in portal
- [ ] On acceptance: auto-create job (idempotent)
- [ ] Notify customer of next steps (crew assignment)
- [ ] Tests: verify accept twice = one job

### Phase D: Automation Sequences
- [ ] Use existing automationEngine for follow-up SMS
- [ ] Add rule: declined quote → day 3/7/14 follow-up
- [ ] Add rule: job complete → auto-generate invoice
- [ ] Tests: verify sequences fire once per status change

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Double-creation of customer/quote/job | Use unique constraints + idempotent logic (ON DUPLICATE KEY UPDATE) |
| Quote template missing for service type | Fall back to blank draft quote, flag for admin review |
| Customer SMS fails | Queue retry; show warning in portal |
| Automations create orphaned records | Add foreign keys + cascade rules |
| Automation fire-rate too high | Use event deduplication (track last-fired timestamp) |

---

## Recommended Start

1. **Do NOT** expose "instant book" to customers yet
2. Build Phase A first: customer upsert + auto-quote generation
3. Verify idempotency with tests
4. Then add Phase B (instant book) once foundation is solid
5. Phase C (quote acceptance) follows naturally once Phase A works
