import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { logger } from "../_core/observability";
import { getActiveCompanyId, DEFAULT_COMPANY_ID } from "../_core/tenancy";
import {
  instantQuotes,
  leads,
  quoteSessionEvents,
  quoteSessions,
  quoteToolServices,
  quoteToolSettings,
  serviceConfigs,
} from "../../drizzle/schema";
import { asc, desc, eq, and, inArray, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { SEED_GALLERY } from "@shared/data";
import { nanoid } from "nanoid";
import { mockAvailabilityProvider } from "@shared/availability";
// ARCHIVED: workflowEngine not production-ready
// import { initiateQuoteWorkflow } from "../services/workflowEngine";

// ─── Public Quote Router ──────────────────────────────────────────────────────
const quoteRouter = router({
  getExperienceConfig: publicProcedure
    .input(
      z.object({ companyId: z.number().int().positive().optional() }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { settings: null, services: [] };

      const companyId = input?.companyId ?? getActiveCompanyId(ctx.user);
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
        companyId: z.number().int().positive().optional(),
        source: z.string().max(120).optional(),
        referrer: z.string().max(500).optional(),
        utmSource: z.string().max(120).optional(),
        utmMedium: z.string().max(120).optional(),
        utmCampaign: z.string().max(120).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

      const sessionToken = nanoid(24);
      const companyId = input.companyId ?? getActiveCompanyId(ctx.user);
      const result = await db.insert(quoteSessions).values({
        companyId,
        sessionToken,
        source: input.source ?? null,
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
      }).returning({ id: quoteSessions.id });

      return {
        sessionId: result[0]?.id ?? 0,
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
          "upsell_removed",
          "quote_submitted",
          "schedule_blocked",
          "schedule_started",
          "schedule_completed",
          "schedule_slot_selected",
          "schedule_slot_confirmed",
        ]),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

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
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

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
      const key = row.serviceKey;
      if (key) result[key] = (row.pricingConfig as Record<string, unknown>) ?? {};
    }
    return result;
  }),

  lookupProperty: publicProcedure
    .input(
      z.object({
        address: z.string().min(3),
        city: z.string().min(2),
        state: z.string().min(2),
        zip: z.string().min(3),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const maybeReal = await fetchPropertyIntel(input).catch(err => {
        logger.warn("propertyLookup.fallback", { message: String(err) });
        return null;
      });
      if (maybeReal) return maybeReal;
      return mockPropertyIntel(input);
    }),

  getSlots: publicProcedure
    .input(
      z.object({
        durationMinutes: z.number().min(30).max(8 * 60).default(90),
        daysAhead: z.number().min(1).max(21).default(9),
        startHour: z.number().min(5).max(12).optional(),
        endHour: z.number().min(13).max(22).optional(),
        preferExternal: z.boolean().optional(),
        slotPaddingMinutes: z.number().int().min(0).max(240).default(0),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const preferExternal =
        input.preferExternal === undefined ? true : input.preferExternal;
      if (preferExternal) {
        const external = await fetchSchedulerSlots(input).catch(err => {
          logger.warn("quote.getSlots.fallback", { message: String(err) });
          return null;
        });
        if (external?.length) {
          // Tag external slots so the client can distinguish real from estimated
          return external.map(s => ({ ...s, source: "external" as const }));
        }
      }

      // FALLBACK: returns estimated slots when no real scheduler is configured
      return mockAvailabilityProvider.getSlots({
        durationMinutes: input.durationMinutes,
        daysAhead: input.daysAhead,
        startHour: input.startHour,
        endHour: input.endHour,
        paddingMinutes: input.slotPaddingMinutes,
      });
    }),

  pricePreview: publicProcedure
    .input(
      z.object({
        companyId: z.number().int().positive().optional(),
        distanceMiles: z.number().min(0).default(0),
        travelFee: z.number().min(0).optional(),
        items: z.array(
          z.object({
            serviceType: z.string(),
            basePrice: z.number().min(0),
            finalPrice: z.number().min(0),
            packageTier: z.enum(["good", "better", "best"]).optional(),
          })
        ),
        acceptedUpsells: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              price: z.number().min(0),
            })
          )
          .default([]),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const companyId = input.companyId ?? getActiveCompanyId(ctx.user);

      let jobMinimum = 0;
      let bundleDiscountPercent = 0;

      if (db) {
        const [settings] = await db
          .select()
          .from(quoteToolSettings)
          .where(eq(quoteToolSettings.companyId, companyId))
          .limit(1);

        if (settings) {
          jobMinimum = Number(settings.jobMinimum ?? 0);
          const count = input.items.length;
          if (settings.packageDiscountsEnabled) {
            if (count >= 5)
              bundleDiscountPercent = Number(
                settings.discount5PlusServices ?? 0
              );
            else if (count === 4)
              bundleDiscountPercent = Number(settings.discount4Services ?? 0);
            else if (count === 3)
              bundleDiscountPercent = Number(settings.discount3Services ?? 0);
            else if (count === 2)
              bundleDiscountPercent = Number(settings.discount2Services ?? 0);
          }
        }
      }

      const servicesSubtotal = input.items.reduce(
        (sum, item) => sum + item.finalPrice,
        0
      );
      const upsellTotal = input.acceptedUpsells.reduce(
        (sum, item) => sum + item.price,
        0
      );
      const subtotalBeforeDiscounts = servicesSubtotal + upsellTotal;
      const bundleDiscountAmount =
        subtotalBeforeDiscounts * (bundleDiscountPercent / 100);
      const travelFee = input.travelFee ?? 0;

      let totalBeforeMinimum =
        subtotalBeforeDiscounts - bundleDiscountAmount + travelFee;
      const jobMinimumApplied = totalBeforeMinimum < jobMinimum;
      if (jobMinimumApplied) totalBeforeMinimum = jobMinimum;

      return {
        lineItems: input.items,
        acceptedUpsells: input.acceptedUpsells,
        breakdown: {
          servicesSubtotal,
          upsellTotal,
          bundleDiscountPercent,
          bundleDiscountAmount,
          travelFee,
          jobMinimum,
          jobMinimumApplied,
          total: totalBeforeMinimum,
        },
        appliedRules: [
          "base_service_prices",
          "upsell_additions",
          bundleDiscountPercent > 0 ? "bundle_discount" : null,
          travelFee > 0 ? "travel_fee" : null,
          jobMinimumApplied ? "job_minimum_floor" : null,
        ].filter(Boolean),
      };
    }),

  submitV2: publicProcedure
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
        subtotal: z.number(),
        bundleDiscount: z.number().optional(),
        travelFee: z.number().optional(),
        totalPrice: z.number(),
        preferredDate: z.string().optional(),
        preferredTime: z.string().optional(),
        preferredSlot: z.string().optional(),
        preferredSlotLabel: z.string().optional(),
        referralSource: z.string().optional(),
        customerPhotos: z.array(z.string()).optional(),
        propertyIntel: z
          .object({
            livingAreaSqft: z.number().optional(),
            stories: z.number().optional(),
            yearBuilt: z.number().optional(),
            roofAreaSqft: z.number().optional(),
            drivewaySqft: z.number().optional(),
            source: z.string().optional(),
            fetchedAt: z.string().optional(),
          })
          .optional(),
        confidenceMode: z
          .enum(["exact", "range", "manual_review"])
          .default("exact"),
        schedulingEligible: z.boolean().default(true),
        acceptedUpsells: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              price: z.number().min(0),
            })
          )
          .default([]),
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
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

      const nameParts = input.customerName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.customerName;
      const lastName = nameParts.slice(1).join(" ") || "";

      const baseServices = input.items.map(item => ({
        serviceId: item.serviceType,
        serviceName: item.serviceType
          .replace(/_/g, " ")
          .replace(/\w/g, c => c.toUpperCase()),
        sizeLabel: item.description ?? item.serviceType,
        sizeValue:
          (item.inputs?.sqft as number) ??
          (item.inputs?.linearFeet as number) ??
          0,
        options: {
          ...(item.inputs ?? {}),
          packageTier: item.packageTier ?? "good",
        } as Record<string, string | number>,
        price: item.finalPrice,
      }));

      const upsellServices = input.acceptedUpsells.map(upsell => ({
        serviceId: `upsell_${upsell.id}`,
        serviceName: upsell.title,
        sizeLabel: "Upsell",
        sizeValue: 1,
        options: {
          upsellId: upsell.id,
          upsell: "true",
        },
        price: upsell.price,
      }));

      const services = [...baseServices, ...upsellServices];

      const bundleDiscount = input.bundleDiscount ?? 0;
      const lowConfidenceReasons: string[] = [];
      const manualReviewReasons: string[] = [];
      if (input.confidenceMode === "manual_review") {
        lowConfidenceReasons.push("client_requested_manual_review");
        manualReviewReasons.push("client_requested_manual_review");
      }
      if (input.confidenceMode === "range") {
        lowConfidenceReasons.push("range_output");
      }
      if (!input.schedulingEligible) {
        lowConfidenceReasons.push("scheduling_not_eligible");
        manualReviewReasons.push("scheduling_not_eligible");
      }
      if (input.totalPrice <= 0) {
        lowConfidenceReasons.push("non_positive_total");
        manualReviewReasons.push("non_positive_total");
      }
      if (input.items.length === 0) {
        lowConfidenceReasons.push("no_services_selected");
        manualReviewReasons.push("no_services_selected");
      }

      const finalConfidenceMode: "exact" | "range" | "manual_review" =
        manualReviewReasons.length > 0
          ? "manual_review"
          : input.confidenceMode === "range"
            ? "range"
            : "exact";

      let sessionCompanyId = getActiveCompanyId(null); // Start with default single-tenant company
      let sessionRow:
        | (typeof quoteSessions.$inferSelect)
        | undefined;
      if (input.sessionToken) {
        const [session] = await db
          .select()
          .from(quoteSessions)
          .where(eq(quoteSessions.sessionToken, input.sessionToken))
          .limit(1);
        if (session) {
          sessionRow = session;
          sessionCompanyId = Number(session.companyId ?? getActiveCompanyId(null));
        }
      }

      const [settings] = await db
        .select()
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, sessionCompanyId))
        .limit(1);

      const schedulingBlockedReasons: string[] = [];
      const maxServicesForInstantBooking =
        settings?.maxServicesForInstantBooking ?? 2;
      const blockedServices =
        (settings?.instantBookingBlockedServices as string[]) ?? [];
      const maxSqftAuto = Number(settings?.maxSqftAuto ?? 5000);
      const maxLinearFtAuto = Number(settings?.maxLinearFtAuto ?? 800);
      const maxStoriesAuto = Number(settings?.maxStoriesAuto ?? 3);
      const maxWindowsAuto = Number(settings?.maxWindowsAuto ?? 120);

      const nonUpsellServiceTypes = input.items
        .map(item => item.serviceType)
        .filter(type => !type.startsWith("upsell_"));

      let manualReviewServiceKeys: string[] = [];
      if (db && nonUpsellServiceTypes.length > 0) {
        const services = await db
          .select()
          .from(quoteToolServices)
          .where(
            and(
              eq(quoteToolServices.companyId, sessionCompanyId),
              inArray(quoteToolServices.serviceKey, nonUpsellServiceTypes)
            )
          );
        manualReviewServiceKeys = services
          .filter(s => s.manualReviewRequired)
          .map(s => s.serviceKey ?? s.name);
      }

      if (manualReviewServiceKeys.length > 0) {
        lowConfidenceReasons.push("service_requires_manual_review");
        schedulingBlockedReasons.push("service_requires_manual_review");
      }

      if (
        maxServicesForInstantBooking > 0 &&
        nonUpsellServiceTypes.length > maxServicesForInstantBooking
      ) {
        schedulingBlockedReasons.push("too_many_services");
      }

      if (
        blockedServices.length > 0 &&
        nonUpsellServiceTypes.some(type => blockedServices.includes(type))
      ) {
        schedulingBlockedReasons.push("blocked_service_type");
      }

      if (!input.schedulingEligible) {
        schedulingBlockedReasons.push("client_marked_ineligible");
      }

      // Complexity guardrail: oversize / steep / high-story / large window count
      const complexityTriggers = input.items
        .map(item => item.inputs ?? {})
        .filter(Boolean)
        .some(inputs => {
          const sqft = Number((inputs as any).sqft ?? 0);
          const linearFeet = Number((inputs as any).linearFeet ?? 0);
          const stories = Number((inputs as any).stories ?? 1);
          const windowCount = Number((inputs as any).windowCount ?? 0);
          const roofPitch = String((inputs as any).roofPitch ?? "");
          return (
            sqft > maxSqftAuto ||
            linearFeet > maxLinearFtAuto ||
            stories >= maxStoriesAuto ||
            windowCount > maxWindowsAuto ||
            roofPitch === "steep"
          );
        });

      if (complexityTriggers) {
        schedulingBlockedReasons.push("size_or_complexity");
        lowConfidenceReasons.push("size_or_complexity");
      }

      if (input.confidenceMode === "range") {
        schedulingBlockedReasons.push("range_output");
      }

      const finalSchedulingEligible =
        schedulingBlockedReasons.length === 0 &&
        finalConfidenceMode !== "manual_review";

      const result = await db.insert(instantQuotes).values([
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
          squareFootage:
            input.propertyIntel?.livingAreaSqft !== undefined
              ? Number(input.propertyIntel.livingAreaSqft)
              : null,
          stories:
            input.propertyIntel?.stories !== undefined
              ? Number(input.propertyIntel.stories)
              : null,
          exteriorMaterial: null,
          propertyType: null,
          propertyIntel: input.propertyIntel ?? null,
          services: services as any,
          subtotal: String(input.subtotal.toFixed(2)),
          discountPercent: "0",
          discountAmount: String(bundleDiscount.toFixed(2)),
          total: String(input.totalPrice.toFixed(2)),
          status: "pending",
          preferredSlot: (input as any).preferredSlot ?? null,
          preferredSlotLabel: (input as any).preferredSlotLabel ?? null,
        },
      ]).returning({ id: instantQuotes.id });

      const quoteId = result[0]?.id as number;

      if (sessionRow) {
        // Update session with raw SQL to avoid datetime formatting issues
        await db.execute(sql`
          UPDATE quote_sessions
          SET "submittedAt" = NOW()
          WHERE id = ${sessionRow.id}
        `);

        await db.insert(quoteSessionEvents).values({
          sessionId: sessionRow.id,
          eventName: "quote_submitted",
          payload: {
            quoteId,
            totalPrice: input.totalPrice,
            services: input.items.length,
            upsells: input.acceptedUpsells.length,
            confidenceMode: finalConfidenceMode,
            schedulingEligible: finalSchedulingEligible,
            lowConfidenceReasons,
            schedulingBlockedReasons,
          },
        });

        if (!finalSchedulingEligible) {
          await db.insert(quoteSessionEvents).values({
            sessionId: sessionRow.id,
            eventName: "schedule_blocked",
            payload: {
              quoteId,
              reasons: schedulingBlockedReasons,
            },
          });
        }
      }

      const serviceList = input.items
        .map(i => i.serviceType.replace(/_/g, " "))
        .join(", ");

      notifyOwner({
        title: `New Quote (${finalConfidenceMode}): $${input.totalPrice.toFixed(
          2
        )} from ${input.customerName}`,
        content: `Name: ${input.customerName}\nPhone: ${
          input.customerPhone
        }\nEmail: ${input.customerEmail}\nAddress: ${
          input.address
        }\nServices: ${serviceList}\nTotal: $${input.totalPrice.toFixed(
          2
        )}\nConfidence: ${finalConfidenceMode}${
          lowConfidenceReasons.length
            ? `\nLow-confidence reasons: ${lowConfidenceReasons.join(", ")}`
            : ""
        }\nScheduling eligible: ${finalSchedulingEligible ? "yes" : "no"}${
          schedulingBlockedReasons.length
            ? `\nScheduling blocked: ${schedulingBlockedReasons.join(", ")}`
            : ""
        }${input.preferredDate ? `\nPreferred date: ${input.preferredDate}` : ""}${
          (input as any).preferredSlotLabel
            ? `\nPreferred slot: ${(input as any).preferredSlotLabel}`
            : ""
        }${complexityTriggers ? "\nComplexity flagged: yes" : ""}${
          input.propertyIntel
            ? `\nProperty intel: ${JSON.stringify(input.propertyIntel)}`
            : ""
        }`,
      }).catch(() => {});

      let manualReviewLeadId: number | null = null;
      if (finalConfidenceMode === "manual_review") {
        const leadResult = await db.insert(leads).values({
          companyId: sessionCompanyId,
          firstName,
          lastName,
          email: input.customerEmail,
          phone: input.customerPhone,
          address: input.address,
          city: input.city ?? null,
          state: input.state ?? null,
          zip: input.zip ?? null,
          services: input.items.map(item => item.serviceType),
          source: "instant_quote_manual_review",
          status: "follow_up",
          notes: `Manual review required for instant quote #${quoteId}. Reasons: ${lowConfidenceReasons.join(", ") || "n/a"}`,
        }).returning({ id: leads.id });
        manualReviewLeadId = leadResult[0]?.id as number;

        notifyOwner({
          title: "Manual Review Quote Needs Follow-up",
          content: `Quote #${quoteId} from ${input.customerName} requires manual review. Lead #${manualReviewLeadId}. Reasons: ${lowConfidenceReasons.join(", ") || "n/a"}`,
        }).catch(() => {});
      }

      logger.info("quote.submitV2", {
        quoteId,
        totalPrice: input.totalPrice,
        confidenceMode: finalConfidenceMode,
        services: input.items.length,
        upsells: input.acceptedUpsells.length,
        manualReview: finalConfidenceMode === "manual_review",
        schedulingEligible: finalSchedulingEligible,
        schedulingBlockedReasons,
      });

      // TODO: rebuild honest orchestration layer
      const autoWorkflowResult: any = null;
      const workflowErrors: string[] = [];

      return {
        quoteId,
        totalPrice: input.totalPrice,
        confidenceMode: finalConfidenceMode,
        schedulingEligible: finalSchedulingEligible,
        manualReviewLeadId,
        lowConfidenceReasons,
        schedulingBlockedReasons,
        // New fields from automation workflow
        autoCustomerId: autoWorkflowResult?.customerId ?? null,
        autoDraftQuoteId: autoWorkflowResult?.quoteId ?? null,
        autoWorkflowErrors: workflowErrors,
      };
    }),

  // ARCHIVED: old quote.submit — replaced by submitV2
  // submit: publicProcedure (see git history for full implementation)

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

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchPropertyIntel({
  address,
  city,
  state,
  zip,
}: {
  address: string;
  city: string;
  state: string;
  zip: string;
}) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({ address, city, state, zipCode: zip });
  const resp = await fetch(`https://api.rentcast.io/v1/properties?${params}`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!resp.ok) throw new Error(`RentCast ${resp.status}`);

  const data = await resp.json();

  // RentCast returns an array; take first match
  const record = Array.isArray(data) ? data[0] : data;
  if (!record) return null;

  const sqft: number | null = record.squareFootage ?? null;
  // RentCast doesn't provide stories — estimate from sqft
  const stories: number = sqft && sqft > 2500 ? 2 : 1;
  // Roof area estimated at 118% of living area (accounts for overhangs/pitch)
  const roofAreaSqft: number | null = sqft ? Math.round(sqft * 1.18) : null;

  return {
    livingAreaSqft: sqft,
    stories,
    yearBuilt: record.yearBuilt ?? null,
    roofAreaSqft,
    drivewaySqft: null, // not in RentCast — user can adjust
    source: "rentcast",
    fetchedAt: new Date().toISOString(),
  };
}

