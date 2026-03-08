/**
 * Invoice Engine: Auto-creates draft invoices from completed jobs
 *
 * Implements Jobber-style invoice generation:
 * Job completion → Auto-create draft invoice → Pre-populate from job details
 *
 * All operations are idempotent: completing a job multiple times creates only one invoice.
 */

import { getDb } from "../db";
import { logger } from "../_core/observability";
import { TRPCError } from "@trpc/server";
import {
  jobs,
  invoices,
  invoiceLineItems,
  jobCosts,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface AutoCreateInvoiceInput {
  companyId: number;
  jobId: number;
}

interface InvoiceResult {
  invoiceId: number;
  invoiceNumber: number;
  errors: string[];
}

/**
 * Auto-create draft invoice when job is marked completed
 *
 * Idempotent: calling twice with same jobId creates only one invoice
 * All errors are logged but don't block the invoice creation attempt
 */
export async function autoCreateInvoiceFromJob(
  input: AutoCreateInvoiceInput
): Promise<InvoiceResult> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database unavailable",
    });
  }

  const errors: string[] = [];

  try {
    // Step 1: Load job details
    const jobData = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.id, input.jobId),
          eq(jobs.companyId, input.companyId)
        )
      )
      .limit(1);

    if (jobData.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Job ${input.jobId} not found`,
      });
    }

    const job = jobData[0];

    // Step 2: Check if invoice already exists for this job (idempotence)
    const existingInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, input.companyId),
          eq(invoices.jobId, input.jobId)
        )
      )
      .limit(1);

    if (existingInvoices.length > 0) {
      logger.info("invoice.alreadyExists", {
        jobId: input.jobId,
        invoiceId: existingInvoices[0].id,
      });
      return {
        invoiceId: existingInvoices[0].id,
        invoiceNumber: 0,
        errors: ["Invoice already exists for this job"],
      };
    }

    // Step 3: Calculate total from job costs
    let total = "0.00";
    try {
      const jobCostData = await db
        .select({ amount: jobCosts.amount })
        .from(jobCosts)
        .where(eq(jobCosts.jobId, input.jobId));

      const totalAmount = jobCostData.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount.toString()) || 0);
      }, 0);

      total = totalAmount.toFixed(2);
    } catch (err) {
      logger.warn("invoice.costCalculationFailed", { jobId: input.jobId, error: String(err) });
      // Continue with zero total - user can edit before sending
    }

    // Step 4: Get next invoice number
    let nextInvoiceNumber = 1;
    try {
      const lastInvoices = await db
        .select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.companyId, input.companyId))
        .orderBy(desc(invoices.invoiceNumber))
        .limit(1);

      nextInvoiceNumber = (lastInvoices[0]?.invoiceNumber ?? 0) + 1;
    } catch (err) {
      logger.warn("invoice.getNumberFailed", { error: String(err) });
      nextInvoiceNumber = 1;
    }

    // Step 5: Create draft invoice
    const invoiceResult = await db.execute(sql`
      INSERT INTO invoices (
        companyId, customerId, jobId, invoiceNumber, status,
        subtotal, taxRate, taxAmount, tipAmount, total
      )
      VALUES (
        ${input.companyId}, ${job.customerId}, ${input.jobId},
        ${nextInvoiceNumber}, 'draft', ${total}, '0.00', '0.00', '0.00', ${total}
      )
      RETURNING id
    `);

    const invoiceId = (invoiceResult as any)[0]?.id as number;
    if (!invoiceId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create invoice",
      });
    }

    // Step 6: Add line items from job costs (or fallback to job title)
    try {
      const jobCostData = await db
        .select()
        .from(jobCosts)
        .where(eq(jobCosts.jobId, input.jobId));

      if (jobCostData.length > 0) {
        // Use job costs as line items
        for (let i = 0; i < jobCostData.length; i++) {
          const cost = jobCostData[i];
          await db.execute(sql`
            INSERT INTO invoice_line_items (
              invoiceId, sortOrder, description, unitPrice, quantity, total
            )
            VALUES (
              ${invoiceId}, ${i}, ${cost.description}, ${cost.amount}, '1', ${cost.amount}
            )
          `);
        }
      } else {
        // Fallback: use job title as single line item
        await db.execute(sql`
          INSERT INTO invoice_line_items (
            invoiceId, sortOrder, description, unitPrice, quantity, total
          )
          VALUES (
            ${invoiceId}, 0, ${job.title || "Job Services"}, ${total}, '1', ${total}
          )
        `);
      }
    } catch (err) {
      errors.push(`Line item creation failed: ${String(err)}`);
      logger.warn("invoice.lineItemFailed", { invoiceId, error: String(err) });
    }

    logger.info("invoice.autoCreated", {
      invoiceId,
      invoiceNumber: nextInvoiceNumber,
      jobId: input.jobId,
      customerId: job.customerId,
      total,
    });

    return {
      invoiceId,
      invoiceNumber: nextInvoiceNumber,
      errors: errors.length > 0 ? errors : [],
    };
  } catch (err) {
    logger.error("invoice.autoCreate.failed", {
      jobId: input.jobId,
      error: String(err),
    });
    throw err;
  }
}
