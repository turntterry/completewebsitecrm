import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCustomer,
  createProperty,
  deleteCustomer,
  deleteProperty,
  getCustomer,
  getOrCreateCompany,
  listCustomers,
  listProperties,
  updateCustomer,
  updateProperty,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Company not found" });
  return company.id;
}

export const customersRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listCustomers(companyId, input.search);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const customer = await getCustomer(input.id, companyId);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      const props = await listProperties(input.id, companyId);
      return { ...customer, properties: props };
    }),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      phone2: z.string().optional(),
      notes: z.string().optional(),
      leadSource: z.string().optional(),
      propertyAddress: z.string().optional(),
      propertyCity: z.string().optional(),
      propertyState: z.string().optional(),
      propertyZip: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { propertyAddress, propertyCity, propertyState, propertyZip, ...customerData } = input;
      const customerId = await createCustomer({ ...customerData, companyId });
      if (!customerId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (propertyAddress) {
        await createProperty({ customerId, companyId, address: propertyAddress, city: propertyCity, state: propertyState, zip: propertyZip, isPrimary: true });
      }
      return customerId;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      phone2: z.string().optional(),
      notes: z.string().optional(),
      leadSource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      await updateCustomer(id, companyId, data);
      return true;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await deleteCustomer(input.id, companyId);
      return true;
    }),

  // Properties
  addProperty: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      address: z.string().min(1),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      notes: z.string().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createProperty({ ...input, companyId });
    }),

  updateProperty: protectedProcedure
    .input(z.object({
      id: z.number(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      notes: z.string().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      await updateProperty(id, companyId, data);
      return true;
    }),

  deleteProperty: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await deleteProperty(input.id, companyId);
      return true;
    }),
});
