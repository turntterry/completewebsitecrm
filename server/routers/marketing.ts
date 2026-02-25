import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createReferral,
  createReviewRequest,
  findOrCreateConversation,
  getCompany,
  getCustomer,
  insertSmsMessage,
  listCampaigns,
  listCustomers,
  listReferrals,
  listReviewRequests,
  markCampaignSent,
  getOrCreateCompany,
  sendCampaignToAllCustomers,
  updateCompany,
  updateReferralStatus,
  updateReviewRequestStatus,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = ENV;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  try {
    return require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) as any;
  } catch {
    return null;
  }
}

/** Build the Google review link from a Place ID */
function googleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

export const marketingRouter = router({
  // ─── Settings ──────────────────────────────────────────────────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    const company = await getCompany(companyId);
    return {
      googlePlaceId: company?.googlePlaceId ?? "",
      googleReviewsEnabled: company?.googleReviewsEnabled ?? false,
      googleReviewLink: company?.googlePlaceId ? googleReviewLink(company.googlePlaceId) : null,
    };
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        googlePlaceId: z.string().optional(),
        googleReviewsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateCompany(companyId, input);
      return { success: true };
    }),

  // ─── Review Requests ────────────────────────────────────────────────────────
  listReviewRequests: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listReviewRequests(companyId);
  }),

  sendReviewRequest: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        platform: z.enum(["google", "facebook"]),
        method: z.enum(["sms", "email"]),
        invoiceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const customer = await getCustomer(input.customerId, companyId);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const company = await getCompany(companyId);

      // Build review link
      let reviewLink = "";
      if (input.platform === "google" && company?.googlePlaceId) {
        reviewLink = googleReviewLink(company.googlePlaceId);
      } else if (input.platform === "facebook") {
        reviewLink = `https://www.facebook.com/search/top?q=${encodeURIComponent(company?.name ?? "")}`;
      }

      const customerName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
      const messageBody = reviewLink
        ? `Hi ${customer.firstName ?? "there"}, thank you for your business! We'd love your ${input.platform === "google" ? "Google" : "Facebook"} review: ${reviewLink}`
        : `Hi ${customer.firstName ?? "there"}, thank you for your business with ${company?.name ?? "us"}! We appreciate your support.`;

      // Create review request record
      const request = await createReviewRequest({
        companyId,
        customerId: input.customerId,
        invoiceId: input.invoiceId,
        platform: input.platform,
        method: input.method,
        status: "pending",
      });

      let smsSent = false;

      if (input.method === "sms" && customer.phone) {
        const convo = await findOrCreateConversation(
          companyId,
          customer.phone,
          customer.id,
          customerName
        );

        let twilioSid: string | undefined;
        let status: "sent" | "failed" | "queued" = "queued";

        const client = getTwilioClient();
        if (client && ENV.TWILIO_PHONE_NUMBER && convo) {
          try {
            const msg = await client.messages.create({
              body: messageBody,
              from: ENV.TWILIO_PHONE_NUMBER,
              to: customer.phone,
            });
            twilioSid = msg.sid;
            status = "sent";
            smsSent = true;
          } catch (err: any) {
            console.error("[Marketing] SMS error:", err.message);
            status = "failed";
          }
        }

        if (convo) {
          await insertSmsMessage({
            conversationId: convo.id,
            companyId,
            direction: "outbound",
            body: messageBody,
            twilioSid,
            status,
          });
        }
      }

      // Mark as sent
      if (request) {
        await updateReviewRequestStatus(
          (request as any).insertId ?? (request as any).id,
          companyId,
          "sent",
          { sentAt: new Date() }
        );
      }

      return { success: true, smsSent, reviewLink };
    }),

  markReviewRequestStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "sent", "clicked", "reviewed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateReviewRequestStatus(input.id, companyId, input.status);
      return { success: true };
    }),

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listCampaigns(companyId);
  }),

  sendCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const campaignList = await listCampaigns(companyId);
      const campaign = (campaignList as any[]).find((c: any) => c.id === input.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign already sent" });
      if (!campaign.body) throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign has no message body" });

      const customerList = await sendCampaignToAllCustomers(input.id, companyId);

      let sentCount = 0;
      const client = getTwilioClient();

      if (campaign.type === "sms" && client && ENV.TWILIO_PHONE_NUMBER) {
        for (const customer of customerList) {
          if (!customer.phone) continue;
          try {
            const body = campaign.body
              .replace(/\{\{firstName\}\}/g, customer.firstName ?? "")
              .replace(/\{\{lastName\}\}/g, customer.lastName ?? "")
              .replace(/\{\{customerName\}\}/g, `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim());

            const convo = await findOrCreateConversation(
              companyId,
              customer.phone,
              customer.id,
              `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
            );

            const msg = await client.messages.create({
              body,
              from: ENV.TWILIO_PHONE_NUMBER,
              to: customer.phone,
            });

            if (convo) {
              await insertSmsMessage({
                conversationId: convo.id,
                companyId,
                direction: "outbound",
                body,
                twilioSid: msg.sid,
                status: "sent",
              });
            }
            sentCount++;
          } catch (err: any) {
            console.error(`[Campaign] Failed to send to customer ${customer.id}:`, err.message);
          }
        }
      } else {
        // No Twilio or email — still mark as sent with customer count
        sentCount = customerList.length;
      }

      await markCampaignSent(input.id, companyId, sentCount);
      return { success: true, sentCount };
    }),

  listCustomers: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listCustomers(companyId, input.search);
    }),

  // ─── Referrals ─────────────────────────────────────────────────────────────
  listReferrals: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listReferrals(companyId);
  }),

  createReferral: protectedProcedure
    .input(
      z.object({
        referrerId: z.number(),
        referredName: z.string().optional(),
        referredEmail: z.string().optional(),
        creditAmount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createReferral({
        ...input,
        companyId,
        creditAmount: (input.creditAmount ?? "50.00") as any,
        status: "pending",
      });
    }),

  updateReferralStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "converted", "rewarded"]),
        creditAmount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateReferralStatus(input.id, companyId, input.status, input.creditAmount);
      return { success: true };
    }),
});
