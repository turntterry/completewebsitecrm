import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getOrCreateCompany,
  listMediaTags,
  createMediaTag,
  deleteMediaTag,
  assignPhotoTag,
  removePhotoTag,
  getTagsForPhoto,
  createShareLink,
  getShareLink,
  listShareLinksForJob,
  deleteShareLink,
  incrementShareLinkViews,
  listAttachments,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

async function getCompanyId(userId: number, userName: string) {
  const company = await getOrCreateCompany(userId, userName ?? "Exterior Experts");
  if (!company) throw new Error("Company not found");
  return company.id;
}

export const expertCamRouter = router({
  // ── Tags ─────────────────────────────────────────────────────────────────
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
      return listMediaTags(companyId);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(64), color: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
        const id = await createMediaTag(companyId, input.name, input.color);
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
        await deleteMediaTag(input.id, companyId);
        return true;
      }),
  }),

  // ── Photo Tags ────────────────────────────────────────────────────────────
  photoTags: router({
    get: protectedProcedure
      .input(z.object({ attachmentId: z.number() }))
      .query(async ({ input }) => {
        return getTagsForPhoto(input.attachmentId);
      }),

    assign: protectedProcedure
      .input(z.object({ attachmentId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await assignPhotoTag(input.attachmentId, input.tagId);
        return true;
      }),

    remove: protectedProcedure
      .input(z.object({ attachmentId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await removePhotoTag(input.attachmentId, input.tagId);
        return true;
      }),
  }),

  // ── Share Links ───────────────────────────────────────────────────────────
  shareLinks: router({
    list: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
        return listShareLinksForJob(input.jobId, companyId);
      }),

    create: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        type: z.enum(["gallery", "timeline"]).default("gallery"),
        title: z.string().optional(),
        expiresInDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
        const token = nanoid(24);
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86400000)
          : null;
        const id = await createShareLink({
          companyId,
          token,
          jobId: input.jobId,
          type: input.type,
          title: input.title ?? null,
          expiresAt,
        });
        return { id, token };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const companyId = await getCompanyId(ctx.user.id, ctx.user.name ?? "");
        await deleteShareLink(input.id, companyId);
        return true;
      }),
  }),

  // ── Public Gallery (no auth required) ────────────────────────────────────
  publicGallery: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const link = await getShareLink(input.token);
      if (!link) return null;
      if (link.expiresAt && link.expiresAt < new Date()) return null;

      await incrementShareLinkViews(input.token);

      const photos = link.jobId
        ? await listAttachments("job", link.jobId)
        : [];

      return {
        title: link.title,
        type: link.type,
        photos: photos.filter(p => p.mimeType?.startsWith("image/")),
        createdAt: link.createdAt,
      };
    }),

  // ── AI Caption ────────────────────────────────────────────────────────────
  aiCaption: protectedProcedure
    .input(z.object({ photoUrl: z.string(), jobContext: z.string().optional() }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a field documentation assistant for an exterior cleaning and services company. Write a short, professional 1-2 sentence caption for this job site photo.${input.jobContext ? ` Job context: ${input.jobContext}` : ""} Be specific about what you see. Do not use marketing language.`,
              },
              { type: "image_url", image_url: { url: input.photoUrl, detail: "auto" } },
            ],
          },
        ],
        maxTokens: 150,
      });
      const caption = result.choices[0]?.message?.content;
      return { caption: typeof caption === "string" ? caption.trim() : "" };
    }),

  // ── AI Job Summary ────────────────────────────────────────────────────────
  aiJobSummary: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      photoUrls: z.array(z.string()).max(50),
      jobContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const imageContent = input.photoUrls.slice(0, 20).map(url => ({
        type: "image_url" as const,
        image_url: { url, detail: "auto" as const },
      }));

      const result = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a field documentation assistant. Based on these ${input.photoUrls.length} job site photos, write a concise progress summary (3-5 sentences) suitable for sharing with the customer. Include what work was done, the condition, and any notable observations.${input.jobContext ? ` Job context: ${input.jobContext}` : ""}`,
              },
              ...imageContent,
            ],
          },
        ],
        maxTokens: 400,
      });
      const summary = result.choices[0]?.message?.content;
      return { summary: typeof summary === "string" ? summary.trim() : "" };
    }),
});
