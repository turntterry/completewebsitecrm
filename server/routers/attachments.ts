import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAttachment, deleteAttachment, listAttachments, listAllAttachments, listAllAttachmentsWithJob, updateAttachment, getOrCreateCompany } from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return company.id;
}

export const attachmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ attachableType: z.string(), attachableId: z.number() }))
    .query(async ({ ctx, input }) => {
      return listAttachments(input.attachableType, input.attachableId);
    }),

  upload: protectedProcedure
    .input(z.object({
      attachableType: z.string(),
      attachableId: z.number(),
      filename: z.string(),
      mimeType: z.string(),
      base64: z.string(),
      label: z.enum(["before", "after", "document", "other"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      const ext = input.filename.split(".").pop() ?? "bin";
      const key = `${companyId}/${input.attachableType}/${input.attachableId}/${nanoid(8)}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      const id = await createAttachment({
        companyId,
        attachableType: input.attachableType,
        attachableId: input.attachableId,
        filename: input.filename,
        mimeType: input.mimeType,
        url,
        s3Key: key,
        label: input.label ?? "other",
      });
      return { id, url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await deleteAttachment(input.id, companyId);
      return true;
    }),

  listAll: protectedProcedure
    .input(z.object({
      attachableType: z.string().optional(),
      label: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listAllAttachments(companyId, input ?? {});
    }),

  listAllWithJob: protectedProcedure
    .query(async ({ ctx }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listAllAttachmentsWithJob(companyId);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      caption: z.string().optional(),
      label: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      await updateAttachment(input.id, companyId, { caption: input.caption, label: input.label });
      return true;
    }),
});
