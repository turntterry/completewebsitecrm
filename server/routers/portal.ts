import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  customers,
  invoices,
  instantQuotes,
  jobs,
  leads,
  quotes,
  visits,
} from "../../drizzle/schema";
import { createPayment, getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  }
  return db;
}

export const portalRouter = router({
  /**
   * Read-only snapshot for the customer portal (quotes, jobs/visits, invoices).
   * The client should supply customerId + companyId from a validated magic link.
   */
  getSnapshot: publicProcedure
    .input(
      z.object({
        customerId: z.number().int().positive(),
        companyId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).default(25),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.companyId, input.companyId)
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const quotesRows = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.customerId, input.customerId),
            eq(quotes.companyId, input.companyId)
          )
        )
        .orderBy(desc(quotes.createdAt))
        .limit(input.limit);

      const invoicesRows = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, input.customerId),
            eq(invoices.companyId, input.companyId)
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit);

      const jobsRows = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.customerId, input.customerId),
            eq(jobs.companyId, input.companyId)
          )
        )
        .orderBy(desc(jobs.createdAt))
        .limit(input.limit);

      const jobIds = jobsRows.map(j => j.id);
      const visitsRows =
        jobIds.length > 0
          ? await db
              .select()
              .from(visits)
              .where(inArray(visits.jobId, jobIds))
              .orderBy(desc(visits.scheduledAt))
          : [];

      const latestInstantQuote =
        customer.email
          ? await db
              .select()
              .from(instantQuotes)
              .where(eq(instantQuotes.email, customer.email))
              .orderBy(desc(instantQuotes.createdAt))
              .limit(1)
              .then(rows => rows[0])
          : null;

      return {
        customer,
        quotes: quotesRows,
        invoices: invoicesRows,
        jobs: jobsRows,
        visits: visitsRows,
        propertyIntel: latestInstantQuote?.propertyIntel ?? null,
        preferredSlot: latestInstantQuote?.preferredSlot ?? null,
        preferredSlotLabel: latestInstantQuote?.preferredSlotLabel ?? null,
      };
    }),

  /**
   * Lightweight approval endpoint for the portal. Only flips status if the
   * quote belongs to the customer/company pairing provided by the token.
   */
  approveQuote: publicProcedure
    .input(
      z.object({
        quoteId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        companyId: z.number().int().positive(),
        note: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [quote] = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.quoteId),
            eq(quotes.customerId, input.customerId),
            eq(quotes.companyId, input.companyId)
          )
        )
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      await db
        .update(quotes)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          updatedAt: new Date(),
          internalNotes: input.note
            ? `${quote.internalNotes ?? ""}\nPortal approval note: ${input.note}`.trim()
            : quote.internalNotes ?? null,
        })
        .where(eq(quotes.id, input.quoteId));

      return { success: true, status: "accepted" as const };
    }),

  /**
   * Portal-side payment capture (records a payment + updates invoice balance).
   * This is a stub for card/ACH collection; it immediately records as paid.
   */
  payInvoice: publicProcedure
    .input(
      z.object({
        invoiceId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        companyId: z.number().int().positive(),
        amount: z.number().positive().optional(), // defaults to balance
        method: z.enum(["card", "ach", "cash", "check", "other"]).default("card"),
        note: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.customerId, input.customerId),
            eq(invoices.companyId, input.companyId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const balance = parseFloat(String(invoice.balance ?? invoice.total ?? "0")) || 0;
      const amount = input.amount ?? balance;
      if (amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to pay" });
      }

      await createPayment({
        invoiceId: invoice.id,
        companyId: input.companyId,
        amount: String(amount.toFixed(2)) as any,
        method: input.method,
        notes: input.note ?? "Portal payment",
        paidAt: new Date(),
      });

      const updatedBalance = Math.max(0, balance - amount);
      return { success: true, remainingBalance: updatedBalance };
    }),

  /**
   * Portal-side "request work / rebook" entry. Creates a lead for ops follow-up.
   */
  requestWork: publicProcedure
    .input(
      z.object({
        customerId: z.number().int().positive(),
        companyId: z.number().int().positive(),
        message: z.string().max(2000).optional(),
        services: z.array(z.string()).max(20).optional(),
        preferredDate: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.companyId, input.companyId)
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const [leadResult] = await db.insert(leads).values({
        companyId: input.companyId,
        customerId: input.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName ?? "",
        email: customer.email ?? null,
        phone: customer.phone ?? null,
        address: input.address ?? null,
        services: input.services ?? [],
        notes: input.message ?? undefined,
        status: "new",
        source: "portal_request",
      });

      const leadId = (leadResult as any).insertId as number;
      return { success: true, leadId };
    }),
});
