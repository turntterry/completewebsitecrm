import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createInvoice,
  createPayment,
  getInvoice,
  getInvoiceWithLineItems,
  getNextInvoiceNumber,
  getOrCreateCompany,
  listInvoices,
  listPayments,
  updateInvoice,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const lineItemSchema = z.object({
  description: z.string().min(1),
  details: z.string().optional(),
  unitPrice: z.string(),
  quantity: z.string(),
  total: z.string(),
});

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

export const invoicesRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listInvoices(companyId, input.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const invoice = await getInvoiceWithLineItems(input.id, companyId);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      return invoice;
    }),

  create: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      jobId: z.number().optional(),
      message: z.string().optional(),
      internalNotes: z.string().optional(),
      taxRate: z.string().optional(),
      dueDate: z.string().optional(),
      lineItems: z.array(lineItemSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const invoiceNumber = await getNextInvoiceNumber(companyId);
      const { lineItems, ...invoiceData } = input;
      const subtotal = lineItems.reduce((sum, li) => sum + parseFloat(li.total || "0"), 0);
      const taxRate = parseFloat(invoiceData.taxRate || "0");
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      return createInvoice(
        {
          ...invoiceData,
          companyId,
          invoiceNumber,
          subtotal: String(subtotal.toFixed(2)) as any,
          taxRate: String(taxRate.toFixed(2)) as any,
          taxAmount: String(taxAmount.toFixed(2)) as any,
          total: String(total.toFixed(2)) as any,
          balance: String(total.toFixed(2)) as any,
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        },
        lineItems.map((li) => ({
          invoiceId: 0,
          description: li.description,
          details: li.details,
          unitPrice: li.unitPrice as any,
          quantity: li.quantity as any,
          total: li.total as any,
        }))
      );
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "upcoming", "sent", "paid", "past_due", "archived"]).optional(),
      message: z.string().optional(),
      internalNotes: z.string().optional(),
      taxRate: z.string().optional(),
      dueDate: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, lineItems, dueDate, ...rest } = input;
      let extra: Record<string, any> = {};
      if (lineItems !== undefined) {
        const subtotal = lineItems.reduce((sum, li) => sum + parseFloat(li.total || "0"), 0);
        const taxRate = parseFloat(rest.taxRate || "0");
        const taxAmount = subtotal * (taxRate / 100);
        extra = {
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount.toFixed(2)),
          total: String((subtotal + taxAmount).toFixed(2)),
          balance: String((subtotal + taxAmount).toFixed(2)),
        };
      }
      await updateInvoice(
        id,
        companyId,
        { ...rest, ...extra, dueDate: dueDate ? new Date(dueDate) : undefined } as any,
        lineItems?.map((li) => ({
          invoiceId: id,
          description: li.description,
          details: li.details,
          unitPrice: li.unitPrice as any,
          quantity: li.quantity as any,
          total: li.total as any,
        }))
      );
      return true;
    }),

  send: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateInvoice(input.id, companyId, { status: "sent", sentAt: new Date() } as any);
      return true;
    }),

  recordPayment: protectedProcedure
    .input(z.object({
      invoiceId: z.number(),
      amount: z.string(),
      method: z.enum(["card", "ach", "check", "cash", "other"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createPayment({
        invoiceId: input.invoiceId,
        companyId,
        amount: input.amount as any,
        method: input.method,
        notes: input.notes,
        paidAt: new Date(),
      });
    }),

  listPayments: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listPayments(companyId);
  }),
});
