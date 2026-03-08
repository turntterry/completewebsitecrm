/**
 * Test script: Submit instant quote and verify workflow auto-creates customer + draft quote
 *
 * Usage: npx tsx scripts/test-instant-quote.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { customers, quotes, instantQuotes } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { initiateQuoteWorkflow } from "../server/services/workflowEngine";

const TEST_COMPANY_ID = 1;
const TEST_EMAIL = `test-${Date.now()}@test.local`;

async function testInstantQuoteWorkflow() {
  console.log("\n=== INSTANT QUOTE WORKFLOW TEST ===\n");

  let db: any;
  try {
    const conn = await createConnection({
      host: "127.0.0.1",
      user: "crm_user",
      password: "crm_password",
      database: "exterior_experts_crm",
    });

    db = drizzle(conn as any);
    console.log("✅ Database connected\n");
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err);
    process.exit(1);
  }

  try {
    // Step 1: Submit test instant quote
    console.log("📋 Step 1: Submitting test instant quote...");
    const quoteResult = await db.insert(instantQuotes).values({
      companyId: TEST_COMPANY_ID,
      sessionId: Math.floor(Math.random() * 1000000),
      firstName: "Test",
      lastName: "Customer",
      email: TEST_EMAIL,
      phone: "615-555-0123",
      address: "123 Test Ave",
      city: "Cookeville",
      state: "TN",
      zip: "38501",
      subtotal: "499.00",
      total: "599.00",
      finalConfidenceMode: "exact",
      lowConfidenceReasons: [],
      submittedAt: new Date(),
      items: [
        { serviceType: "pressure_washing", finalPrice: 599.0 }
      ],
    });

    const instantQuoteId = (quoteResult as any)[0].insertId;
    console.log(`✅ Instant quote created: ID ${instantQuoteId}`);
    console.log(`   Email: ${TEST_EMAIL}`);

    // Step 2: Trigger the workflow
    console.log("\n🔄 Step 1b: Triggering workflow engine...");
    try {
      const workflowResult = await initiateQuoteWorkflow(
        {
          companyId: TEST_COMPANY_ID,
          customerName: "Test Customer",
          customerEmail: TEST_EMAIL,
          customerPhone: "615-555-0123",
          address: "123 Test Ave",
          city: "Cookeville",
          state: "TN",
          zip: "38501",
          instantQuoteId,
          subtotal: 499.00,
          total: 599.00,
          services: [
            { serviceId: "pressure_washing", serviceName: "Pressure Washing", price: 599.00 }
          ],
        },
        db  // Pass the database connection
      );

      console.log(`✅ Workflow executed`);
      if (workflowResult.errors.length > 0) {
        console.log(`⚠️  Workflow had errors:`);
        workflowResult.errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log(`   ✅ No errors`);
      }
    } catch (workflowErr) {
      console.error(`❌ Workflow failed:`, workflowErr);
    }

    // Step 3: Check if customer was created
    console.log("\n🔍 Step 2: Checking for auto-created customer...");
    const customersFound = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.companyId, TEST_COMPANY_ID),
          eq(customers.email, TEST_EMAIL)
        )
      );

    if (customersFound.length > 0) {
      const customer = customersFound[0];
      console.log(`✅ Customer auto-created: ID ${customer.id}`);
      console.log(`   Name: ${customer.firstName} ${customer.lastName}`);
      console.log(`   Email: ${customer.email}`);
    } else {
      console.log(`❌ NO CUSTOMER CREATED`);
      console.log(`   Expected to find customer with email: ${TEST_EMAIL}`);
    }

    // Step 4: Check if draft quote was created
    console.log("\n🔍 Step 3: Checking for auto-created draft quote...");
    const quotesFound = await db
      .select()
      .from(quotes)
      .where(eq(quotes.companyId, TEST_COMPANY_ID))
      .orderBy(desc(quotes.id))
      .limit(5);

    const draftQuote = quotesFound.find((q: any) => q.status === "draft");

    if (draftQuote) {
      console.log(`✅ Draft quote auto-created: ID ${draftQuote.id}`);
      console.log(`   Quote Number: ${draftQuote.quoteNumber}`);
      console.log(`   Customer ID: ${draftQuote.customerId}`);
      console.log(`   Total: $${draftQuote.total}`);
    } else {
      console.log(`❌ NO DRAFT QUOTE CREATED`);
      console.log(`   Expected to find draft quote for company ${TEST_COMPANY_ID}`);
      console.log(`   Recent quotes found: ${quotesFound.map((q: any) => `${q.id}(${q.status})`).join(", ")}`);
    }

    // Step 5: Summary
    console.log("\n=== SUMMARY ===");
    const customerExists = customersFound.length > 0;
    const quoteExists = !!draftQuote;

    if (customerExists && quoteExists) {
      console.log("✅ ✅ WORKFLOW SUCCESS - Customer and draft quote auto-created!");
      console.log("\nNext steps:");
      console.log("  1. Check admin CRM at /admin/customers");
      console.log("  2. Verify customer appears in list");
      console.log("  3. Check /admin/quotes for draft quote");
    } else if (!customerExists && !quoteExists) {
      console.log("❌ ❌ WORKFLOW FAILED - Nothing auto-created");
      console.log("\nDiagnosis: initiateQuoteWorkflow may not be completing");
      console.log("Check:");
      console.log("  1. Are there database errors in the workflow?");
      console.log("  2. Is upsertCustomer creating the customer?");
      console.log("  3. Is autoGenerateDraftQuote creating the quote?");
    } else if (!customerExists) {
      console.log("⚠️  PARTIAL FAILURE - Draft quote created but no customer");
      console.log("Check: Is upsertCustomer failing?");
    } else {
      console.log("⚠️  PARTIAL FAILURE - Customer created but no draft quote");
      console.log("Check: Is autoGenerateDraftQuote failing?");
    }

    console.log("\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed with error:");
    console.error(err);
    process.exit(1);
  }
}

testInstantQuoteWorkflow().catch(err => {
  console.error(err);
  process.exit(1);
});
