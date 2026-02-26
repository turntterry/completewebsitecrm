import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createLead, getLead, getOrCreateCompany, listLeads, updateLead } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

export const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listLeads(companyId, input.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const lead = await getLead(input.id, companyId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      return lead;
    }),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      services: z.array(z.string()).optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createLead({ ...input, companyId });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "follow_up", "quoted", "won", "lost"]).optional(),
      notes: z.string().optional(),
      lostReason: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      await updateLead(id, companyId, data);
      return true;
    }),

  // Public endpoint for the instant quote tool / lead capture form
  submitPublic: publicProcedure
    .input(z.object({
      companyId: z.number(),
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      services: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { companyId, ...data } = input;
      return createLead({ ...data, companyId, source: "website", status: "new" });
    }),
});
