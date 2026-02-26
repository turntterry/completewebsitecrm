import { z } from "zod";
import { getCompany, getOrCreateCompany, updateCompany } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const companyRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreateCompany(ctx.user.id, ctx.user.name ?? "Exterior Experts");
  }),

  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      logoUrl: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      defaultTaxRate: z.string().optional(),
      invoiceTerms: z.string().optional(),
      invoiceMessage: z.string().optional(),
      quoteMessage: z.string().optional(),
      quoteExpiryDays: z.number().optional(),
      googlePlaceId: z.string().optional(),
      googleReviewsEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await getOrCreateCompany(ctx.user.id, ctx.user.name ?? "Exterior Experts");
      if (!company) throw new Error("Company not found");
      await updateCompany(company.id, input);
      return getCompany(company.id);
    }),

  getGoogleReviews: protectedProcedure.query(async ({ ctx }) => {
    const company = await getOrCreateCompany(ctx.user.id, ctx.user.name ?? "Exterior Experts");
    const placeId = (company as any).googlePlaceId;
    const enabled = (company as any).googleReviewsEnabled;
    if (!placeId || !enabled) return null;

    // Use Google Maps Places API via the Manus proxy
    try {
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
      const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
      // Try to use the Manus Maps proxy
      const proxyUrl = `${apiUrl}/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&language=en`;
      const res = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as any;
      if (data.status !== "OK") return null;
      return {
        name: data.result?.name,
        rating: data.result?.rating,
        userRatingsTotal: data.result?.user_ratings_total,
        reviews: (data.result?.reviews ?? []).slice(0, 5).map((r: any) => ({
          authorName: r.author_name,
          authorPhoto: r.profile_photo_url,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relative_time_description,
          time: r.time,
        })),
      };
    } catch {
      return null;
    }
  }),
});
