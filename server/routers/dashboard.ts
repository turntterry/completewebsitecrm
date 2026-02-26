import { z } from "zod";
import {
  getDashboardStats,
  getOrCreateCompany,
  getProjectedIncome,
  getRevenueByMonth,
  listCampaigns,
  listInvoices,
  listJobs,
  listLeads,
  listQuotes,
  listReferrals,
  listReviewRequests,
  createCampaign,
  updateCampaign,
  createReferral,
  createReviewRequest,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new Error("Company not found");
  return company.id;
}

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return getDashboardStats(companyId);
  }),

  revenueByMonth: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return getRevenueByMonth(companyId, input.year);
    }),

  projectedIncome: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return getProjectedIncome(companyId);
  }),

  // Insights tabs
  insightsJobs: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    const allJobs = await listJobs(companyId);
    const total = allJobs.length;
    const completed = allJobs.filter((j) => j.status === "completed").length;
    const scheduled = allJobs.filter((j) => j.status === "scheduled").length;
    const inProgress = allJobs.filter((j) => j.status === "in_progress").length;
    return { total, completed, scheduled, inProgress, jobs: allJobs };
  }),

  insightsQuotes: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    const allQuotes = await listQuotes(companyId);
    const sent = allQuotes.filter((q) => q.status === "sent").length;
    const accepted = allQuotes.filter((q) => q.status === "accepted").length;
    const conversionRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
    const totalValue = allQuotes.reduce((sum, q) => sum + parseFloat(String(q.total || "0")), 0);
    return { total: allQuotes.length, sent, accepted, conversionRate, totalValue, quotes: allQuotes };
  }),

  insightsInvoices: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    const allInvoices = await listInvoices(companyId);
    const paid = allInvoices.filter((i) => i.status === "paid");
    const outstanding = allInvoices.filter((i) => ["sent", "upcoming"].includes(i.status));
    const overdue = allInvoices.filter((i) => i.status === "past_due");
    const totalRevenue = paid.reduce((sum, i) => sum + parseFloat(String(i.amountPaid || "0")), 0);
    const outstandingValue = outstanding.reduce((sum, i) => sum + parseFloat(String(i.balance || "0")), 0);
    return { totalRevenue, outstandingValue, overdueCount: overdue.length, paidCount: paid.length, invoices: allInvoices };
  }),

  // Marketing
  campaigns: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listCampaigns(companyId);
  }),

  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["email", "sms"]),
      status: z.enum(["draft", "active", "sent", "inactive"]).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      scheduledAt: z.string().optional(),
      targetSegment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createCampaign({
        ...input,
        companyId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      });
    }),

  updateCampaign: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["draft", "active", "sent", "inactive"]).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      await updateCampaign(id, companyId, data);
      return true;
    }),

  referrals: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listReferrals(companyId);
  }),

  createReferral: protectedProcedure
    .input(z.object({
      referrerId: z.number(),
      referredName: z.string().optional(),
      referredEmail: z.string().optional(),
      creditAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createReferral({ ...input, companyId, creditAmount: (input.creditAmount ?? "50.00") as any });
    }),

  reviewRequests: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listReviewRequests(companyId);
  }),

  createReviewRequest: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      invoiceId: z.number().optional(),
      platform: z.enum(["google", "facebook"]),
      method: z.enum(["email", "sms"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createReviewRequest({ ...input, companyId, status: "pending" });
    }),
});
