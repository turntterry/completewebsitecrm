import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJob,
  createJobCost,
  createVisit,
  deleteJobCost,
  getActiveVisitsForCompany,
  getChecklistItems,
  getCustomer,
  getDb,
  getJob,
  getJobProfitability,
  getNextJobNumber,
  getOrCreateCompany,
  getVisit,
  getVisitsByJob,
  listJobCosts,
  listJobs,
  listVisits,
  listVisitsWithJob,
  updateJob,
  updateJobCost,
  updateVisit,
  upsertChecklistItems,
} from "../db";
import { eq } from "drizzle-orm";
import { properties } from "../../drizzle/schema";
import { fireAutomation } from "../services/automationEngine";
import { autoCreateInvoiceFromJob } from "../services/invoiceEngine";
import { protectedProcedure, router } from "../_core/trpc";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

export const jobsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listJobs(companyId, input.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const job = await getJob(input.id, companyId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const jobVisits = await getVisitsByJob(input.id);
      const checklist = await getChecklistItems(input.id);
      // Fetch customer and property for the CLIENT panel
      const customer = await getCustomer(job.customerId, companyId);
      const db = await getDb();
      const property = job.propertyId && db
        ? (await db.select().from(properties).where(eq(properties.id, job.propertyId)))[0] ?? null
        : null;
      return { ...job, visits: jobVisits, checklist, customer: customer ?? null, property };
    }),

  create: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      propertyId: z.number().optional(),
      quoteId: z.number().optional(),
      title: z.string().optional(),
      instructions: z.string().optional(),
      internalNotes: z.string().optional(),
      isRecurring: z.boolean().optional(),
      recurrenceRule: z.string().optional(),
      // Optional first visit
      scheduledAt: z.string().optional(),
      scheduledEndAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const jobNumber = await getNextJobNumber(companyId);
      const { scheduledAt, scheduledEndAt, ...jobData } = input;
      const jobId = await createJob({ ...jobData, companyId, jobNumber });
      if (!jobId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (scheduledAt) {
        await createVisit({
          jobId,
          companyId,
          status: "scheduled",
          scheduledAt: new Date(scheduledAt),
          scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
        });
        await updateJob(jobId, companyId, { status: "scheduled" });
      }
      // Fire automation
      fireAutomation("job_created", { companyId, entityType: "job", entityId: jobId }).catch(() => {});
      return jobId;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      status: z.enum(["draft", "scheduled", "in_progress", "requires_invoicing", "completed", "archived"]).optional(),
      instructions: z.string().optional(),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, ...data } = input;
      await updateJob(id, companyId, data);

      // Fire status automations
      if (data.status) {
        const event = data.status === "completed" ? "job_completed" : "job_status_changed";
        fireAutomation(event, { companyId, entityType: "job", entityId: id, data: { status: data.status } }).catch(() => {});

        // Auto-create draft invoice when job is marked completed
        if (data.status === "completed") {
          try {
            await autoCreateInvoiceFromJob({ companyId, jobId: id });
          } catch (err) {
            console.error("Failed to auto-create invoice:", err);
            // Don't block job completion if invoice creation fails
          }
        }
      }
      return true;
    }),

  // Visits
  listVisits: protectedProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listVisits(
        companyId,
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );
    }),

  addVisit: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      scheduledAt: z.string().optional(),
      scheduledEndAt: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createVisit({
        jobId: input.jobId,
        companyId,
        status: input.scheduledAt ? "scheduled" : "unscheduled",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : undefined,
        notes: input.notes,
      });
    }),

  updateVisit: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["unscheduled", "scheduled", "in_progress", "completed", "cancelled"]).optional(),
      scheduledAt: z.string().optional(),
      scheduledEndAt: z.string().optional(),
      checkInAt: z.string().optional(),
      checkOutAt: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, scheduledAt, scheduledEndAt, checkInAt, checkOutAt, ...rest } = input;
      await updateVisit(id, companyId, {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
        checkInAt: checkInAt ? new Date(checkInAt) : undefined,
        checkOutAt: checkOutAt ? new Date(checkOutAt) : undefined,
      });
      return true;
    }),

  checkIn: protectedProcedure
    .input(z.object({
      visitId: z.number(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateVisit(input.visitId, companyId, {
        status: "in_progress",
        checkInAt: new Date(),
        checkInLat: input.lat !== undefined ? String(input.lat) as any : undefined,
        checkInLng: input.lng !== undefined ? String(input.lng) as any : undefined,
        checkInAddress: input.address,
      });
      return true;
    }),

  checkOut: protectedProcedure
    .input(z.object({
      visitId: z.number(),
      jobId: z.number(),
      notes: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
      durationMinutes: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateVisit(input.visitId, companyId, {
        status: "completed",
        checkOutAt: new Date(),
        checkOutLat: input.lat !== undefined ? String(input.lat) as any : undefined,
        checkOutLng: input.lng !== undefined ? String(input.lng) as any : undefined,
        checkOutAddress: input.address,
        notes: input.notes,
        durationMinutes: input.durationMinutes,
      });
      await updateJob(input.jobId, companyId, { status: "requires_invoicing" });
      // Fire automation
      fireAutomation("visit_completed", {
        companyId,
        entityType: "visit",
        entityId: input.visitId,
        data: { jobId: input.jobId, durationMinutes: input.durationMinutes },
      }).catch(() => {});
      return true;
    }),

  // Field Timer helpers
  getVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return getVisit(input.visitId, companyId);
    }),

  activeVisits: protectedProcedure.query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
    return getActiveVisitsForCompany(companyId);
  }),

  fieldVisits: protectedProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listVisitsWithJob(
        companyId,
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );
    }),

  // Checklist
  getChecklist: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getChecklistItems(input.jobId);
    }),

  updateChecklist: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      items: z.array(z.object({ description: z.string(), completed: z.boolean() })),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertChecklistItems(input.jobId, input.items);
      return true;
    }),

  // ─── Job Costs ─────────────────────────────────────────────────────────────
  listCosts: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listJobCosts(input.jobId, companyId);
    }),

  addCost: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      category: z.enum(["labor", "materials", "subcontractor", "equipment", "other"]),
      description: z.string().min(1),
      amount: z.number().positive(),
      notes: z.string().optional(),
      costDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return createJobCost({
        jobId: input.jobId,
        companyId,
        category: input.category,
        description: input.description,
        amount: String(input.amount),
        notes: input.notes ?? null,
        costDate: input.costDate ? new Date(input.costDate) : new Date(),
      });
    }),

  updateCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(["labor", "materials", "subcontractor", "equipment", "other"]).optional(),
      description: z.string().min(1).optional(),
      amount: z.number().positive().optional(),
      notes: z.string().optional(),
      costDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const { id, amount, costDate, ...rest } = input;
      await updateJobCost(id, companyId, {
        ...rest,
        ...(amount !== undefined && { amount: String(amount) }),
        ...(costDate && { costDate: new Date(costDate) }),
      });
      return true;
    }),

  deleteCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await deleteJobCost(input.id, companyId);
      return true;
    }),

  getProfitability: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return getJobProfitability(input.jobId, companyId);
    }),
});
