import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getQuoteGlobalSettings,
  updateQuoteGlobalSettings,
  getDiscountTiers,
  replaceDiscountTiers,
} from "../db";

export const instantQuoteConfigRouter = router({
  // Get global quote settings (job minimum, expiration, travel)
  getGlobalSettings: protectedProcedure.query(async () => {
    return getQuoteGlobalSettings();
  }),

  // Update global quote settings
  updateGlobalSettings: protectedProcedure
    .input(
      z.object({
        jobMinimum: z.number().min(0).optional(),
        quoteExpirationDays: z.number().int().min(1).max(365).optional(),
        baseAddress: z.string().optional(),
        baseLat: z.number().optional(),
        baseLng: z.number().optional(),
        freeMiles: z.number().min(0).optional(),
        pricePerMile: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.jobMinimum !== undefined) data.jobMinimum = input.jobMinimum.toFixed(2);
      if (input.quoteExpirationDays !== undefined) data.quoteExpirationDays = input.quoteExpirationDays;
      if (input.baseAddress !== undefined) data.baseAddress = input.baseAddress;
      if (input.baseLat !== undefined) data.baseLat = input.baseLat.toFixed(7);
      if (input.baseLng !== undefined) data.baseLng = input.baseLng.toFixed(7);
      if (input.freeMiles !== undefined) data.freeMiles = input.freeMiles.toFixed(2);
      if (input.pricePerMile !== undefined) data.pricePerMile = input.pricePerMile.toFixed(2);
      return updateQuoteGlobalSettings(data);
    }),

  // Get package discount tiers
  getDiscountTiers: protectedProcedure.query(async () => {
    return getDiscountTiers();
  }),

  // Replace all discount tiers
  replaceDiscountTiers: protectedProcedure
    .input(
      z.array(
        z.object({
          serviceCount: z.number().int().min(2),
          discountPercent: z.number().min(0).max(100),
          label: z.string().optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const tiers = input.map((t) => ({
        serviceCount: t.serviceCount,
        discountPercent: t.discountPercent.toFixed(2),
        label: t.label ?? "",
      }));
      return replaceDiscountTiers(tiers);
    }),
});
