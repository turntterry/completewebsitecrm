import { Express } from "express";
import { createPayment, getDb } from "../db";
import { invoices } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Minimal payment webhook handler.
 * Expecting POST /api/webhooks/payments with:
 * { invoiceId: number, amount: number, status: "succeeded" | "failed" | "pending", method?: string }
 */
export function registerPaymentWebhook(app: Express) {
  app.post("/api/webhooks/payments", async (req, res) => {
    try {
      const { invoiceId, amount, status, method = "card" } = req.body ?? {};
      if (!invoiceId || !amount) {
        return res.status(400).json({ error: "invoiceId and amount required" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, Number(invoiceId)))
        .limit(1);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      if (status !== "succeeded") {
        return res.status(200).json({ received: true, ignored: true });
      }

      await createPayment({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        amount: String(Number(amount).toFixed(2)) as any,
        method,
        notes: "Webhook payment",
        paidAt: new Date(),
      });

      res.json({ received: true });
    } catch (err) {
      res.status(500).json({ error: "Webhook failed", detail: String(err) });
    }
  });
}
