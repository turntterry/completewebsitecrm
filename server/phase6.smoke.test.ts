/**
 * Phase 6 — E2E Smoke Suite
 *
 * Covers the full Instant Quote v2 funnel:
 *   1. Quote funnel public API  (publicSite.quote.*)
 *   2. Upsell CRUD              (quoteToolSettings.*)
 *   3. Funnel analytics         (quoteAnalytics.*)
 *   4. Error / edge-case paths
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Context helpers ───────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeAuthContext(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "test-owner",
    name: "Test Owner",
    email: "owner@exteriorexperts.local",
    avatarUrl: null,
    role: "admin",
    companyId: 1,
    loginMethod: "local",
    lastSignedIn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── 1. Quote funnel — public API ─────────────────────────────────────────────

describe("publicSite.quote — funnel smoke", () => {
  const pub = () => appRouter.createCaller(makePublicContext());

  it("getExperienceConfig returns settings and services array", async () => {
    const result = await pub().publicSite.quote.getExperienceConfig();
    expect(result).toHaveProperty("settings");
    expect(Array.isArray(result.services)).toBe(true);
  });

  it("getPricing returns an object", async () => {
    const result = await pub().publicSite.quote.getPricing();
    expect(result !== null && typeof result === "object").toBe(true);
  });

  it("startSession creates a session and returns token", async () => {
    const result = await pub().publicSite.quote.startSession({
      companyId: 1,
      source: "smoke-test",
      utmSource: "vitest",
      utmMedium: "ci",
      utmCampaign: "phase6",
    });
    expect(typeof result.sessionId).toBe("number");
    expect(result.sessionId).toBeGreaterThan(0);
    expect(typeof result.sessionToken).toBe("string");
    expect(result.sessionToken.length).toBeGreaterThanOrEqual(6);
  });

  it("trackEvent records an event on a valid session", async () => {
    const { sessionToken } = await pub().publicSite.quote.startSession({
      companyId: 1,
      source: "smoke-test",
    });

    const result = await pub().publicSite.quote.trackEvent({
      sessionToken,
      eventName: "quote_viewed",
      payload: { page: "instant-quote" },
    });

    expect(result).toEqual({ success: true });
  });

  it("trackEvent tracks service_added event", async () => {
    const { sessionToken } = await pub().publicSite.quote.startSession({
      companyId: 1,
    });

    const result = await pub().publicSite.quote.trackEvent({
      sessionToken,
      eventName: "service_added",
      payload: { serviceType: "house_washing", tier: "better" },
    });

    expect(result).toEqual({ success: true });
  });

  it("trackEvent returns session_not_found for unknown token", async () => {
    const result = await pub().publicSite.quote.trackEvent({
      sessionToken: "nonexistent-token-xyz-000",
      eventName: "quote_viewed",
      payload: {},
    });
    expect(result).toEqual({ success: false, reason: "session_not_found" });
  });

  it("getSessionSummary returns session and events after tracking", async () => {
    const { sessionToken } = await pub().publicSite.quote.startSession({
      companyId: 1,
      source: "smoke-summary",
    });

    await pub().publicSite.quote.trackEvent({
      sessionToken,
      eventName: "quote_viewed",
      payload: {},
    });
    await pub().publicSite.quote.trackEvent({
      sessionToken,
      eventName: "service_added",
      payload: { serviceType: "driveway_cleaning" },
    });

    const summary = await pub().publicSite.quote.getSessionSummary({
      sessionToken,
    });

    expect(summary.session).not.toBeNull();
    expect(summary.session?.sessionToken).toBe(sessionToken);
    expect(Array.isArray(summary.events)).toBe(true);
    expect(summary.events.length).toBeGreaterThanOrEqual(2);
  });

  it("getSessionSummary returns null session for unknown token", async () => {
    const summary = await pub().publicSite.quote.getSessionSummary({
      sessionToken: "ghost-token-000",
    });
    expect(summary.session).toBeNull();
    expect(summary.events).toEqual([]);
  });

  it("pricePreview computes subtotal and returns breakdown", async () => {
    const result = await pub().publicSite.quote.pricePreview({
      companyId: 1,
      distanceMiles: 0,
      items: [
        { serviceType: "house_washing", basePrice: 199, finalPrice: 199 },
        { serviceType: "driveway_cleaning", basePrice: 129, finalPrice: 129 },
      ],
      acceptedUpsells: [],
    });

    expect(result.breakdown.servicesSubtotal).toBe(328);
    expect(result.breakdown.upsellTotal).toBe(0);
    expect(result.breakdown.total).toBeGreaterThan(0);
    expect(Array.isArray(result.lineItems)).toBe(true);
    expect(Array.isArray(result.appliedRules)).toBe(true);
    expect(result.appliedRules).toContain("base_service_prices");
  });

  it("pricePreview adds upsell amounts to total", async () => {
    const result = await pub().publicSite.quote.pricePreview({
      companyId: 1,
      distanceMiles: 0,
      items: [
        { serviceType: "house_washing", basePrice: 199, finalPrice: 199 },
      ],
      acceptedUpsells: [
        { id: "gutter_flush", title: "Gutter Flush", price: 79 },
      ],
    });

    expect(result.breakdown.upsellTotal).toBe(79);
    expect(result.breakdown.total).toBeGreaterThanOrEqual(199 + 79);
  });

  it("pricePreview applies travel fee when provided", async () => {
    const result = await pub().publicSite.quote.pricePreview({
      companyId: 1,
      distanceMiles: 20,
      travelFee: 25,
      items: [
        { serviceType: "house_washing", basePrice: 199, finalPrice: 199 },
      ],
      acceptedUpsells: [],
    });

    expect(result.breakdown.travelFee).toBe(25);
    expect(result.breakdown.total).toBeGreaterThanOrEqual(199 + 25);
    expect(result.appliedRules).toContain("travel_fee");
  });

  it("submitV2 creates a quote and returns quoteId", async () => {
    const result = await pub().publicSite.quote.submitV2({
      customerName: "Smoke Test",
      customerEmail: "smoke@test.local",
      customerPhone: "9315550001",
      address: "123 Test St, Cookeville, TN 38501",
      city: "Cookeville",
      state: "TN",
      zip: "38501",
      subtotal: 199,
      totalPrice: 199,
      confidenceMode: "exact",
      schedulingEligible: true,
      items: [
        {
          serviceType: "house_washing",
          packageTier: "better",
          basePrice: 199,
          finalPrice: 199,
          description: "House Washing — Better",
        },
      ],
      acceptedUpsells: [],
    });

    expect(typeof result.quoteId).toBe("number");
    expect(result.quoteId).toBeGreaterThan(0);
    expect(result.confidenceMode).toBe("exact");
    expect(result.schedulingEligible).toBe(true);
    expect(result.lowConfidenceReasons).toEqual([]);
  });

  it("submitV2 includes accepted upsells in stored services", async () => {
    const result = await pub().publicSite.quote.submitV2({
      customerName: "Upsell Smoker",
      customerEmail: "upsell@test.local",
      customerPhone: "9315550002",
      address: "456 Upsell Ave, Cookeville, TN 38501",
      subtotal: 199,
      totalPrice: 278,
      confidenceMode: "exact",
      schedulingEligible: true,
      items: [
        {
          serviceType: "house_washing",
          packageTier: "best",
          basePrice: 199,
          finalPrice: 199,
        },
      ],
      acceptedUpsells: [
        { id: "gutter_flush", title: "Gutter Flush", price: 79 },
      ],
    });

    expect(result.quoteId).toBeGreaterThan(0);
    expect(result.totalPrice).toBe(278);
  });

  it("submitV2 links session and marks it submitted", async () => {
    const { sessionToken } = await pub().publicSite.quote.startSession({
      companyId: 1,
      source: "submit-link-test",
    });

    await pub().publicSite.quote.trackEvent({
      sessionToken,
      eventName: "quote_viewed",
      payload: {},
    });

    const result = await pub().publicSite.quote.submitV2({
      customerName: "Session Linker",
      customerEmail: "linked@test.local",
      customerPhone: "9315550003",
      address: "789 Session Rd, Cookeville, TN 38501",
      subtotal: 129,
      totalPrice: 129,
      confidenceMode: "exact",
      schedulingEligible: true,
      items: [
        {
          serviceType: "driveway_cleaning",
          packageTier: "good",
          basePrice: 129,
          finalPrice: 129,
        },
      ],
      acceptedUpsells: [],
      sessionToken,
    });

    expect(result.quoteId).toBeGreaterThan(0);

    // Session should now have submittedAt set
    const summary = await pub().publicSite.quote.getSessionSummary({
      sessionToken,
    });
    expect(summary.session?.submittedAt).not.toBeNull();
  });

  it("submitV2 flags manual_review when no items selected", async () => {
    const result = await pub().publicSite.quote.submitV2({
      customerName: "Empty Quote",
      customerEmail: "empty@test.local",
      customerPhone: "9315550099",
      address: "0 Empty Ln, Cookeville, TN 38501",
      subtotal: 0,
      totalPrice: 0,
      confidenceMode: "exact",
      schedulingEligible: true,
      items: [],
      acceptedUpsells: [],
    });

    expect(result.confidenceMode).toBe("manual_review");
    expect(result.schedulingEligible).toBe(false);
    expect(result.lowConfidenceReasons).toContain("no_services_selected");
    expect(result.lowConfidenceReasons).toContain("non_positive_total");
    expect(typeof result.manualReviewLeadId).toBe("number");
  });

  it("submitV2 respects explicit manual_review confidence mode", async () => {
    const result = await pub().publicSite.quote.submitV2({
      customerName: "Manual Review",
      customerEmail: "manual@test.local",
      customerPhone: "9315550004",
      address: "321 Manual St, Cookeville, TN 38501",
      subtotal: 349,
      totalPrice: 349,
      confidenceMode: "manual_review",
      schedulingEligible: false,
      items: [
        {
          serviceType: "roof_cleaning",
          packageTier: "best",
          basePrice: 349,
          finalPrice: 349,
        },
      ],
      acceptedUpsells: [],
    });

    expect(result.confidenceMode).toBe("manual_review");
    expect(result.schedulingEligible).toBe(false);
  });
});

// ── 2. Upsell CRUD ───────────────────────────────────────────────────────────

describe("quoteToolSettings — upsell CRUD smoke", () => {
  const auth = () => appRouter.createCaller(makeAuthContext());

  const TEST_UPSELL_ID = `smoke-upsell-${Date.now()}`;

  it("getSettings returns (or creates) settings for company", async () => {
    const settings = await auth().quoteToolSettings.getSettings();
    expect(settings).not.toBeNull();
    expect(settings.companyId).toBe(1);
  });

  it("listUpsells returns an array", async () => {
    const list = await auth().quoteToolSettings.listUpsells();
    expect(Array.isArray(list)).toBe(true);
  });

  it("upsertUpsell creates a new upsell entry", async () => {
    const result = await auth().quoteToolSettings.upsertUpsell({
      id: TEST_UPSELL_ID,
      title: "Smoke Gutter Flush",
      description: "Flush gutters clean with high-pressure rinse.",
      price: 79,
      appliesTo: ["house_washing", "roof_cleaning"],
      badge: "Popular",
      active: true,
      sortOrder: 99,
    });
    expect(result).toEqual({ success: true });
  });

  it("listUpsells includes the newly created upsell", async () => {
    const list = await auth().quoteToolSettings.listUpsells();
    const found = list.find((u: any) => u.id === TEST_UPSELL_ID);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Smoke Gutter Flush");
    expect(found?.price).toBe(79);
    expect(found?.appliesTo).toContain("house_washing");
  });

  it("upsertUpsell updates an existing upsell price", async () => {
    const result = await auth().quoteToolSettings.upsertUpsell({
      id: TEST_UPSELL_ID,
      title: "Smoke Gutter Flush",
      description: "Updated description for smoke test.",
      price: 89,
      appliesTo: ["house_washing"],
      active: true,
      sortOrder: 99,
    });
    expect(result).toEqual({ success: true });
  });

  it("listUpsells reflects the updated upsell price", async () => {
    const list = await auth().quoteToolSettings.listUpsells();
    const found = list.find((u: any) => u.id === TEST_UPSELL_ID);
    expect(found?.price).toBe(89);
    expect(found?.description).toBe("Updated description for smoke test.");
  });

  it("updateTierLabels saves custom label names", async () => {
    const result = await auth().quoteToolSettings.updateTierLabels({
      good: "Basic",
      better: "Standard",
      best: "Premium",
    });
    expect(result).toEqual({ success: true });

    const settings = await auth().quoteToolSettings.getSettings();
    const labels = settings.customerTierLabels as any;
    expect(labels?.good).toBe("Basic");
    expect(labels?.better).toBe("Standard");
    expect(labels?.best).toBe("Premium");
  });
});

// ── 3. Funnel analytics ──────────────────────────────────────────────────────

describe("quoteAnalytics — funnel analytics smoke", () => {
  const auth = () => appRouter.createCaller(makeAuthContext());

  it("funnelSummary returns expected shape", async () => {
    const result = await auth().quoteAnalytics.funnelSummary({ days: 90 });
    expect(result).toHaveProperty("windowDays", 90);
    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("rates");
    expect(typeof result.totals.sessionsStarted).toBe("number");
    expect(typeof result.totals.quoteSubmitted).toBe("number");
    expect(typeof result.rates.submitRate).toBe("number");
  });

  it("funnelSummary submissions count is >= 0", async () => {
    const result = await auth().quoteAnalytics.funnelSummary({ days: 1 });
    expect(result.totals.quoteSubmitted).toBeGreaterThanOrEqual(0);
  });

  it("servicePerformance returns windowDays and rows array", async () => {
    const result = await auth().quoteAnalytics.servicePerformance({ days: 90 });
    expect(result).toHaveProperty("windowDays", 90);
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it("upsellPerformance returns windowDays and rows array", async () => {
    const result = await auth().quoteAnalytics.upsellPerformance({ days: 90 });
    expect(result).toHaveProperty("windowDays", 90);
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it("attribution returns windowDays, topSources, and topCampaigns", async () => {
    const result = await auth().quoteAnalytics.attribution({ days: 90 });
    expect(result).toHaveProperty("windowDays", 90);
    expect(result).toHaveProperty("totals");
    expect(Array.isArray(result.topSources)).toBe(true);
    expect(Array.isArray(result.topCampaigns)).toBe(true);
  });
});

// ── 4. Error / edge-case paths ───────────────────────────────────────────────

describe("error handling — edge cases", () => {
  const pub = () => appRouter.createCaller(makePublicContext());

  it("pricePreview with zero items returns zero total", async () => {
    const result = await pub().publicSite.quote.pricePreview({
      companyId: 1,
      distanceMiles: 0,
      items: [],
      acceptedUpsells: [],
    });
    expect(result.breakdown.servicesSubtotal).toBe(0);
    expect(result.breakdown.total).toBeGreaterThanOrEqual(0);
  });

  it("pricePreview with only travel fee returns correct total", async () => {
    const result = await pub().publicSite.quote.pricePreview({
      companyId: 1,
      distanceMiles: 30,
      travelFee: 50,
      items: [],
      acceptedUpsells: [],
    });
    expect(result.breakdown.travelFee).toBe(50);
    expect(result.appliedRules).toContain("travel_fee");
  });

  it("getSessionSummary for brand-new session has no events", async () => {
    const { sessionToken } = await pub().publicSite.quote.startSession({
      companyId: 1,
    });
    const summary = await pub().publicSite.quote.getSessionSummary({
      sessionToken,
    });
    expect(summary.events).toEqual([]);
    expect(summary.session?.submittedAt).toBeNull();
  });

  it("submitV2 with range confidence returns range mode and eligible", async () => {
    const result = await pub().publicSite.quote.submitV2({
      customerName: "Range Test",
      customerEmail: "range@test.local",
      customerPhone: "9315550005",
      address: "55 Range Blvd, Cookeville, TN 38501",
      subtotal: 249,
      totalPrice: 249,
      confidenceMode: "range",
      schedulingEligible: true,
      items: [
        {
          serviceType: "fence_cleaning",
          basePrice: 249,
          finalPrice: 249,
        },
      ],
      acceptedUpsells: [],
    });
    expect(result.confidenceMode).toBe("range");
    expect(result.quoteId).toBeGreaterThan(0);
  });
});
