import crypto from "crypto";
import { nanoid } from "nanoid";

type WebhookPayload = Record<string, unknown>;

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export async function sendWebhook(eventType: string, payload: WebhookPayload) {
  if (!WEBHOOK_URL) return false;

  const timestamp = new Date().toISOString();
  const eventId = nanoid(12);
  const body = JSON.stringify({ event_type: eventType, event_id: eventId, timestamp, ...payload });

  const signature =
    WEBHOOK_SECRET &&
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event-Type": eventType,
        "X-Event-Id": eventId,
        "X-Event-Timestamp": timestamp,
        ...(signature ? { "X-Signature": signature } : {}),
      },
      body,
    });
    return true;
  } catch (err) {
    console.error("webhook.send.failed", { eventType, message: String(err) });
    return false;
  }
}
