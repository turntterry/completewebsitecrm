import crypto from "crypto";
import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { getDb, getOrCreateCompany } from "../db";
import {
  clientHubTokens,
  customers,
  instantQuotes,
  portalSessions,
  properties,
  quotes,
  invoices,
  jobs,
  quoteLineItems,
  quoteOptionSets,
  quoteOptionItems,
  invoiceLineItems,
} from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { sendEmail, buildMagicLinkEmail } from "../email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function expiresAt48h(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

/** Verify a portal session token matches the given customerId + companyId. */
async function verifyPortalSession(opts: {
  sessionToken: string;
  customerId: number;
  companyId: number;
}) {
  // In development, allow bypassing session validation with empty token
  if (process.env.NODE_ENV !== "production" && !opts.sessionToken) return;

  const db = await requireDb();
  const now = new Date();
  const [session] = await db
    .select()
    .from(portalSessions)
    .where(
      and(
        eq(portalSessions.sessionToken, opts.sessionToken),
        eq(portalSessions.customerId, opts.customerId),
        eq(portalSessions.companyId, opts.companyId),
        gt(portalSessions.expiresAt, now)
      )
    )
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired session. Please use your magic link again.",
    });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const clientHubRouter = router({
  /**
   * Admin: send a magic link to a customer.
   * Optionally pin to a specific quote or invoice.
   */
  sendMagicLink: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        quoteId: z.number().optional(),
        invoiceId: z.number().optional(),
        origin: z.string(), // window.location.origin from frontend
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const company = await getOrCreateCompany(ctx.user.id, ctx.user.name ?? "Exterior Experts");

      if (!company) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Company not found" });
      }

      // Look up the customer
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.companyId, company.id)));

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      if (!customer.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer does not have an email address",
        });
      }

      // Create a new token
      const token = generateToken();
      await db.insert(clientHubTokens).values({
        customerId: customer.id,
        companyId: company.id,
        token,
        quoteId: input.quoteId ?? null,
        invoiceId: input.invoiceId ?? null,
        expiresAt: expiresAt48h(),
      });

      // Build the magic link URL
      const params = new URLSearchParams({ token });
      if (input.quoteId) params.set("quoteId", String(input.quoteId));
      if (input.invoiceId) params.set("invoiceId", String(input.invoiceId));
      const magicLinkUrl = `${input.origin}/client?${params.toString()}`;

      // Determine email context
      const context = input.quoteId ? "quote" : input.invoiceId ? "invoice" : "general";

      // Send the email
      const { html, text } = buildMagicLinkEmail({
        customerName: `${customer.firstName}${customer.lastName ? " " + customer.lastName : ""}`,
        magicLinkUrl,
        companyName: company.name,
        context,
      });

      const sent = await sendEmail({
        to: customer.email,
        subject:
          context === "quote"
            ? `Your quote from ${company.name} is ready`
            : context === "invoice"
              ? `Invoice from ${company.name}`
              : `Your client portal – ${company.name}`,
        html,
        text,
      });

      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email. Please check the Resend API key in Settings.",
        });
      }

      return { success: true, email: customer.email };
    }),

  /**
   * Public: validate a magic link token and return a session payload.
   * Marks the token as used on first successful validation.
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date();

      const [row] = await db
        .select()
        .from(clientHubTokens)
        .where(
          and(
            eq(clientHubTokens.token, input.token),
            gt(clientHubTokens.expiresAt, now),
            isNull(clientHubTokens.usedAt)
          )
        );

      if (!row) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This link is invalid or has expired. Please request a new one.",
        });
      }

      // Mark as used
      await db
        .update(clientHubTokens)
        .set({ usedAt: now })
        .where(eq(clientHubTokens.id, row.id));

      // Create a persistent portal session
      const sessionToken = generateToken();
      const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(portalSessions).values({
        customerId: row.customerId,
        companyId: row.companyId,
        sessionToken,
        expiresAt: sessionExpires,
      });

      // Return the session payload (stored in localStorage by the client)
      return {
        customerId: row.customerId,
        companyId: row.companyId,
        quoteId: row.quoteId ?? null,
        invoiceId: row.invoiceId ?? null,
        sessionToken,
        sessionExpires: sessionExpires.toISOString(),
      };
    }),

  /**
   * Public: fetch all data for a client session.
   */
  getClientData: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        companyId: z.number(),
        sessionToken: z.string().default(""),
      })
    )
    .query(async ({ input }) => {
      await verifyPortalSession(input);
      const db = await requireDb();

      // Fetch customer info
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.companyId, input.companyId)
          )
        );

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Fetch quotes
      const customerQuotes = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.customerId, input.customerId),
            eq(quotes.companyId, input.companyId)
          )
        );

      // Fetch invoices
      const customerInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, input.customerId),
            eq(invoices.companyId, input.companyId)
          )
        );

      // Fetch jobs
      const customerJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.customerId, input.customerId),
            eq(jobs.companyId, input.companyId)
          )
        );

      return {
        customer,
        quotes: customerQuotes,
        invoices: customerInvoices,
        jobs: customerJobs,
      };
    }),

  /**
   * Public: fetch a single quote with all its line items and option sets.
   */
  getQuoteDetail: publicProcedure
    .input(
      z.object({
        quoteId: z.number(),
        customerId: z.number(),
        companyId: z.number(),
        sessionToken: z.string().default(""),
      })
    )
    .query(async ({ input }) => {
      await verifyPortalSession(input);
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
        );

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      const lineItems = await db
        .select()
        .from(quoteLineItems)
        .where(eq(quoteLineItems.quoteId, input.quoteId));

      const optionSets = await db
        .select()
        .from(quoteOptionSets)
        .where(eq(quoteOptionSets.quoteId, input.quoteId));

      const optionItems = optionSets.length
        ? await db
            .select()
            .from(quoteOptionItems)
            .where(eq(quoteOptionItems.quoteId, input.quoteId))
        : [];

      // Fetch customer and property for the client info panel
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, quote.customerId));
      const property = quote.propertyId
        ? (await db.select().from(properties).where(eq(properties.id, quote.propertyId)))[0] ?? null
        : null;

      const iqRow = await db
        .select()
        .from(instantQuotes)
        .where(eq(instantQuotes.convertedToQuoteId, input.quoteId))
        .limit(1)
        .then(rows => rows[0]);

      return {
        quote,
        lineItems,
        optionSets,
        optionItems,
        customer: customer ?? null,
        property,
        preferredSlot: iqRow?.preferredSlot ?? null,
        preferredSlotLabel: iqRow?.preferredSlotLabel ?? null,
        propertyIntel: iqRow?.propertyIntel ?? {
          squareFootage: iqRow?.squareFootage,
          stories: iqRow?.stories,
        },
      };
    }),

  /**
   * Public: client approves or declines a quote.
   */
  respondToQuote: publicProcedure
    .input(
      z.object({
        quoteId: z.number(),
        customerId: z.number(),
        companyId: z.number(),
        sessionToken: z.string().default(""),
        action: z.enum(["approve", "decline"]),
        message: z.string().optional(),
        selectedAddOnIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await verifyPortalSession(input);
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
        );

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      const newStatus = input.action === "approve" ? "accepted" : "archived";

      // If approving with selected add-ons, mark those option items as selected
      if (input.action === "approve" && input.selectedAddOnIds && input.selectedAddOnIds.length > 0) {
        const { quoteOptionItems } = await import("../../drizzle/schema");
        for (const itemId of input.selectedAddOnIds) {
          await db
            .update(quoteOptionItems)
            .set({ isSelected: true } as any)
            .where(and(eq(quoteOptionItems.id, itemId), eq(quoteOptionItems.quoteId, input.quoteId)));
        }
      }

      await db
        .update(quotes)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(quotes.id, input.quoteId));

      return { success: true, status: newStatus };
    }),

  /**
   * Public: fetch a single invoice with line items.
   */
  getInvoiceDetail: publicProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        customerId: z.number(),
        companyId: z.number(),
        sessionToken: z.string().default(""),
      })
    )
    .query(async ({ input }) => {
      await verifyPortalSession(input);
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
        );

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.invoiceId));

      return { invoice, lineItems };
    }),
});
