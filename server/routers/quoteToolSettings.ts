import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  quoteConfigVersions,
  quoteSessionEvents,
  quoteSessions,
  quoteToolSettings,
  quoteToolServices,
} from "../../drizzle/schema";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import crypto from "crypto";

export const quoteToolSettingsRouter = router({
  // Get settings (upsert if not exists)
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const companyId = ctx.user.companyId;
    if (!companyId) throw new Error("No company");

    let [settings] = await db
      .select()
      .from(quoteToolSettings)
      .where(eq(quoteToolSettings.companyId, companyId))
      .limit(1);

    if (!settings) {
      // Create default settings with a standalone token
      const token = crypto.randomBytes(16).toString("hex");
      await db
        .insert(quoteToolSettings)
        .values({ companyId, standaloneToken: token });
      [settings] = await db
        .select()
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);
    }
    return settings;
  }),

  // Update pricing settings
  updatePricing: protectedProcedure
    .input(
      z.object({
        jobMinimum: z.number().min(0),
        defaultExpirationDays: z.number().int().min(1).max(365),
        packageDiscountsEnabled: z.boolean(),
        discount2Services: z.number().min(0).max(100),
        discount3Services: z.number().min(0).max(100),
        discount4Services: z.number().min(0).max(100),
        discount5PlusServices: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set({
          jobMinimum: input.jobMinimum.toFixed(2),
          defaultExpirationDays: input.defaultExpirationDays,
          packageDiscountsEnabled: input.packageDiscountsEnabled,
          discount2Services: input.discount2Services.toFixed(2),
          discount3Services: input.discount3Services.toFixed(2),
          discount4Services: input.discount4Services.toFixed(2),
          discount5PlusServices: input.discount5PlusServices.toFixed(2),
        })
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Update deploy settings
  updateDeploy: protectedProcedure
    .input(
      z.object({
        onlineBookingEnabled: z.boolean(),
        requireAdvanceBooking: z.boolean(),
        advanceBookingDays: z.number().int().min(1).max(30),
        commercialRoutingEnabled: z.boolean(),
        maxServicesForInstantBooking: z.number().int().min(1).max(20),
        instantBookingBlockedServices: z.array(z.string()).max(100),
        maxSqftAuto: z.number().min(0).max(20000),
        maxLinearFtAuto: z.number().min(0).max(10000),
        maxStoriesAuto: z.number().int().min(1).max(6),
        maxWindowsAuto: z.number().int().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set({
          onlineBookingEnabled: input.onlineBookingEnabled,
          requireAdvanceBooking: input.requireAdvanceBooking,
          advanceBookingDays: input.advanceBookingDays,
          commercialRoutingEnabled: input.commercialRoutingEnabled,
          maxServicesForInstantBooking: input.maxServicesForInstantBooking,
          instantBookingBlockedServices: input.instantBookingBlockedServices,
          maxSqftAuto: input.maxSqftAuto.toFixed(2),
          maxLinearFtAuto: input.maxLinearFtAuto.toFixed(2),
          maxStoriesAuto: input.maxStoriesAuto,
          maxWindowsAuto: input.maxWindowsAuto,
        })
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Get available services
  getServices: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const companyId = ctx.user.companyId;
    if (!companyId) throw new Error("No company");

    const services = await db
      .select()
      .from(quoteToolServices)
      .where(eq(quoteToolServices.companyId, companyId))
      .orderBy(asc(quoteToolServices.sortOrder));

    // Seed default services if none exist
    if (services.length === 0) {
      const defaults = [
        { name: "House Washing", icon: "Home", iconColor: "#3b82f6" },
        { name: "Driveway Cleaning", icon: "Car", iconColor: "#8b5cf6" },
        { name: "Roof Cleaning", icon: "Triangle", iconColor: "#10b981" },
        {
          name: "Detached Structure Wash",
          icon: "Building2",
          iconColor: "#f59e0b",
        },
        { name: "Fence Cleaning", icon: "Fence", iconColor: "#ef4444" },
        { name: "Patio Cleaning", icon: "LayoutGrid", iconColor: "#f97316" },
        { name: "Walkway Cleaning", icon: "Footprints", iconColor: "#06b6d4" },
        { name: "Deck Cleaning", icon: "Layers", iconColor: "#14b8a6" },
        { name: "Window Cleaning", icon: "Square", iconColor: "#a855f7" },
        { name: "Gutter Cleanout", icon: "Droplets", iconColor: "#eab308" },
      ];
      await db.insert(quoteToolServices).values(
        defaults.map((d, i) => ({
          ...d,
          companyId,
          sortOrder: i,
          enabled: true,
        }))
      );
      return db
        .select()
        .from(quoteToolServices)
        .where(eq(quoteToolServices.companyId, companyId))
        .orderBy(asc(quoteToolServices.sortOrder));
    }
    return services;
  }),

  // Update a service
  updateService: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        sortOrder: z.number().optional(),
        pricingConfig: z.any().optional(),
        manualReviewRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const { id, ...updates } = input;
      await db
        .update(quoteToolServices)
        .set(updates)
        .where(eq(quoteToolServices.id, id));
      return { success: true };
    }),

  // Reorder services
  reorderServices: protectedProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      for (const { id, sortOrder } of input) {
        await db
          .update(quoteToolServices)
          .set({ sortOrder })
          .where(eq(quoteToolServices.id, id));
      }
      return { success: true };
    }),

  // Create a new service
  createService: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        icon: z.string().optional(),
        iconColor: z.string().optional(),
        description: z.string().optional(),
        pricingType: z
          .enum(["fixed", "per_sqft", "per_linear_ft", "per_unit", "tiered"])
          .optional(),
        basePrice: z.number().optional(),
        pricePerUnit: z.number().optional(),
        minimumCharge: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const existingServices = await db
        .select({ id: quoteToolServices.id })
        .from(quoteToolServices)
        .where(eq(quoteToolServices.companyId, companyId));

      const [result] = await db.insert(quoteToolServices).values({
        companyId,
        name: input.name,
        icon: input.icon ?? "Droplets",
        iconColor: input.iconColor ?? "#3b82f6",
        description: input.description ?? null,
        pricingType: (input.pricingType ?? "per_sqft") as any,
        basePrice:
          input.basePrice !== undefined
            ? String(input.basePrice.toFixed(2))
            : "0",
        pricePerUnit:
          input.pricePerUnit !== undefined
            ? String(input.pricePerUnit.toFixed(4))
            : "0",
        minimumCharge:
          input.minimumCharge !== undefined
            ? String(input.minimumCharge.toFixed(2))
            : "0",
        enabled: true,
        isActive: true,
        sortOrder: existingServices.length,
      });
      return { success: true, id: (result as any).insertId };
    }),

  // Delete a service
  deleteService: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .delete(quoteToolServices)
        .where(
          and(
            eq(quoteToolServices.id, input.id),
            eq(quoteToolServices.companyId, companyId)
          )
        );
      return { success: true };
    }),

  // Update customer-facing tier labels (internal good/better/best keys stay stable)
  updateTierLabels: protectedProcedure
    .input(
      z.object({
        good: z.string().min(1).max(80),
        better: z.string().min(1).max(80),
        best: z.string().min(1).max(80),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set({ customerTierLabels: input })
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Upsell CRUD APIs (Phase 3)
  listUpsells: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const companyId = ctx.user.companyId;
    if (!companyId) throw new Error("No company");

    const [settings] = await db
      .select({ upsellCatalog: quoteToolSettings.upsellCatalog })
      .from(quoteToolSettings)
      .where(eq(quoteToolSettings.companyId, companyId))
      .limit(1);

    const list = ((settings?.upsellCatalog as any[]) ?? []).map(
      (item, idx) => ({
        ...item,
        sortOrder: Number(item.sortOrder ?? idx),
        active: item.active !== false,
      })
    );

    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }),

  upsertUpsell: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(280),
        price: z.number().min(0),
        appliesTo: z.array(z.string().min(1)).min(1),
        badge: z.string().max(40).optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
        rules: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const [settings] = await db
        .select({ upsellCatalog: quoteToolSettings.upsellCatalog })
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);

      const current = ((settings?.upsellCatalog as any[]) ?? []).map(
        (item, idx) => ({
          ...item,
          sortOrder: Number(item.sortOrder ?? idx),
        })
      );

      const idx = current.findIndex(item => item.id === input.id);
      const nextItem = {
        id: input.id,
        title: input.title,
        description: input.description,
        price: input.price,
        appliesTo: input.appliesTo,
        badge: input.badge,
        active: input.active ?? true,
        sortOrder:
          input.sortOrder ??
          (idx >= 0 ? current[idx].sortOrder : current.length),
        rules: input.rules ?? (idx >= 0 ? current[idx].rules : undefined),
      };

      if (idx >= 0) current[idx] = nextItem;
      else current.push(nextItem);

      await db
        .update(quoteToolSettings)
        .set({ upsellCatalog: current })
        .where(eq(quoteToolSettings.companyId, companyId));

      return { success: true };
    }),

  deleteUpsell: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const [settings] = await db
        .select({ upsellCatalog: quoteToolSettings.upsellCatalog })
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);

      const next = ((settings?.upsellCatalog as any[]) ?? []).filter(
        item => item.id !== input.id
      );

      await db
        .update(quoteToolSettings)
        .set({ upsellCatalog: next })
        .where(eq(quoteToolSettings.companyId, companyId));

      return { success: true };
    }),

  reorderUpsells: protectedProcedure
    .input(
      z.array(
        z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const [settings] = await db
        .select({ upsellCatalog: quoteToolSettings.upsellCatalog })
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);

      const sortMap = new Map(input.map(item => [item.id, item.sortOrder]));
      const next = ((settings?.upsellCatalog as any[]) ?? []).map(
        (item, idx) => ({
          ...item,
          sortOrder: sortMap.get(item.id) ?? Number(item.sortOrder ?? idx),
        })
      );

      await db
        .update(quoteToolSettings)
        .set({ upsellCatalog: next })
        .where(eq(quoteToolSettings.companyId, companyId));

      return { success: true };
    }),

  setUpsellRules: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1).max(80),
        rules: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const [settings] = await db
        .select({ upsellCatalog: quoteToolSettings.upsellCatalog })
        .from(quoteToolSettings)
        .where(eq(quoteToolSettings.companyId, companyId))
        .limit(1);

      const next = ((settings?.upsellCatalog as any[]) ?? []).map(item =>
        item.id === input.id ? { ...item, rules: input.rules } : item
      );

      await db
        .update(quoteToolSettings)
        .set({ upsellCatalog: next })
        .where(eq(quoteToolSettings.companyId, companyId));

      return { success: true };
    }),

  // Quote Experience versions (draft/publish/rollback foundation)
  listExperienceVersions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const companyId = ctx.user.companyId;
    if (!companyId) throw new Error("No company");

    return db
      .select()
      .from(quoteConfigVersions)
      .where(eq(quoteConfigVersions.companyId, companyId))
      .orderBy(desc(quoteConfigVersions.createdAt));
  }),

  createExperienceDraft: protectedProcedure
    .input(z.object({ versionLabel: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

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

      const [result] = await db.insert(quoteConfigVersions).values({
        companyId,
        versionLabel: input.versionLabel,
        status: "draft",
        config: {
          settings,
          services,
        },
        createdByUserId: ctx.user.id,
      });

      return { success: true, id: (result as any).insertId as number };
    }),

  publishExperienceVersion: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteConfigVersions)
        .set({ status: "archived" })
        .where(
          and(
            eq(quoteConfigVersions.companyId, companyId),
            eq(quoteConfigVersions.status, "published")
          )
        );

      await db
        .update(quoteConfigVersions)
        .set({ status: "published", publishedAt: new Date() })
        .where(
          and(
            eq(quoteConfigVersions.companyId, companyId),
            eq(quoteConfigVersions.id, input.id)
          )
        );

      return { success: true };
    }),

  rollbackExperienceVersion: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const [version] = await db
        .select()
        .from(quoteConfigVersions)
        .where(
          and(
            eq(quoteConfigVersions.companyId, companyId),
            eq(quoteConfigVersions.id, input.id)
          )
        )
        .limit(1);

      if (!version) throw new Error("Version not found");

      const config = (version.config ?? {}) as Record<string, any>;
      const settings = config.settings as Record<string, any> | undefined;
      const services = Array.isArray(config.services) ? config.services : [];

      if (settings) {
        await db
          .update(quoteToolSettings)
          .set({
            headerTitle: settings.headerTitle ?? undefined,
            headerSubtitle: settings.headerSubtitle ?? undefined,
            primaryColor: settings.primaryColor ?? undefined,
            buttonText: settings.buttonText ?? undefined,
            customerTierLabels: settings.customerTierLabels ?? undefined,
            upsellCatalog: settings.upsellCatalog ?? undefined,
          })
          .where(eq(quoteToolSettings.companyId, companyId));
      }

      await db
        .delete(quoteToolServices)
        .where(eq(quoteToolServices.companyId, companyId));

      if (services.length > 0) {
        await db.insert(quoteToolServices).values(
          services.map((service: any, idx: number) => ({
            companyId,
            serviceKey: service.serviceKey ?? null,
            name: service.name,
            description: service.description ?? null,
            icon: service.icon ?? "Droplets",
            iconColor: service.iconColor ?? "#3b82f6",
            color: service.color ?? null,
            isActive: service.isActive ?? true,
            enabled: service.enabled ?? true,
            sortOrder: Number(service.sortOrder ?? idx),
            pricingType: service.pricingType ?? "per_sqft",
            basePrice: String(service.basePrice ?? "0"),
            pricePerUnit: String(service.pricePerUnit ?? "0"),
            minimumCharge: String(service.minimumCharge ?? "0"),
            sizeTiers: service.sizeTiers ?? null,
            storyMultiplier: service.storyMultiplier ?? null,
            conditionMultiplier: service.conditionMultiplier ?? null,
            addOns: service.addOns ?? null,
            pricingConfig: service.pricingConfig ?? null,
          }))
        );
      }

      return { success: true };
    }),

  // Upsell analytics summary (owner dashboard)
  getUpsellAnalytics: protectedProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const events = await db
        .select({
          eventName: quoteSessionEvents.eventName,
          payload: quoteSessionEvents.payload,
          createdAt: quoteSessionEvents.createdAt,
        })
        .from(quoteSessionEvents)
        .innerJoin(
          quoteSessions,
          eq(quoteSessionEvents.sessionId, quoteSessions.id)
        )
        .where(
          and(
            eq(quoteSessions.companyId, companyId),
            inArray(quoteSessionEvents.eventName, [
              "upsell_shown",
              "upsell_accepted",
            ]),
            gte(quoteSessionEvents.createdAt, since)
          )
        )
        .orderBy(desc(quoteSessionEvents.createdAt))
        .limit(5000);

      const metrics = new Map<
        string,
        { upsellId: string; title: string; shown: number; accepted: number }
      >();

      for (const event of events) {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const upsellId = String(payload.upsellId ?? "").trim();
        if (!upsellId) continue;

        const existing = metrics.get(upsellId) ?? {
          upsellId,
          title: String(payload.title ?? upsellId),
          shown: 0,
          accepted: 0,
        };

        if (event.eventName === "upsell_shown") existing.shown += 1;
        if (event.eventName === "upsell_accepted") existing.accepted += 1;
        metrics.set(upsellId, existing);
      }

      const rows = Array.from(metrics.values())
        .map(row => ({
          ...row,
          acceptRate: row.shown > 0 ? row.accepted / row.shown : 0,
        }))
        .sort((a, b) => b.accepted - a.accepted || b.shown - a.shown);

      return {
        windowDays: days,
        totalShown: rows.reduce((sum, row) => sum + row.shown, 0),
        totalAccepted: rows.reduce((sum, row) => sum + row.accepted, 0),
        rows,
      };
    }),

  // Update upsell catalog (owner-editable)
  updateUpsells: protectedProcedure
    .input(
      z.object({
        upsellCatalog: z.array(
          z.object({
            id: z.string().min(1).max(80),
            title: z.string().min(1).max(120),
            description: z.string().min(1).max(280),
            price: z.number().min(0),
            appliesTo: z.array(z.string().min(1)).min(1),
            badge: z.string().max(40).optional(),
            active: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set({ upsellCatalog: input.upsellCatalog })
        .where(eq(quoteToolSettings.companyId, companyId));

      return { success: true };
    }),

  // Update appearance settings
  updateAppearance: protectedProcedure
    .input(
      z.object({
        headerTitle: z.string().optional(),
        headerSubtitle: z.string().optional(),
        primaryColor: z.string().optional(),
        logoUrl: z.string().optional(),
        buttonText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set(input)
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Update form settings
  updateFormSettings: protectedProcedure
    .input(
      z.object({
        showPropertySqft: z.boolean().optional(),
        showStories: z.boolean().optional(),
        showCondition: z.boolean().optional(),
        showPropertyType: z.boolean().optional(),
        requireEmail: z.boolean().optional(),
        requirePhone: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set(input)
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Toggle active state
  setActive: protectedProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      await db
        .update(quoteToolSettings)
        .set({ isActive: input.isActive })
        .where(eq(quoteToolSettings.companyId, companyId));
      return { success: true };
    }),

  // Regenerate standalone token (invalidates old link)
  regenerateToken: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const companyId = ctx.user.companyId;
    if (!companyId) throw new Error("No company");

    const newToken = crypto.randomBytes(16).toString("hex");
    await db
      .update(quoteToolSettings)
      .set({ standaloneToken: newToken })
      .where(eq(quoteToolSettings.companyId, companyId));
    return { token: newToken };
  }),
});
