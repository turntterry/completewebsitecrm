import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createQuote,
  createQuoteTemplate,
  getNextQuoteNumber,
  getOrCreateCompany,
  getQuote,
  getQuoteByToken,
  getQuoteWithLineItems,
  listQuoteTemplates,
  listQuotes,
  updateQuote,
} from "../db";
import { getDb } from "../db";
import { quoteOptionSets, quoteOptionItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const lineItemSchema = z.object({
  description: z.string().min(1),
  details: z.string().optional(),
  featureList: z.array(z.object({ label: z.string(), included: z.boolean() })).optional(),
  unitPrice: z.string(),
  quantity: z.string(),
  total: z.string(),
});

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

export const quotesRouter = router({
  // Public: get quote by shareable token (no auth required)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const quote = await getQuoteByToken(input.token);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      return quote;
    }),

  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listQuotes(companyId, input.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const quote = await getQuoteWithLineItems(input.id, companyId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      return quote;
    }),

  create: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      propertyId: z.number().optional(),
      leadId: z.number().optional(),
      title: z.string().optional(),
      message: z.string().optional(),
      internalNotes: z.string().optional(),
      taxRate: z.string().optional(),
      depositAmount: z.string().optional(),
      lineItems: z.array(lineItemSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const quoteNumber = await getNextQuoteNumber(companyId);
      const { lineItems, ...quoteData } = input;
      const subtotal = lineItems.reduce((sum, li) => sum + parseFloat(li.total || "0"), 0);
      const taxRate = parseFloat(quoteData.taxRate || "0");
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      return createQuote(
        {
          ...quoteData,
          companyId,
          quoteNumber,
          subtotal: String(subtotal.toFixed(2)) as any,
          taxRate: String(taxRate.toFixed(2)) as any,
          taxAmount: String(taxAmount.toFixed(2)) as any,
          total: String(total.toFixed(2)) as any,
        },
        lineItems.map((li) => ({
          quoteId: 0,
          description: li.description,
          details: li.details,
          featureList: li.featureList,
          unitPrice: li.unitPrice as any,
          quantity: li.quantity as any,
          total: li.total as any,
        }))
      );
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      status: z.enum(["draft", "sent", "accepted", "changes_requested", "expired", "archived"]).optional(),
      message: z.string().optional(),
      internalNotes: z.string().optional(),
      taxRate: z.string().optional(),
      depositAmount: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, lineItems, ...quoteData } = input;
      let extra: Record<string, any> = {};
      if (lineItems !== undefined) {
        const subtotal = lineItems.reduce((sum, li) => sum + parseFloat(li.total || "0"), 0);
        const taxRate = parseFloat(quoteData.taxRate || "0");
        const taxAmount = subtotal * (taxRate / 100);
        extra = {
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount.toFixed(2)),
          total: String((subtotal + taxAmount).toFixed(2)),
        };
      }
      await updateQuote(
        id,
        companyId,
        { ...quoteData, ...extra } as any,
        lineItems?.map((li) => ({
          quoteId: id,
          description: li.description,
          details: li.details,
          featureList: li.featureList,
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
      await updateQuote(input.id, companyId, { status: "sent", sentAt: new Date() } as any);
      return true;
    }),

  accept: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateQuote(input.id, companyId, { status: "accepted", acceptedAt: new Date() } as any);
      return true;
    }),

  // Option Sets
  listOptionSets: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      // Verify quote belongs to company
      const quote = await getQuote(input.quoteId, companyId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const sets = await db.select().from(quoteOptionSets).where(eq(quoteOptionSets.quoteId, input.quoteId));
      const items = await db.select().from(quoteOptionItems).where(eq(quoteOptionItems.quoteId, input.quoteId));
      return sets.map((s) => ({
        ...s,
        items: items.filter((i) => i.optionSetId === s.id),
      }));
    }),

  saveOptionSet: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      id: z.number().optional(), // undefined = create new
      title: z.string().min(1),
      items: z.array(z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        featureList: z.array(z.object({ label: z.string(), included: z.boolean() })).optional(),
        quantity: z.string(),
        unitPrice: z.string(),
        total: z.string(),
        isSelected: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const quote = await getQuote(input.quoteId, companyId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let setId = input.id;
      if (!setId) {
        const [result] = await db.insert(quoteOptionSets).values({ quoteId: input.quoteId, title: input.title });
        setId = (result as any).insertId;
      } else {
        await db.update(quoteOptionSets).set({ title: input.title }).where(and(eq(quoteOptionSets.id, setId), eq(quoteOptionSets.quoteId, input.quoteId)));
        // Delete old items for this set
        await db.delete(quoteOptionItems).where(eq(quoteOptionItems.optionSetId, setId));
      }
      // Insert all items fresh
      if (input.items.length > 0) {
        await db.insert(quoteOptionItems).values(
          input.items.map((item, idx) => ({
            optionSetId: setId!,
            quoteId: input.quoteId,
            name: item.name,
            description: item.description,
            featureList: item.featureList ?? [],
            quantity: item.quantity as any,
            unitPrice: item.unitPrice as any,
            total: item.total as any,
            isSelected: item.isSelected ?? false,
            sortOrder: item.sortOrder ?? idx,
          }))
        );
      }
      return { id: setId };
    }),

  deleteOptionSet: protectedProcedure
    .input(z.object({ quoteId: z.number(), id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const quote = await getQuote(input.quoteId, companyId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(quoteOptionItems).where(eq(quoteOptionItems.optionSetId, input.id));
      await db.delete(quoteOptionSets).where(and(eq(quoteOptionSets.id, input.id), eq(quoteOptionSets.quoteId, input.quoteId)));
      return true;
    }),

  selectOptionItem: protectedProcedure
    .input(z.object({ quoteId: z.number(), optionSetId: z.number(), itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const quote = await getQuote(input.quoteId, companyId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Deselect all items in this set, then select the chosen one
      await db.update(quoteOptionItems).set({ isSelected: false }).where(eq(quoteOptionItems.optionSetId, input.optionSetId));
      await db.update(quoteOptionItems).set({ isSelected: true }).where(eq(quoteOptionItems.id, input.itemId));
      return true;
    }),

  // Templates
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return listQuoteTemplates(companyId);
  }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      lineItems: z.array(lineItemSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createQuoteTemplate({ ...input, companyId, lineItems: input.lineItems as any });
    }),
});
