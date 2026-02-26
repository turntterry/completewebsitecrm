import { z } from "zod";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { quoteSessionEvents, quoteSessions } from "../../drizzle/schema";

const analyticsWindowInput = z
  .object({ days: z.number().int().min(1).max(365).default(30) })
  .optional();

const parsePayload = (payload: unknown): Record<string, unknown> =>
  payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : {};

const getReferrerDomain = (value: unknown): string => {
  if (!value || typeof value !== "string") return "direct";
  const raw = value.trim();
  if (!raw) return "direct";

  try {
    return new URL(raw).hostname || "direct";
  } catch {
    return raw;
  }
};

export const quoteAnalyticsRouter = router({
  funnelSummary: protectedProcedure
    .input(analyticsWindowInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const sessions = await db
        .select({
          id: quoteSessions.id,
          submittedAt: quoteSessions.submittedAt,
        })
        .from(quoteSessions)
        .where(
          and(
            eq(quoteSessions.companyId, companyId),
            gte(quoteSessions.createdAt, since)
          )
        )
        .orderBy(desc(quoteSessions.createdAt))
        .limit(10000);

      const sessionIds = sessions.map(session => session.id);
      const events = sessionIds.length
        ? await db
            .select({
              sessionId: quoteSessionEvents.sessionId,
              eventName: quoteSessionEvents.eventName,
              payload: quoteSessionEvents.payload,
            })
            .from(quoteSessionEvents)
            .where(
              and(
                inArray(quoteSessionEvents.sessionId, sessionIds),
                inArray(quoteSessionEvents.eventName, [
                  "quote_viewed",
                  "service_added",
                  "upsell_shown",
                  "upsell_accepted",
                  "quote_submitted",
                  "schedule_started",
                  "schedule_completed",
                ])
              )
            )
            .limit(50000)
        : [];

      const stageMap = new Map<
        number,
        {
          viewed: boolean;
          serviceSelected: boolean;
          upsellShown: boolean;
          upsellAccepted: boolean;
          submitted: boolean;
          scheduleStarted: boolean;
          scheduleCompleted: boolean;
        }
      >();

      for (const session of sessions) {
        stageMap.set(session.id, {
          viewed: false,
          serviceSelected: false,
          upsellShown: false,
          upsellAccepted: false,
          submitted: Boolean(session.submittedAt),
          scheduleStarted: false,
          scheduleCompleted: false,
        });
      }

      for (const event of events) {
        const row = stageMap.get(event.sessionId);
        if (!row) continue;
        if (event.eventName === "quote_viewed") row.viewed = true;
        if (event.eventName === "service_added") row.serviceSelected = true;
        if (event.eventName === "upsell_shown") row.upsellShown = true;
        if (event.eventName === "upsell_accepted") row.upsellAccepted = true;
        if (event.eventName === "quote_submitted") row.submitted = true;
        if (event.eventName === "schedule_started") row.scheduleStarted = true;
        if (event.eventName === "schedule_completed")
          row.scheduleCompleted = true;
      }

      const totals = {
        sessionsStarted: sessions.length,
        quoteViewed: 0,
        serviceSelected: 0,
        upsellShown: 0,
        upsellAccepted: 0,
        quoteSubmitted: 0,
        scheduleStarted: 0,
        scheduleCompleted: 0,
      };

      for (const row of stageMap.values()) {
        if (row.viewed) totals.quoteViewed += 1;
        if (row.serviceSelected) totals.serviceSelected += 1;
        if (row.upsellShown) totals.upsellShown += 1;
        if (row.upsellAccepted) totals.upsellAccepted += 1;
        if (row.submitted) totals.quoteSubmitted += 1;
        if (row.scheduleStarted) totals.scheduleStarted += 1;
        if (row.scheduleCompleted) totals.scheduleCompleted += 1;
      }

      const rate = (count: number) =>
        totals.sessionsStarted > 0
          ? Number(((count / totals.sessionsStarted) * 100).toFixed(1))
          : 0;

      return {
        windowDays: days,
        totals,
        rates: {
          viewRate: rate(totals.quoteViewed),
          serviceSelectionRate: rate(totals.serviceSelected),
          upsellAttachRate: rate(totals.upsellAccepted),
          submitRate: rate(totals.quoteSubmitted),
          scheduleCompletionRate: rate(totals.scheduleCompleted),
        },
      };
    }),

  servicePerformance: protectedProcedure
    .input(analyticsWindowInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await db
        .select({
          eventName: quoteSessionEvents.eventName,
          payload: quoteSessionEvents.payload,
        })
        .from(quoteSessionEvents)
        .innerJoin(
          quoteSessions,
          eq(quoteSessionEvents.sessionId, quoteSessions.id)
        )
        .where(
          and(
            eq(quoteSessions.companyId, companyId),
            gte(quoteSessionEvents.createdAt, since),
            inArray(quoteSessionEvents.eventName, [
              "service_added",
              "service_removed",
            ])
          )
        )
        .orderBy(desc(quoteSessionEvents.createdAt))
        .limit(10000);

      const map = new Map<
        string,
        { serviceKey: string; title: string; added: number; removed: number }
      >();

      for (const event of events) {
        const payload = parsePayload(event.payload);
        const serviceKey = String(
          payload.serviceType ?? payload.serviceKey ?? payload.id ?? ""
        ).trim();
        if (!serviceKey) continue;

        const existing = map.get(serviceKey) ?? {
          serviceKey,
          title: String(payload.title ?? payload.serviceName ?? serviceKey),
          added: 0,
          removed: 0,
        };

        if (event.eventName === "service_added") existing.added += 1;
        if (event.eventName === "service_removed") existing.removed += 1;
        map.set(serviceKey, existing);
      }

      const rows = Array.from(map.values())
        .map(row => ({
          ...row,
          netAdds: row.added - row.removed,
        }))
        .sort((a, b) => b.added - a.added || b.netAdds - a.netAdds);

      return {
        windowDays: days,
        rows,
      };
    }),

  upsellPerformance: protectedProcedure
    .input(analyticsWindowInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await db
        .select({
          eventName: quoteSessionEvents.eventName,
          payload: quoteSessionEvents.payload,
        })
        .from(quoteSessionEvents)
        .innerJoin(
          quoteSessions,
          eq(quoteSessionEvents.sessionId, quoteSessions.id)
        )
        .where(
          and(
            eq(quoteSessions.companyId, companyId),
            gte(quoteSessionEvents.createdAt, since),
            inArray(quoteSessionEvents.eventName, [
              "upsell_shown",
              "upsell_accepted",
            ])
          )
        )
        .orderBy(desc(quoteSessionEvents.createdAt))
        .limit(10000);

      const map = new Map<
        string,
        { upsellId: string; title: string; shown: number; accepted: number }
      >();

      for (const event of events) {
        const payload = parsePayload(event.payload);
        const upsellId = String(payload.upsellId ?? payload.id ?? "").trim();
        if (!upsellId) continue;

        const existing = map.get(upsellId) ?? {
          upsellId,
          title: String(payload.title ?? upsellId),
          shown: 0,
          accepted: 0,
        };

        if (event.eventName === "upsell_shown") existing.shown += 1;
        if (event.eventName === "upsell_accepted") existing.accepted += 1;
        map.set(upsellId, existing);
      }

      const rows = Array.from(map.values())
        .map(row => ({
          ...row,
          acceptRate:
            row.shown > 0
              ? Number(((row.accepted / row.shown) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.accepted - a.accepted || b.shown - a.shown);

      return {
        windowDays: days,
        rows,
      };
    }),

  attribution: protectedProcedure
    .input(analyticsWindowInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const companyId = ctx.user.companyId;
      if (!companyId) throw new Error("No company");

      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const sessions = await db
        .select({
          source: quoteSessions.source,
          referrer: quoteSessions.referrer,
          utmSource: quoteSessions.utmSource,
          utmMedium: quoteSessions.utmMedium,
          utmCampaign: quoteSessions.utmCampaign,
          submittedAt: quoteSessions.submittedAt,
        })
        .from(quoteSessions)
        .where(
          and(
            eq(quoteSessions.companyId, companyId),
            gte(quoteSessions.createdAt, since)
          )
        )
        .orderBy(desc(quoteSessions.createdAt))
        .limit(10000);

      const sourceMap = new Map<
        string,
        { source: string; sessions: number; submitted: number }
      >();
      const campaignMap = new Map<
        string,
        {
          key: string;
          utmSource: string;
          utmMedium: string;
          utmCampaign: string;
          referrerDomain: string;
          sessions: number;
          submitted: number;
        }
      >();

      for (const session of sessions) {
        const source =
          String(session.source ?? session.utmSource ?? "direct").trim() ||
          "direct";
        const utmSource =
          String(session.utmSource ?? "(none)").trim() || "(none)";
        const utmMedium =
          String(session.utmMedium ?? "(none)").trim() || "(none)";
        const utmCampaign =
          String(session.utmCampaign ?? "(none)").trim() || "(none)";
        const referrerDomain = getReferrerDomain(session.referrer);
        const submitted = Boolean(session.submittedAt);

        const sourceRow = sourceMap.get(source) ?? {
          source,
          sessions: 0,
          submitted: 0,
        };
        sourceRow.sessions += 1;
        if (submitted) sourceRow.submitted += 1;
        sourceMap.set(source, sourceRow);

        const key = `${utmSource}|${utmMedium}|${utmCampaign}|${referrerDomain}`;
        const campaignRow = campaignMap.get(key) ?? {
          key,
          utmSource,
          utmMedium,
          utmCampaign,
          referrerDomain,
          sessions: 0,
          submitted: 0,
        };
        campaignRow.sessions += 1;
        if (submitted) campaignRow.submitted += 1;
        campaignMap.set(key, campaignRow);
      }

      const topSources = Array.from(sourceMap.values())
        .map(row => ({
          ...row,
          submitRate:
            row.sessions > 0
              ? Number(((row.submitted / row.sessions) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.submitted - a.submitted || b.sessions - a.sessions);

      const topCampaigns = Array.from(campaignMap.values())
        .map(row => ({
          ...row,
          submitRate:
            row.sessions > 0
              ? Number(((row.submitted / row.sessions) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.submitted - a.submitted || b.sessions - a.sessions)
        .slice(0, 25);

      return {
        windowDays: days,
        totals: {
          sessions: sessions.length,
          submitted: sessions.filter(session => Boolean(session.submittedAt))
            .length,
        },
        topSources,
        topCampaigns,
      };
    }),
});
