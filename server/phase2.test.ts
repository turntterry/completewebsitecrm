import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    avatarUrl: null,
    role: "admin",
    loginMethod: "manus",
    lastSignedIn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── instantQuoteConfig ─────────────────────────────────────────────────────

describe("instantQuoteConfig", () => {
  it("getGlobalSettings returns null or an object", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.instantQuoteConfig.getGlobalSettings();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("updateGlobalSettings saves job minimum", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.instantQuoteConfig.updateGlobalSettings({ jobMinimum: 49.99 });
    const result = await caller.instantQuoteConfig.getGlobalSettings();
    expect(result).toBeTruthy();
    expect(parseFloat(result!.jobMinimum ?? "0")).toBeCloseTo(49.99, 1);
  });

  it("updateGlobalSettings saves quoteExpirationDays", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.instantQuoteConfig.updateGlobalSettings({ quoteExpirationDays: 21 });
    const result = await caller.instantQuoteConfig.getGlobalSettings();
    expect(result!.quoteExpirationDays).toBe(21);
  });

  it("getDiscountTiers returns an array", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.instantQuoteConfig.getDiscountTiers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("replaceDiscountTiers replaces all tiers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.instantQuoteConfig.replaceDiscountTiers([
      { serviceCount: 2, discountPercent: 5, label: "Duo Deal" },
      { serviceCount: 3, discountPercent: 10, label: "Triple Deal" },
    ]);
    const result = await caller.instantQuoteConfig.getDiscountTiers();
    expect(result.length).toBe(2);
    expect(result.some((t) => t.serviceCount === 2)).toBe(true);
    expect(result.some((t) => t.serviceCount === 3)).toBe(true);
  });

  it("replaceDiscountTiers with empty array clears all tiers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.instantQuoteConfig.replaceDiscountTiers([]);
    const result = await caller.instantQuoteConfig.getDiscountTiers();
    expect(result.length).toBe(0);
  });
});

// ── serviceConfig ──────────────────────────────────────────────────────────

describe("serviceConfig", () => {
  const testKey = `test_svc_phase2`;

  it("list returns an array", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.serviceConfig.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsert creates a new service config", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.serviceConfig.upsert({
      serviceKey: testKey,
      displayName: "Test Service Phase2",
      pricingMode: "flat",
      pricingConfig: { mode: "flat", basePrice: 150, minimumCharge: 75 },
      multipliers: { stories: { one_story: 1, two_story: 1.2, three_story: 1.5 } },
    });
    expect(result).toBeTruthy();
  });

  it("getByKey retrieves the created config", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.serviceConfig.getByKey({ serviceKey: testKey });
    expect(result).toBeTruthy();
    expect(result!.serviceKey).toBe(testKey);
    expect(result!.displayName).toBe("Test Service Phase2");
  });

  it("upsert updates an existing config", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.serviceConfig.upsert({
      serviceKey: testKey,
      displayName: "Updated Service Phase2",
      pricingMode: "per_sqft",
      pricingConfig: { mode: "per_sqft", pricePerUnit: 0.15, minimumCharge: 100 },
      multipliers: {},
    });
    const result = await caller.serviceConfig.getByKey({ serviceKey: testKey });
    expect(result!.displayName).toBe("Updated Service Phase2");
    expect(result!.pricingMode).toBe("per_sqft");
  });

  it("toggleActive sets active to false", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.serviceConfig.toggleActive({ serviceKey: testKey, active: false });
    const result = await caller.serviceConfig.getByKey({ serviceKey: testKey });
    expect(result!.active).toBe(false);
  });

  it("toggleActive sets active back to true", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.serviceConfig.toggleActive({ serviceKey: testKey, active: true });
    const result = await caller.serviceConfig.getByKey({ serviceKey: testKey });
    expect(result!.active).toBe(true);
  });
});

// ── pricingEngine (import smoke test) ─────────────────────────────────────

describe("pricingEngine", () => {
  it("can be imported without errors", async () => {
    const mod = await import("./pricingEngine");
    expect(typeof mod).toBe("object");
  });
});
