/**
 * AI Receptionist Service
 * Calls the Anthropic API to generate smart SMS replies to inbound customer messages.
 * Uses company info, conversation history, and open jobs to give relevant, personalised answers.
 */

import { ENV } from "../_core/env";

export interface AiReceptionistContext {
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  personaName?: string;        // e.g. "Alex" — the AI's name
  customSystemPrompt?: string; // Owner-written extra instructions
  businessHours?: BusinessHours;
  afterHoursMessage?: string;

  customerName?: string;
  customerPhone: string;
  isKnownCustomer: boolean;
  openJobCount?: number;
  lastJobStatus?: string;
  lastJobTitle?: string;

  recentMessages: { role: "user" | "assistant"; content: string }[];
  inboundMessage: string;
}

export interface BusinessHours {
  timezone?: string;
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function isWithinBusinessHours(hours: BusinessHours): boolean {
  try {
    const tz = hours.timezone ?? "America/New_York";
    const now = new Date().toLocaleString("en-US", { timeZone: tz });
    const d = new Date(now);
    const day = DAYS[d.getDay()] as keyof BusinessHours;
    const todayHours = hours[day] as { open: string; close: string } | null | undefined;
    if (!todayHours) return false; // closed today
    const [oh, om] = todayHours.open.split(":").map(Number);
    const [ch, cm] = todayHours.close.split(":").map(Number);
    const nowMins = d.getHours() * 60 + d.getMinutes();
    return nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;
  } catch {
    return true; // default to "open" if parsing fails
  }
}

function buildSystemPrompt(ctx: AiReceptionistContext): string {
  const persona = ctx.personaName ?? "Alex";
  const inHours = ctx.businessHours ? isWithinBusinessHours(ctx.businessHours) : true;

  let system = `You are ${persona}, the friendly AI receptionist for ${ctx.companyName}, a professional exterior cleaning company (pressure washing, soft washing, gutter cleaning, window cleaning, and related services).

YOUR ROLE:
- Answer questions about services, pricing estimates, scheduling, and job status
- Be warm, professional, and concise — you're texting, not writing an email
- Keep replies SHORT (1–4 sentences max). People are texting from their phone.
- Never pretend to be human if directly asked — say you're an AI assistant
- If you don't know something specific, offer to have the owner call them back

COMPANY INFO:
- Name: ${ctx.companyName}
${ctx.companyPhone ? `- Phone: ${ctx.companyPhone}` : ""}
${ctx.companyAddress ? `- Address: ${ctx.companyAddress}` : ""}
${ctx.companyWebsite ? `- Website: ${ctx.companyWebsite}` : ""}`;

  if (!inHours && ctx.afterHoursMessage) {
    system += `\n\nAFTER HOURS: It is currently outside business hours. Start your reply by letting them know, then say: "${ctx.afterHoursMessage}"`;
  }

  if (ctx.customerName && ctx.isKnownCustomer) {
    system += `\n\nCUSTOMER CONTEXT:
- This is an existing customer: ${ctx.customerName}`;
    if (ctx.openJobCount && ctx.openJobCount > 0) {
      system += `\n- They have ${ctx.openJobCount} open job(s)`;
      if (ctx.lastJobTitle) system += ` — most recent: "${ctx.lastJobTitle}" (status: ${ctx.lastJobStatus ?? "in progress"})`;
    }
  } else if (!ctx.isKnownCustomer) {
    system += `\n\nCUSTOMER CONTEXT: This is a NEW contact — not yet in the system. Be welcoming and try to understand what service they need.`;
  }

  if (ctx.customSystemPrompt?.trim()) {
    system += `\n\nOWNER INSTRUCTIONS (follow these closely):\n${ctx.customSystemPrompt.trim()}`;
  }

  system += `\n\nIMPORTANT RULES:
- Never make up specific prices — say you'd love to give them a free estimate
- Never promise specific availability without checking — say the owner will confirm
- If they want to book, get their address if you don't have it, and say the owner will reach out to confirm the date
- If they say STOP, UNSUBSCRIBE, or similar — just say "You've been unsubscribed from messages." and nothing else
- Reply in the same language the customer used`;

  return system;
}

/**
 * Generate an AI reply to an inbound SMS.
 * Returns the reply text, or null if the API is not configured.
 */
export async function generateAiReply(ctx: AiReceptionistContext): Promise<string | null> {
  if (!ENV.ANTHROPIC_API_KEY) return null;

  const system = buildSystemPrompt(ctx);

  // Build message history for context (last 10 messages)
  const history = ctx.recentMessages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add current inbound message
  const messages = [
    ...history,
    { role: "user" as const, content: ctx.inboundMessage },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ENV.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // fast + cheap for SMS replies
        max_tokens: 300,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[AI Receptionist] API error:", response.status, err);
      return null;
    }

    const data = await response.json() as any;
    const text = data?.content?.[0]?.text as string | undefined;
    return text?.trim() ?? null;
  } catch (err) {
    console.error("[AI Receptionist] Fetch error:", err);
    return null;
  }
}
