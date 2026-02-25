import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { quoteToolSettings, quoteToolServices } from "../../drizzle/schema";
import { eq, asc, and } from "drizzle-orm";
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
