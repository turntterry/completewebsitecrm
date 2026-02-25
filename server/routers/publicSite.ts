import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  instantQuotes,
  leads,
  quoteSessionEvents,
  quoteSessions,
  quoteToolServices,
  quoteToolSettings,
  serviceConfigs,
} from "../../drizzle/schema";
import { asc, desc, eq } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { SEED_GALLERY } from "@shared/data";
import { nanoid } from "nanoid";

// ─── Public Quote Router ──────────────────────────────────────────────────────
const quoteRouter = router({
  getExperienceConfig: publicProcedure
    .input(
      z.object({ companyId: z.number().int().positive().optional() }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { settings: null, services: [] };

      const companyId = input?.companyId ?? 1;
      const [settings] = await db
        .select()
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);

      const services = await db
        .select()
        .from(quoteToolServices)
        .where(eq(quoteToolServices.companyId, companyId))
        .orderBy(asc(quoteToolServices.sortOrder));

      return {
        settings: settings ?? null,
        services,
      };
    }),

  startSession: publicProcedure
    .input(
      z.object({
        source: z.string().max(120).optional(),
        referrer: z.string().max(500).optional(),
        utmSource: z.string().max(120).optional(),
        utmMedium: z.string().max(120).optional(),
        utmCampaign: z.string().max(120).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const sessionToken = nanoid(24);
      const [result] = await db.insert(quoteSessions).values({
        sessionToken,
        source: input.source ?? null,
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
      });

      return {
        sessionId: (result as any).insertId as number,
        sessionToken,
      };
    }),

  trackEvent: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().min(6).max(64),
        eventName: z.enum([
          "quote_viewed",
          "service_added",
          "service_removed",
          "upsell_shown",
          "upsell_accepted",
          "quote_submitted",
          "schedule_started",
          "schedule_completed",
        ]),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [session] = await db
        .select()
        .from(quoteSessions)
        .where(eq(quoteSessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) {
        return { success: false, reason: "session_not_found" as const };
      }

      await db.insert(quoteSessionEvents).values({
        sessionId: session.id,
        eventName: input.eventName,
        payload: input.payload ?? {},
      });

      return { success: true };
    }),

  getSessionSummary: publicProcedure
    .input(z.object({ sessionToken: z.string().min(6).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [session] = await db
        .select()
        .from(quoteSessions)
        .where(eq(quoteSessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) return { session: null, events: [] };

      const events = await db
        .select()
        .from(quoteSessionEvents)
        .where(eq(quoteSessionEvents.sessionId, session.id))
        .orderBy(desc(quoteSessionEvents.createdAt));

      return { session, events };
    }),

  // Return DB-driven pricing config for the public quote tool.
  // Falls back to sensible defaults if not configured — the QuoteTool handles this.
  getPricing: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {};

    const rows = await db.select().from(serviceConfigs);
    const result: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      // serviceConfigs stores key + config JSON
      const key = (row as any).key ?? (row as any).serviceType;
      if (key) result[key] = (row as any).config ?? (row as any).value ?? {};
    }
    return result;
  }),

  // Accept the website QuoteTool's submission format and store in instant_quotes.
  submit: publicProcedure
    .input(
      z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().min(1),
        address: z.string().min(1),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        distanceMiles: z.number().optional(),
        subtotal: z.number(),
        bundleDiscount: z.number().optional(),
        travelFee: z.number().optional(),
        totalPrice: z.number(),
        preferredDate: z.string().optional(),
        preferredTime: z.string().optional(),
        referralSource: z.string().optional(),
        customerPhotos: z.array(z.string()).optional(),
        items: z.array(
          z.object({
            serviceType: z.string(),
            packageTier: z.enum(["good", "better", "best"]).optional(),
            inputs: z.record(z.string(), z.unknown()).optional(),
            basePrice: z.number(),
            finalPrice: z.number(),
            description: z.string().optional(),
          })
        ),
        sessionToken: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Split name into first/last for the instant_quotes schema
      const nameParts = input.customerName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.customerName;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Convert items to the services array format the CRM uses
      const services = input.items.map(item => ({
        serviceId: item.serviceType,
        serviceName: item.serviceType
          .replace(/_/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase()),
        sizeLabel: item.description ?? item.serviceType,
        sizeValue:
          (item.inputs?.sqft as number) ??
          (item.inputs?.linearFeet as number) ??
          0,
        options: (item.inputs ?? {}) as Record<string, string>,
        price: item.finalPrice,
      }));

      const bundleDiscount = input.bundleDiscount ?? 0;
      const [result] = await db.insert(instantQuotes).values([
        {
          firstName,
          lastName,
          email: input.customerEmail,
          phone: input.customerPhone,
          emailConsent: false,
          smsConsent: false,
          address: input.address,
          city: input.city ?? null,
          state: input.state ?? null,
          zip: input.zip ?? null,
          lat: input.lat !== undefined ? String(input.lat) : null,
          lng: input.lng !== undefined ? String(input.lng) : null,
          squareFootage: null,
          stories: null,
          exteriorMaterial: null,
          propertyType: null,
          services: services as any,
          subtotal: String(input.subtotal.toFixed(2)),
          discountPercent: "0",
          discountAmount: String(bundleDiscount.toFixed(2)),
          total: String(input.totalPrice.toFixed(2)),
          status: "pending",
        },
      ]);

      const quoteId = (result as any).insertId as number;

      if (input.sessionToken) {
        const [session] = await db
          .select()
          .from(quoteSessions)
          .where(eq(quoteSessions.sessionToken, input.sessionToken))
          .limit(1);

        if (session) {
          await db
            .update(quoteSessions)
            .set({ submittedAt: new Date() })
            .where(eq(quoteSessions.id, session.id));

          await db.insert(quoteSessionEvents).values({
            sessionId: session.id,
            eventName: "quote_submitted",
            payload: {
              quoteId,
              totalPrice: input.totalPrice,
              services: input.items.length,
            },
          });
        }
      }

      const serviceList = input.items
        .map(i => i.serviceType.replace(/_/g, " "))
        .join(", ");

      notifyOwner({
        title: `New Quote: $${input.totalPrice.toFixed(2)} from ${input.customerName}`,
        content: `Name: ${input.customerName}\nPhone: ${input.customerPhone}\nEmail: ${input.customerEmail}\nAddress: ${input.address}\nServices: ${serviceList}\nTotal: $${input.totalPrice.toFixed(2)}${input.preferredDate ? `\nPreferred date: ${input.preferredDate}` : ""}`,
      }).catch(() => {});

      return { quoteId, totalPrice: input.totalPrice };
    }),

  // Photo upload for quote tool (requires S3 env vars — gracefully fails without them)
  uploadPhoto: publicProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { storagePut } = await import("../storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `quote-photos/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      } catch {
        throw new Error(
          "Photo upload is not configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME."
        );
      }
    }),
});

