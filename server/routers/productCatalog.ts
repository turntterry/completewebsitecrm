import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { productCatalog } from "../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

export const productCatalogRouter = router({
  /** List all active catalog items for the company */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          category: z.string().optional(),
          includeInactive: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const companyId = ctx.user.companyId;
      if (!companyId) return [];

      const conditions = [eq(productCatalog.companyId, companyId)];
      if (!input?.includeInactive) conditions.push(eq(productCatalog.active, true));

      const results = await db
        .select()
        .from(productCatalog)
        .where(and(...conditions))
        .orderBy(asc(productCatalog.sortOrder), asc(productCatalog.name));

      return results.filter((p) => {
        if (input?.category && p.category !== input.category) return false;
        if (input?.search) {
          const q = input.search.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      });
    }),

  /** Get a single catalog item */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const companyId = ctx.user.companyId;
      if (!companyId) return null;
      const [item] = await db
        .select()
        .from(productCatalog)
        .where(and(eq(productCatalog.id, input.id), eq(productCatalog.companyId, companyId)))
        .limit(1);
      return item ?? null;
    }),

  /** Create a new catalog item */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["Service", "Product"]).default("Service"),
        unitPrice: z.number().min(0).default(0),
        taxable: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const companyId = ctx.user.companyId;
      if (!companyId) throw new TRPCError({ code: "FORBIDDEN" });

      const existing = await db
        .select({ sortOrder: productCatalog.sortOrder })
        .from(productCatalog)
        .where(eq(productCatalog.companyId, companyId))
        .orderBy(asc(productCatalog.sortOrder));
      const maxSort =
        existing.length > 0 ? (existing[existing.length - 1].sortOrder ?? 0) + 1 : 0;

      const [result] = await db.insert(productCatalog).values({
        companyId,
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        unitPrice: String(input.unitPrice),
        taxable: input.taxable,
        active: true,
        sortOrder: maxSort,
      });
      const newId = (result as any).insertId as number;

      const [created] = await db
        .select()
        .from(productCatalog)
        .where(eq(productCatalog.id, newId))
        .limit(1);
      return created;
    }),

  /** Update a catalog item */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(["Service", "Product"]).optional(),
        unitPrice: z.number().min(0).optional(),
        taxable: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const companyId = ctx.user.companyId;
      if (!companyId) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.category !== undefined) updateData.category = fields.category;
      if (fields.unitPrice !== undefined) updateData.unitPrice = String(fields.unitPrice);
      if (fields.taxable !== undefined) updateData.taxable = fields.taxable;
      if (fields.active !== undefined) updateData.active = fields.active;

      await db
        .update(productCatalog)
        .set(updateData)
        .where(and(eq(productCatalog.id, id), eq(productCatalog.companyId, companyId)));

      return { success: true };
    }),

  /** Delete a catalog item */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const companyId = ctx.user.companyId;
      if (!companyId) throw new TRPCError({ code: "FORBIDDEN" });

      await db
        .delete(productCatalog)
        .where(and(eq(productCatalog.id, input.id), eq(productCatalog.companyId, companyId)));

      return { success: true };
    }),
});
