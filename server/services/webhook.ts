import crypto from "crypto";
import { nanoid } from "nanoid";

type WebhookPayload = Record<string, unknown>;

const ENV_WEBHOOK_URL = process.env.WEBHOOK_URL;
const ENV_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export async function sendWebhook(
  eventType: string,
  payload: WebhookPayload,
  opts?: { url?: string | null; secret?: string | null }
) {
  const targetUrl = opts?.url || ENV_WEBHOOK_URL;
  const secret = opts?.secret ?? ENV_WEBHOOK_SECRET;
  if (!targetUrl) return false;

  const timestamp = new Date().toISOString();
  const eventId = nanoid(12);
  const body = JSON.stringify({ event_type: eventType, event_id: eventId, timestamp, ...payload });

  const signature =
    secret &&
    crypto.createHmac("sha256", secret).update(body).digest("hex");

  try {
    await fetch(targetUrl, {
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
