import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listServiceConfigs,
  getServiceConfigByKey,
  upsertServiceConfig,
} from "../db";

const pricingConfigSchema = z.object({
  mode: z.string(),
  tiers: z
    .array(
      z.object({
        minSize: z.number(),
        maxSize: z.number().nullable(),
        ratePerUnit: z.number(),
      })
    )
    .optional(),
  basePrice: z.number().optional(),
  pricePerUnit: z.number().optional(),
  minimumCharge: z.number().optional(),
}).passthrough();

const multipliersSchema = z.object({
  stories: z
    .object({
      one_story: z.number(),
      two_story: z.number(),
      three_story: z.number(),
    })
    .optional(),
  condition: z
    .object({
      light: z.number(),
      medium: z.number(),
      heavy: z.number(),
    })
    .optional(),
}).passthrough();

export const serviceConfigRouter = router({
  // List all service configs
  list: protectedProcedure.query(async () => {
    return listServiceConfigs();
  }),

  // Get a single service config by key
  getByKey: protectedProcedure
    .input(z.object({ serviceKey: z.string() }))
    .query(async ({ input }) => {
      return getServiceConfigByKey(input.serviceKey);
    }),

  // Upsert a service config
  upsert: protectedProcedure
    .input(
      z.object({
        serviceKey: z.string().min(1),
        displayName: z.string().min(1),
        pricingMode: z.string().optional(),
        pricingConfig: pricingConfigSchema,
        multipliers: multipliersSchema,
        taxable: z.boolean().optional(),
        taxCode: z.string().optional(),
        iconUrl: z.string().optional(),
        photoUrl: z.string().optional(),
        highlights: z
          .array(z.object({ text: z.string(), visible: z.boolean() }))
          .optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { serviceKey, ...data } = input;
      return upsertServiceConfig(serviceKey, {
        displayName: data.displayName,
        pricingMode: data.pricingMode ?? "smartscale",
        pricingConfig: data.pricingConfig,
        multipliers: data.multipliers,
        taxable: data.taxable ?? true,
        taxCode: data.taxCode ?? "",
        iconUrl: data.iconUrl ?? "",
        photoUrl: data.photoUrl ?? "",
        highlights: data.highlights ?? [],
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
      });
    }),

  // Toggle active state
  toggleActive: protectedProcedure
    .input(z.object({ serviceKey: z.string(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await getServiceConfigByKey(input.serviceKey);
      if (!existing) throw new Error("Service config not found");
      return upsertServiceConfig(input.serviceKey, { active: input.active });
    }),
});
