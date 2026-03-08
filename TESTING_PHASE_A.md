# Phase A Test Plan: Quote Automation Workflow

## Unit Tests (automated, all passing)
✅ 5 tests in `server/services/workflowEngine.test.ts`
- Auto-create customer from instant quote
- Auto-generate draft quote
- Idempotency: duplicate email = single customer
- Link instant_quote → draft quote
- Error handling for non-critical failures

## Integration Test: End-to-End Workflow
**Goal**: Verify complete flow from form submission to draft quote + customer

### Manual Test Scenario
1. **Submit instant quote form**
   - Visit public quote page
   - Fill form: name, email, phone, address, select services
   - Submit with "exact" confidence level
   - **Verify**: instant_quotes record created

2. **Check customer auto-created**
   - Query: `SELECT * FROM customers WHERE email = '<test@example.com>'`
   - **Verify**:
     - One customer record exists (no duplicates)
     - firstName, lastName, phone match form input
     - leadSource = "instant_quote"

3. **Check draft quote auto-generated**
   - Query: `SELECT * FROM quotes WHERE customerId = <id>`
   - **Verify**:
     - One quote record exists
     - Status = "draft"
     - subtotal + total match form price
     - Message = "Auto-generated from instant quote submission"

4. **Check quote line items**
   - Query: `SELECT * FROM quote_line_items WHERE quoteId = <id>`
   - **Verify**:
     - Line items match submitted services
     - descriptions, unitPrice, total correct

5. **Check instant_quote linked**
   - Query: `SELECT convertedToQuoteId FROM instant_quotes WHERE id = <id>`
   - **Verify**: convertedToQuoteId points to the draft quote

6. **Check activity log**
   - Query: `SELECT * FROM activity_events WHERE subjectType = 'quote' AND subjectId = <id>`
   - **Verify**: Event type = "quote_auto_generated"

### Regression Test: Manual-Review Submissions
**Goal**: Verify workflow doesn't auto-create on low-confidence submissions

1. **Submit quote with "manual_review" confidence**
   - Submit form with manual_review mode
   - **Verify**: instant_quotes created, but workflow doesn't trigger
   - **Verify**: No customer or draft quote auto-created (manual path only)

### Idempotency Test: Double-Submit Same Email
**Goal**: Verify no duplicate customers on re-submission

1. **Submit instant quote form (first time)**
   - Note customer ID and quote ID

2. **Submit again with same email, different service**
   - **Verify**: Same customer ID (no duplicate)
   - **Verify**: New quote ID created (separate draft quote)
   - **Verify**: Only ONE customer record in database for that email

## Database Validation Queries
```sql
-- Check customers created
SELECT email, COUNT(*) as count FROM customers
WHERE companyId = 1 GROUP BY email HAVING count > 1;

-- Check instant_quote links
SELECT id, email, convertedToQuoteId FROM instant_quotes
WHERE convertedToQuoteId IS NOT NULL LIMIT 10;

-- Check draft quotes created from instant_quotes
SELECT q.id, q.customerId, q.status, q.total,
       COUNT(qli.id) as lineItemCount
FROM quotes q
LEFT JOIN quote_line_items qli ON q.id = qli.quoteId
WHERE q.message LIKE '%Auto-generated%'
GROUP BY q.id;
```

## Test Success Criteria
- [ ] All 5 unit tests pass
- [ ] Manual test scenario completes without errors
- [ ] Customer auto-created with correct data
- [ ] Draft quote auto-generated with correct line items
- [ ] instant_quote properly linked to draft quote
- [ ] Activity log records auto-generation event
- [ ] Idempotency verified (no duplicate customers)
- [ ] Manual-review submissions skip auto-creation
- [ ] No regression in existing tests (64/72 baseline)

## Known Issues to Investigate
- publicToken field exists in schema but not in database (skip for now)
- 8 tests failing in phase2/phase6 due to datetime millisecond formatting (pre-Phase A)

## Next Steps
After Phase A tests pass:
1. Phase B: Instant-book auto-job creation
2. Phase C: Quote acceptance → job automation
3. Phase D: Event-driven follow-up sequences
