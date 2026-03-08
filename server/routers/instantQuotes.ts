import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  instantQuotes,
  quoteToolSettings,
  quoteToolServices,
  leads,
} from "../../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { getActiveCompanyId } from "../_core/tenancy";

const serviceInputSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  sizeLabel: z.string(),
  sizeValue: z.number(),
  options: z.record(z.string(), z.any()),
  price: z.number(),
});

export const instantQuotesRouter = router({
  // Public: get settings for the instant quote tool by standalone token
  getPublicSettings: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [settings] = await db
        .select()
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.standaloneToken, input.token))
        .limit(1);

      if (!settings || !settings.isActive) {
        throw new Error("Quote tool not found or not active");
      }

      const services = await db
        .select()
        .from(quoteToolServices)
        .where(eq(quoteToolServices.companyId, settings.companyId))
        .orderBy(asc(quoteToolServices.sortOrder));

      return {
        settings,
        services: services.filter((s) => s.enabled && s.isActive),
      };
    }),

  // Public: customer submits an instant quote
  submit: publicProcedure
    .input(
      z.object({
        // Customer info
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        emailConsent: z.boolean().default(false),
        smsConsent: z.boolean().default(false),
        // Property info
        address: z.string().min(1),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        squareFootage: z.number().optional(),
        stories: z.number().optional(),
        exteriorMaterial: z.string().optional(),
        propertyType: z.string().optional(),
        // Quote details
        services: z.array(serviceInputSchema),
        subtotal: z.number(),
        discountPercent: z.number().default(0),
        discountAmount: z.number().default(0),
        total: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const result = await db.insert(instantQuotes).values([{
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        emailConsent: input.emailConsent,
        smsConsent: input.smsConsent,
        address: input.address,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        lat: input.lat !== undefined ? String(input.lat) : null,
        lng: input.lng !== undefined ? String(input.lng) : null,
        squareFootage: input.squareFootage || null,
        stories: input.stories || null,
        exteriorMaterial: input.exteriorMaterial || null,
        propertyType: input.propertyType || null,
        services: input.services as unknown as { serviceId: string; serviceName: string; sizeLabel: string; sizeValue: number; options: Record<string, string | number>; price: number; }[],
        subtotal: String(input.subtotal.toFixed(2)),
        discountPercent: String(input.discountPercent.toFixed(2)),
        discountAmount: String(input.discountAmount.toFixed(2)),
        total: String(input.total.toFixed(2)),
        status: "pending",
      }]).returning({ id: instantQuotes.id });

      // Notify owner (non-blocking)
      const serviceList = input.services.map((s) => s.serviceName).join(", ");
      notifyOwner({
        title: `New Instant Quote — ${input.firstName} ${input.lastName}`,
        content: `**Address:** ${input.address}\n**Services:** ${serviceList || "None"}\n**Total:** $${input.total.toFixed(2)}\n**Contact:** ${input.email || ""} ${input.phone || ""}`,
      }).catch(() => {});

      return { success: true, id: result[0]?.id };
    }),

  // Protected: owner/staff list all instant quotes
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "booked", "declined", "converted", "all"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(instantQuotes)
        .orderBy(desc(instantQuotes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      if (input.status === "all") return rows;
      return rows.filter((r) => r.status === input.status);
    }),

  // Protected: update status of an instant quote
  // When marked "converted", creates a CRM lead to ensure quote enters the pipeline
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "booked", "declined", "converted"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const companyId = getActiveCompanyId(ctx.user);

      // Fetch the quote to use its data if converting
      const [quote] = await db
        .select()
        .from(instantQuotes)
        .where(eq(instantQuotes.id, input.id))
        .limit(1);

      if (!quote) throw new Error("Quote not found");

      // If converting, create a CRM lead from the instant quote
      let convertedLeadId: number | null = null;
      if (input.status === "converted" && !quote.convertedToLeadId) {
        const nameParts = (quote.firstName + " " + quote.lastName)
          .trim()
          .split(/\s+/);
        const firstName = nameParts[0] ?? quote.firstName;
        const lastName = nameParts.slice(1).join(" ") || quote.lastName || "";

        const leadResult = await db.insert(leads).values({
          companyId,
          firstName,
          lastName,
          email: quote.email ?? null,
          phone: quote.phone ?? null,
          address: quote.address ?? null,
          city: quote.city ?? null,
          state: quote.state ?? null,
          zip: quote.zip ?? null,
          services: (quote.services as any)?.map((s: any) => s.serviceName) ?? [],
          source: "instant_quote_converted",
          status: "follow_up",
          notes: `Converted from instant quote #${quote.id}. Price: $${quote.total}. Services: ${
            (quote.services as any)?.map((s: any) => s.serviceName).join(", ") ||
            "N/A"
          }`,
        }).returning({ id: leads.id });

        convertedLeadId = leadResult[0]?.id as number;

        // Update the instant quote to track the conversion
        await db
          .update(instantQuotes)
          .set({
            status: input.status,
            convertedToLeadId: convertedLeadId,
          })
          .where(eq(instantQuotes.id, input.id));

        notifyOwner({
          title: `Instant Quote Converted: Lead #${convertedLeadId}`,
          content: `Quote #${input.id} ($${quote.total}) from ${firstName} ${lastName} has been converted to Lead #${convertedLeadId}.`,
        }).catch(() => {});
      } else {
        // Just update status if not converting or already converted
        await db
          .update(instantQuotes)
          .set({ status: input.status })
          .where(eq(instantQuotes.id, input.id));
      }

      return { success: true, convertedLeadId };
    }),
});
