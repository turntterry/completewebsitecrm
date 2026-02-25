import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  findOrCreateConversation,
  getSmsConversation,
  getSmsMessages,
  getTotalUnreadSms,
  getOrCreateCompany,
  insertSmsMessage,
  listSmsConversations,
  markConversationRead,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

function getTwilioClient() {
  const accountSid = ENV.TWILIO_ACCOUNT_SID;
  const authToken = ENV.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  // Dynamic import to avoid crashing when twilio not configured
  const twilio = require("twilio");
  return twilio(accountSid, authToken) as any;
}

export const smsRouter = router({
  // List all conversations (inbox)
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listSmsConversations(companyId);
  }),

  // Total unread badge count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return getTotalUnreadSms(companyId);
  }),

  // Messages in a conversation thread
  messages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const convo = await getSmsConversation(input.conversationId, companyId);
      if (!convo) throw new TRPCError({ code: "NOT_FOUND" });
      await markConversationRead(input.conversationId, companyId);
      return getSmsMessages(input.conversationId, companyId);
    }),

  // Send outbound SMS
  send: protectedProcedure
    .input(
      z.object({
        toPhone: z.string().min(7),
        body: z.string().min(1).max(1600),
        customerId: z.number().optional(),
        customerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const fromPhone = ENV.TWILIO_PHONE_NUMBER;

      // Find or create conversation
      const convo = await findOrCreateConversation(
        companyId,
        input.toPhone,
        input.customerId,
        input.customerName
      );
      if (!convo) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create conversation" });

      let twilioSid: string | undefined;
      let status: "queued" | "sent" | "failed" = "queued";

      // Send via Twilio if configured
      const client = getTwilioClient();
      if (client && fromPhone) {
        try {
          const msg = await client.messages.create({
            body: input.body,
            from: fromPhone,
            to: input.toPhone,
          });
          twilioSid = msg.sid;
          status = "sent";
        } catch (err: any) {
          // Log but don't crash — message is still stored
          console.error("Twilio send error:", err.message);
          status = "failed";
        }
      }

      await insertSmsMessage({
        conversationId: convo.id,
        companyId,
        direction: "outbound",
        body: input.body,
        twilioSid,
        status,
      });

      return { success: true, conversationId: convo.id, status };
    }),

  // Start a new conversation with a phone number
  startConversation: protectedProcedure
    .input(
      z.object({
        toPhone: z.string().min(7),
        customerId: z.number().optional(),
        customerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const convo = await findOrCreateConversation(
        companyId,
        input.toPhone,
        input.customerId,
        input.customerName
      );
      return convo;
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await markConversationRead(input.conversationId, companyId);
      return { success: true };
    }),
});
