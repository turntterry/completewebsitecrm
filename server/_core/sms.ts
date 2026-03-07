/**
 * Centralized SMS/Twilio Client
 *
 * Handles dynamic ESM import of Twilio (avoids CommonJS require in ESM app).
 * All SMS-related code should use getTwilioClient() from here instead of
 * importing twilio directly or using require().
 */

import { ENV } from "./env";

let cachedTwilioClient: any = null;

/**
 * Get Twilio client with proper ESM handling
 * Returns null if Twilio is not configured (ACCOUNT_SID or AUTH_TOKEN missing)
 */
export async function getTwilioClient() {
  try {
    // If already cached and configured, reuse it
    if (cachedTwilioClient && ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN) {
      return cachedTwilioClient;
    }

    // If not configured, return null
    if (!ENV.TWILIO_ACCOUNT_SID || !ENV.TWILIO_AUTH_TOKEN) {
      return null;
    }

    // Dynamic import to avoid breaking ESM module system
    // This is the correct way to import CommonJS modules in ESM
    const { default: twilio } = await import("twilio");
    cachedTwilioClient = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);
    return cachedTwilioClient;
  } catch (err: any) {
    console.error("[SMS] Failed to initialize Twilio client:", err.message);
    return null;
  }
}

/**
 * Send an SMS message via Twilio
 * Returns { success: boolean, sid?: string, error?: string }
 */
export async function sendSmsTwilio(params: {
  from: string;
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = await getTwilioClient();
  if (!client) {
    return {
      success: false,
      error: "Twilio not configured (missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)",
    };
  }

  try {
    const msg = await client.messages.create({
      from: params.from,
      to: params.to,
      body: params.body,
    });
    return { success: true, sid: msg.sid };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error("[SMS] Twilio send error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
