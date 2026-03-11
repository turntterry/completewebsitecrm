type CreateIntentParams = {
  amountCents: number;
  currency?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  memo?: string | null;
  idempotencyKey?: string | null;
};

export type PaymentIntentResult = {
  provider: "external" | "stub";
  clientSecret?: string | null;
  paymentUrl?: string | null;
};

/**
 * Best-effort payment intent factory. If PAYMENT_INTENT_URL/KEY env vars
 * are present, it will POST there; otherwise it returns a stub response so the
 * caller can fall back to immediate capture.
 *
 * Supports idempotencyKey — forwarded to the external provider as
 * Idempotency-Key header (Stripe convention).
 */
export async function createPaymentIntent(
  params: CreateIntentParams
): Promise<PaymentIntentResult> {
  const url = process.env.PAYMENT_INTENT_URL;
  const apiKey = process.env.PAYMENT_INTENT_KEY;

  if (!url || !apiKey) {
    return { provider: "stub", clientSecret: null, paymentUrl: null };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (params.idempotencyKey) {
    headers["Idempotency-Key"] = params.idempotencyKey;
  }

  const { idempotencyKey: _, ...body } = params;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Payment provider ${resp.status}`);
  }

  const data = await resp.json();
  return {
    provider: "external",
    clientSecret: (data as any).clientSecret ?? (data as any).id ?? null,
    paymentUrl: (data as any).paymentUrl ?? null,
  };
}
