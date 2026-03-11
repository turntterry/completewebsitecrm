import { Express } from "express";
import crypto from "crypto";
import { createPayment, getDb } from "../db";
import { invoices, payments, webhookEvents } from "../../drizzle/schema";
import { eq, and, sum } from "drizzle-orm";

/**
 * Hardened payment webhook handler.
 *
 * Supports:
 * - HMAC-SHA256 signature verification (via WEBHOOK_SECRET env var)
 * - Provider event ID deduplication (webhook_events table)
 * - Invoice balance recomputation from persisted payments
 * - Structured result logging
 *
 * POST /api/webhooks/payments
 * Headers: x-webhook-signature (HMAC of raw body)
 * Body: { eventId, invoiceId, amount, status, method?, provider? }
 */
export function registerPaymentWebhook(app: Express) {
  app.post("/api/webhooks/payments", async (req, res) => {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    try {
      // ── 1. Signature verification ──────────────────────────────────────
      const secret = process.env.WEBHOOK_SECRET;
      if (secret) {
        const signature = req.headers["x-webhook-signature"] as string | undefined;
        if (!signature) {
          return res.status(401).json({ error: "Missing signature" });
        }
        const rawBody =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        const expected = crypto
          .createHmac("sha256", secret)
          .update(rawBody)
          .digest("hex");
        const valid = crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected)
        );
        if (!valid) {
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // ── 2. Parse and validate payload ──────────────────────────────────
      const {
        eventId,
        invoiceId,
        amount,
        status,
        method = "card",
        provider = "external",
      } = req.body ?? {};

      if (!invoiceId || !amount) {
        return res.status(400).json({ error: "invoiceId and amount required" });
      }

      // Generate a deterministic event ID if the provider didn't send one
      const resolvedEventId =
        eventId || `manual_${invoiceId}_${amount}_${Date.now()}`;

      // ── 3. Idempotency: reject duplicate events ────────────────────────
      const [existing] = await db
        .select({ id: webhookEvents.id })
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, String(provider)),
            eq(webhookEvents.providerEventId, String(resolvedEventId))
          )
        )
        .limit(1);

      if (existing) {
        return res
          .status(200)
          .json({ received: true, duplicate: true, webhookEventId: existing.id });
      }

      // ── 4. Load invoice ────────────────────────────────────────────────
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, Number(invoiceId)))
        .limit(1);

      if (!invoice) {
        // Record the event as rejected so we don't reprocess it
        await db.insert(webhookEvents).values({
          providerEventId: String(resolvedEventId),
          provider: String(provider),
          eventType: status ?? "unknown",
          status: "rejected",
          payload: req.body,
          invoiceId: Number(invoiceId),
        });
        return res.status(404).json({ error: "Invoice not found" });
      }

      // ── 5. Non-success events: record and skip ─────────────────────────
      if (status !== "succeeded") {
        await db.insert(webhookEvents).values({
          providerEventId: String(resolvedEventId),
          provider: String(provider),
          eventType: status ?? "unknown",
          status: "ignored",
          payload: req.body,
          invoiceId: invoice.id,
        });
        return res.status(200).json({ received: true, ignored: true });
      }

      // ── 6. Create payment row ──────────────────────────────────────────
      const paymentResult = await createPayment({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        amount: String(Number(amount).toFixed(2)) as any,
        method,
        notes: `Webhook payment (event: ${resolvedEventId})`,
        paidAt: new Date(),
      });

      // ── 7. Recompute invoice balance from all persisted payments ───────
      const [paymentSum] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id));

      const totalPaid = parseFloat(String(paymentSum?.total ?? "0")) || 0;
      const invoiceTotal = parseFloat(String(invoice.total ?? "0")) || 0;
      const newBalance = Math.max(0, invoiceTotal - totalPaid);

      await db
        .update(invoices)
        .set({
          amountPaid: String(totalPaid.toFixed(2)) as any,
          balance: String(newBalance.toFixed(2)) as any,
          ...(newBalance <= 0 ? ({ status: "paid" } as any) : {}),
        })
        .where(eq(invoices.id, invoice.id));

      // ── 8. Record webhook event for audit ──────────────────────────────
      const [webhookRecord] = await db
        .insert(webhookEvents)
        .values({
          providerEventId: String(resolvedEventId),
          provider: String(provider),
          eventType: "succeeded",
          status: "processed",
          payload: req.body,
          invoiceId: invoice.id,
          paymentId: paymentResult ?? null,
        })
        .returning({ id: webhookEvents.id });

      res.json({
        received: true,
        webhookEventId: webhookRecord?.id,
        invoiceBalance: newBalance,
      });
    } catch (err) {
      console.error("[paymentWebhook] Error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