// FALLBACK: returns estimated property data when no RentCast API key is configured.
// Values are deterministic but synthetic — not from real property records.
function mockPropertyIntel({
  address,
  city,
  state,
  zip,
}: {
  address: string;
  city: string;
  state: string;
  zip: string;
}) {
  const seed = `${address}|${city}|${state}|${zip}`;
  const hash = Array.from(seed).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100000,
    7
  );

  const livingAreaSqft = 1400 + (hash % 1900); // 1400–3299
  const stories = livingAreaSqft > 2300 ? 2 : 1;
  const roofAreaSqft = Math.round(livingAreaSqft * 1.18);
  const drivewaySqft = 300 + (hash % 900); // 300–1199
  const yearBuilt = 1978 + (hash % 42); // 1978–2019

  return {
    livingAreaSqft,
    stories,
    roofAreaSqft,
    drivewaySqft,
    yearBuilt,
    source: "mock",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchSchedulerSlots({
  durationMinutes,
  daysAhead,
  startHour,
  endHour,
  address,
  city,
  state,
  zip,
  lat,
  lng,
}: {
  durationMinutes: number;
  daysAhead: number;
  startHour?: number;
  endHour?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const url = process.env.SCHEDULER_URL;
  const apiKey = process.env.SCHEDULER_KEY;
  if (!url || !apiKey) return null;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      durationMinutes,
      daysAhead,
      startHour,
      endHour,
      address,
      city,
      state,
      zip,
      lat,
      lng,
    }),
  });
  if (!resp.ok) throw new Error(`Scheduler provider ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data?.slots)) return null;
  return data.slots as {
    id: string;
    date: string;
    window: string;
    display: string;
  }[];
}

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
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

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
          companyId: DEFAULT_COMPANY_ID, // single-tenant default company
        } as any,
      ]);

      notifyOwner({
        title: `New Contact Form: ${input.name}`,
        content: `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone ?? "N/A"}\nService: ${input.service ?? "N/A"}\nMessage: ${input.message ?? "N/A"}`,
      }).catch(() => {});

      return { success: true };
    }),

  // For embeddable widget: create a lead with minimal friction.
  requestWorkWidget: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        services: z.array(z.string()).max(20).optional(),
        message: z.string().optional(),
        companyId: z.number().optional().default(DEFAULT_COMPANY_ID),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) { logger.warn("publicSite.noDb"); throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" }); }

      const nameParts = input.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      const result = await db.insert(leads).values({
        companyId: input.companyId,
        firstName,
        lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        services: input.services ?? [],
        notes: input.message ?? null,
        source: "widget_request",
        status: "new",
      }).returning({ id: leads.id });

      return { success: true, leadId: result[0]?.id as number };
    }),
});

// ─── Combined Public Site Router ──────────────────────────────────────────────
export const publicSiteRouter = router({
  quote: quoteRouter,
  gallery: galleryRouter,
  contact: contactRouter,
});
