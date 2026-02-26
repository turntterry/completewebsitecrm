import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createAutomationRule,
  deleteAutomationRule,
  getAutomationLogs,
  getAutomationRule,
  getOrCreateCompany,
  listAutomationRules,
  updateAutomationRule,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

const triggerEnum = z.enum([
  "job_created",
  "job_status_changed",
  "job_completed",
  "quote_sent",
  "quote_accepted",
  "invoice_created",
  "invoice_overdue",
  "lead_created",
  "visit_completed",
  "payment_received",
]);

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than"]),
  value: z.string(),
});

const actionSchema = z.object({
  id: z.string(), // client-side uuid for keying
  type: z.enum(["send_sms", "send_email", "add_note"]),
  config: z.record(z.any()),
});

const ruleInputSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  trigger: triggerEnum,
  triggerConfig: z.record(z.any()).optional(),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1, "At least one action required"),
});

export const automationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listAutomationRules(companyId);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const rule = await getAutomationRule(input.id, companyId);
      if (!rule) throw new TRPCError({ code: "NOT_FOUND" });
      return rule;
    }),

  create: protectedProcedure
    .input(ruleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createAutomationRule({
        companyId,
        name: input.name,
        enabled: input.enabled,
        trigger: input.trigger,
        triggerConfig: input.triggerConfig ?? null,
        conditions: input.conditions,
        actions: input.actions,
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(ruleInputSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      const rule = await getAutomationRule(id, companyId);
      if (!rule) throw new TRPCError({ code: "NOT_FOUND" });
      return updateAutomationRule(id, companyId, data as any);
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateAutomationRule(input.id, companyId, { enabled: input.enabled });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await deleteAutomationRule(input.id, companyId);
      return { success: true };
    }),

  logs: protectedProcedure
    .input(z.object({ ruleId: z.number().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return getAutomationLogs(companyId, input.ruleId, input.limit);
    }),
});