// ─── Public Gallery Router ────────────────────────────────────────────────────
const galleryRouter = router({
  list: publicProcedure.query(async () => {
    // Return seed gallery data. When a gallery management feature is added
    // to the CRM, this can be replaced with a DB query.
    return SEED_GALLERY.map((item, i) => ({
      id: i + 1,
      ...item,
      visible: true,
    }));
  }),
});

// ─── Public Contact Router ────────────────────────────────────────────────────
const contactRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        service: z.string().optional(),
        message: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Store as a lead in the CRM so it shows up in the Leads view
      const nameParts = input.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      await db.insert(leads).values([
        {
          firstName,
          lastName,
          email: input.email,
          phone: input.phone ?? null,
          address: input.address ?? null,
          services: input.service ? [input.service] : [],
          notes: input.message ?? null,
          source: "website_contact",
          status: "new",
          companyId: 1, // default company
        } as any,
      ]);

      notifyOwner({
        title: `New Contact Form: ${input.name}`,
        content: `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone ?? "N/A"}\nService: ${input.service ?? "N/A"}\nMessage: ${input.message ?? "N/A"}`,
      }).catch(() => {});

      return { success: true };
    }),
});

// ─── Combined Public Site Router ──────────────────────────────────────────────
export const publicSiteRouter = router({
  quote: quoteRouter,
  gallery: galleryRouter,
  contact: contactRouter,
});
