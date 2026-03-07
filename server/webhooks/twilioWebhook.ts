import type { Express, Request, Response } from "express";
import {
  findOrCreateConversation,
  getDb,
  getSmsMessages,
  insertSmsMessage,
} from "../db";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import { getTwilioClient } from "../_core/sms";
import { generateAiReply } from "../services/aiReceptionist";

/**
 * Twilio sends a POST to this endpoint when an SMS is received on your Twilio number.
 * Set your Twilio phone number's "A MESSAGE COMES IN" webhook to:
 *   https://your-domain.com/api/webhooks/twilio/inbound
 */
export function registerSmsWebhook(app: Express) {
  app.post(
    "/api/webhooks/twilio/inbound",
    async (req: Request, res: Response) => {
      try {
        const { From, To, Body, MessageSid } = req.body as {
          From?: string;
          To?: string;
          Body?: string;
          MessageSid?: string;
        };

        if (!From || !Body) {
          res.status(400).send("Missing From or Body");
          return;
        }

        const db = await getDb();
        if (!db) {
          res.status(500).send("DB unavailable");
          return;
        }

        const { companies, customers, jobs } = await import("../../drizzle/schema");

        // Get first company (single-tenant)
        const companyRows = await db.select().from(companies).limit(1);
        const company = companyRows[0];
        if (!company) {
          res.set("Content-Type", "text/xml");
          res.send("<Response></Response>");
          return;
        }
        const companyId = company.id;

        // Match inbound phone to a customer
        const normalizedFrom = From.replace(/\D/g, "");
        const allCustomers = await db
          .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName, phone: customers.phone })
          .from(customers)
          .where(eq(customers.companyId, companyId));

        const matchedCustomer = allCustomers.find(
          (c) => c.phone?.replace(/\D/g, "") === normalizedFrom
        );

        const customerName = matchedCustomer
          ? `${matchedCustomer.firstName ?? ""} ${matchedCustomer.lastName ?? ""}`.trim()
          : undefined;

        // Find or create conversation
        const convo = await findOrCreateConversation(companyId, From, matchedCustomer?.id, customerName);
        if (!convo) {
          res.status(500).send("Could not create conversation");
          return;
        }

        // Store inbound message
        await insertSmsMessage({
          conversationId: convo.id,
          companyId,
          direction: "inbound",
          body: Body,
          twilioSid: MessageSid,
          status: "received",
        });

        // ── AI Receptionist (Optional Auto-Reply) ────────────────────────────────
        // AI auto-reply is disabled by default. Only enable if:
        // 1. Company has aiReceptionistEnabled AND aiAutoReplyEnabled flags
        // 2. ANTHROPIC_API_KEY is configured
        const aiEnabled = !!(company as any).aiReceptionistEnabled && !!(company as any).aiAutoReplyEnabled;
        let aiReply: string | null = null;

        if (!aiEnabled) {
          console.log("[AI Receptionist] Auto-reply disabled for company", companyId);
        } else if (!ENV.ANTHROPIC_API_KEY) {
          console.log("[AI Receptionist] API key not configured; auto-reply disabled");
        } else {
          const optOutWords = ["stop", "unsubscribe", "quit", "cancel", "end", "optout"];
          const bodyLower = Body.toLowerCase().trim();
          const isOptOut = optOutWords.some((w) => bodyLower === w || bodyLower.startsWith(w + " "));

          if (isOptOut) {
            aiReply = "You've been unsubscribed from messages. Reply START to re-subscribe.";
            console.log("[AI Receptionist] Opt-out detected from", From);
          } else {
            const recentMsgs = (await getSmsMessages(convo.id, companyId)) as any[];
            const history = recentMsgs.slice(-20).map((m) => ({
              role: (m.direction === "outbound" ? "assistant" : "user") as "user" | "assistant",
              content: m.body as string,
            }));

            let openJobCount = 0;
            let lastJobStatus: string | undefined;
            let lastJobTitle: string | undefined;
            if (matchedCustomer) {
              const customerJobs = await db
                .select({ id: jobs.id, status: jobs.status, title: jobs.title })
                .from(jobs)
                .where(eq(jobs.customerId, matchedCustomer.id))
                .limit(5);
              const open = customerJobs.filter((j) => !["completed", "cancelled", "paid"].includes(j.status ?? ""));
              openJobCount = open.length;
              if (customerJobs.length > 0) {
                const last = customerJobs[customerJobs.length - 1];
                lastJobStatus = last.status ?? undefined;
                lastJobTitle = last.title ?? undefined;
              }
            }

            aiReply = await generateAiReply({
              companyName: company.name,
              companyPhone: company.phone ?? undefined,
              companyAddress: company.address ?? undefined,
              companyWebsite: company.website ?? undefined,
              personaName: (company as any).aiPersonaName ?? undefined,
              customSystemPrompt: (company as any).aiSystemPrompt ?? undefined,
              businessHours: (company as any).aiBusinessHours ?? undefined,
              afterHoursMessage: (company as any).aiAfterHoursMessage ?? undefined,
              customerName,
              customerPhone: From,
              isKnownCustomer: !!matchedCustomer,
              openJobCount,
              lastJobStatus,
              lastJobTitle,
              recentMessages: history,
              inboundMessage: Body,
            });
          }

          if (aiReply && ENV.TWILIO_PHONE_NUMBER) {
            try {
              const client = await getTwilioClient();
              if (client) {
                const msg = await client.messages.create({ from: ENV.TWILIO_PHONE_NUMBER, to: From, body: aiReply });
                await insertSmsMessage({
                  conversationId: convo.id,
                  companyId,
                  direction: "outbound",
                  body: aiReply,
                  twilioSid: msg.sid,
                  status: "sent",
                });
                console.log("[AI Receptionist] Auto-reply sent to", From, "—", aiReply.slice(0, 60));
              } else {
                console.warn("[AI Receptionist] Twilio client unavailable; auto-reply not sent");
              }
            } catch (err: any) {
              const errorMsg = err.message || String(err);
              console.error("[AI Receptionist] Failed to send auto-reply to", From, ":", errorMsg);
            }
          }
        }

        res.set("Content-Type", "text/xml");
        res.send("<Response></Response>");
      } catch (err) {
        console.error("Twilio webhook error:", err);
        res.status(500).send("Internal error");
      }
    }
  );
}
