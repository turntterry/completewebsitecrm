import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { companies } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateAiReply } from "../services/aiReceptionist";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";

async function getCompany(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const { users } = await import("../../drizzle/schema");
  const userRows = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, userId)).limit(1);
  const companyId = userRows[0]?.companyId;
  if (!companyId) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
  const rows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
  return rows[0];
}

const businessHoursSchema = z.object({
  timezone: z.string().optional(),
  monday:    z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  tuesday:   z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  wednesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  thursday:  z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  friday:    z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  saturday:  z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  sunday:    z.object({ open: z.string(), close: z.string() }).nullable().optional(),
}).optional();

export const aiReceptionistRouter = router({
  // Get current settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const company = await getCompany(ctx.user.id);
    return {
      enabled: !!(company as any).aiReceptionistEnabled,
      personaName: (company as any).aiPersonaName ?? "Alex",
      systemPrompt: (company as any).aiSystemPrompt ?? "",
      businessHours: (company as any).aiBusinessHours ?? null,
      afterHoursMessage: (company as any).aiAfterHoursMessage ?? "",
      apiKeyConfigured: !!ENV.ANTHROPIC_API_KEY,
      twilioConfigured: !!(ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN && ENV.TWILIO_PHONE_NUMBER),
    };
  }),

  // Save settings
  updateSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
      personaName: z.string().max(80).optional(),
      systemPrompt: z.string().max(2000).optional(),
      businessHours: businessHoursSchema,
      afterHoursMessage: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await getCompany(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(companies).set({
        aiReceptionistEnabled: input.enabled,
        aiPersonaName: input.personaName,
        aiSystemPrompt: input.systemPrompt,
        aiBusinessHours: input.businessHours as any,
        aiAfterHoursMessage: input.afterHoursMessage,
      } as any).where(eq(companies.id, company.id));
      return { success: true };
    }),

  // Test — send a sample message through the AI without touching Twilio
  testReply: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (!ENV.ANTHROPIC_API_KEY) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ANTHROPIC_API_KEY not configured" });
      }
      const company = await getCompany(ctx.user.id);
      const reply = await generateAiReply({
        companyName: company.name,
        companyPhone: company.phone ?? undefined,
        companyAddress: company.address ?? undefined,
        companyWebsite: company.website ?? undefined,
        personaName: (company as any).aiPersonaName ?? undefined,
        customSystemPrompt: (company as any).aiSystemPrompt ?? undefined,
        businessHours: (company as any).aiBusinessHours ?? undefined,
        afterHoursMessage: (company as any).aiAfterHoursMessage ?? undefined,
        customerName: "Test Customer",
        customerPhone: "+10000000000",
        isKnownCustomer: true,
        openJobCount: 1,
        lastJobStatus: "scheduled",
        lastJobTitle: "House Washing",
        recentMessages: [],
        inboundMessage: input.message,
      });
      return { reply: reply ?? "(No reply generated — check API key)" };
    }),

  // Get recent AI-generated messages log
  recentReplies: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const company = await getCompany(ctx.user.id);
      const { smsMessages, smsConversations } = await import("../../drizzle/schema");
      const { desc, and } = await import("drizzle-orm");
      // Get recent outbound messages (AI replies are stored as regular outbound)
      // We mark them by querying direction=outbound alongside the conversation's last inbound
      const rows = await db
        .select({
          id: smsMessages.id,
          body: smsMessages.body,
          direction: smsMessages.direction,
          createdAt: smsMessages.createdAt,
          conversationId: smsMessages.conversationId,
          customerPhone: smsConversations.customerPhone,
          customerName: smsConversations.customerName,
        })
        .from(smsMessages)
        .leftJoin(smsConversations, eq(smsMessages.conversationId, smsConversations.id))
        .where(
          and(
            eq(smsMessages.companyId, company.id),
            eq(smsMessages.direction, "outbound")
          )
        )
        .orderBy(desc(smsMessages.createdAt))
        .limit(input.limit);
      return rows;
    }),
});
