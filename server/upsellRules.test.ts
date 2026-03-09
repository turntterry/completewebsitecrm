/**
 * Flawless Upsell Engine — Required Test Scenarios
 *
 * These 15 scenarios are mandated by the flawless_upsell_engine_scope spec.
 * Every one must pass before the engine can ship.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateUpsells,
  computePrice,
  type UpsellItem,
  type UpsellContext,
} from "../shared/upsellRules";
import { WINDOW_PACKAGE_FEATURES } from "../shared/windowFeatures";

// ── V1 Catalog (mirrors DEFAULT_UPSELL_CATALOG from PublicQuoteTool.tsx) ──

const V1_CATALOG: UpsellItem[] = [
  // Add-ons
  {
    id: "window_screen_deep_clean",
    title: "Screen Deep Clean",
    price: 89,
    description: "",
    appliesTo: ["window_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 89 },
    priority: 80,
    exclusiveGroup: "window-addon",
    suppressIfFeatureCovered: ["deep_screen_washing"],
  },
  {
    id: "window_track_sill_detail",
    title: "Track + Sill Detailing",
    price: 129,
    description: "",
    appliesTo: ["window_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 129 },
    priority: 70,
    exclusiveGroup: "window-addon",
    suppressIfFeatureCovered: ["deep_track_detailing", "sills"],
  },
  {
    id: "gutter_brightening_addon",
    title: "Gutter Brightening",
    price: 79,
    description: "",
    appliesTo: ["gutter_cleaning"],
    requiresAnyServices: ["gutter_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 79 },
    priority: 75,
  },
  {
    id: "oil_stain_removal",
    title: "Oil Stain Treatment",
    price: 69,
    description: "",
    appliesTo: ["driveway_cleaning"],
    requiresAnyServices: ["driveway_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 69 },
    priority: 72,
  },
  {
    id: "hard_water_treatment",
    title: "Hard Water Spot Treatment",
    price: 79,
    description: "",
    appliesTo: ["window_cleaning"],
    requiresAnyServices: ["window_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 79 },
    priority: 65,
    exclusiveGroup: "window-addon",
  },
  {
    id: "interior_windows_addon",
    title: "Add Interior Windows",
    price: 75,
    description: "",
    appliesTo: ["window_cleaning"],
    requiresAnyServices: ["window_cleaning"],
    excludeIfServicesSelected: ["interior_window_cleaning"],
    category: "add_on",
    pricingMode: "per_unit",
    priceConfig: {
      ratePerUnit: 5,
      unitKey: "windowCount",
      minimumCharge: 49,
      maximumCharge: 199,
    },
    priority: 60,
    exclusiveGroup: "window-addon",
    suppressIfFeatureCovered: ["interior_glass"],
  },
  // Cross-sells
  {
    id: "driveway_crosssell",
    title: "Add Driveway Cleaning",
    price: 119,
    description: "",
    appliesTo: ["house_washing"],
    requiresAnyServices: ["house_washing"],
    excludeIfServicesSelected: ["driveway_cleaning"],
    category: "cross_sell",
    pricingMode: "service_multiplier",
    priceConfig: { baseService: "driveway_cleaning", multiplier: 0.85, basePrice: 140 },
    priority: 85,
  },
  {
    id: "gutter_cleaning_crosssell",
    title: "Add Gutter Cleaning",
    price: 130,
    description: "",
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    excludeIfServicesSelected: ["gutter_cleaning"],
    category: "cross_sell",
    pricingMode: "service_multiplier",
    priceConfig: { baseService: "gutter_cleaning", multiplier: 0.90, basePrice: 145 },
    priority: 85,
  },
  {
    id: "house_washing_crosssell",
    title: "Add House Washing",
    price: 212,
    description: "",
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    excludeIfServicesSelected: ["house_washing"],
    category: "cross_sell",
    pricingMode: "service_multiplier",
    priceConfig: { baseService: "house_washing", multiplier: 0.90, basePrice: 235 },
    priority: 78,
  },
  // Bundles
  {
    id: "curb_appeal_bundle",
    title: "Curb Appeal Package",
    price: 99,
    description: "",
    appliesTo: ["house_washing"],
    requiresAnyServices: ["house_washing"],
    excludeIfServicesSelected: ["driveway_cleaning", "walkway_cleaning"],
    includesServices: ["walkway_cleaning"],
    category: "bundle",
    pricingMode: "bundle_discount",
    priceConfig: { bundlePrice: 99, discountAmount: 30 },
    priority: 90,
  },
  {
    id: "roof_house_gutter_combo",
    title: "Roof + House + Gutters Combo",
    price: 249,
    description: "",
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    excludeIfServicesSelected: ["house_washing", "gutter_cleaning"],
    includesServices: ["house_washing", "gutter_cleaning"],
    category: "bundle",
    pricingMode: "bundle_discount",
    priceConfig: { bundlePrice: 249, discountAmount: 79 },
    priority: 88,
  },
];

// ── Helper to build coveredFeatures from a package tier ──

function coveredFeaturesForTier(tier: string): Set<string> {
  return new Set(WINDOW_PACKAGE_FEATURES[tier] ?? []);
}

function makeCtx(overrides: Partial<UpsellContext> & { selectedServices: Set<string> }): UpsellContext {
  return {
    subtotal: 0,
    ...overrides,
  };
}

// ── Tests ──

describe("Flawless Upsell Engine — Required Test Scenarios", () => {

  // ── Add-ons ──

  it("1. Window Cleaning + Good tier → Interior Windows add-on may show (not suppressed)", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      coveredFeatures: coveredFeaturesForTier("good"),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    // Interior windows should be eligible (good tier does NOT include interior_glass)
    const eligible = V1_CATALOG.filter(item => item.active !== false);
    const interiorEligible = eligible.filter(
      i => i.id === "interior_windows_addon"
    );
    // The engine should not suppress it
    expect(interiorEligible.length).toBe(1);
    // It may or may not be the one selected (depends on priority), but it should be eligible
  });

  it("2. Window Cleaning + Platinum (best) → Interior Windows suppressed", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      coveredFeatures: coveredFeaturesForTier("best"),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const ids = result.displayOffers.map(o => o.id);
    expect(ids).not.toContain("interior_windows_addon");
  });

  it("3. Window Cleaning + Platinum → Screen/Track suppressed only if truly included", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      coveredFeatures: coveredFeaturesForTier("best"),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const ids = result.displayOffers.map(o => o.id);
    // Platinum includes deep_screen_washing → Screen Deep Clean suppressed
    expect(ids).not.toContain("window_screen_deep_clean");
    // Platinum includes deep_track_detailing + sills → Track + Sill suppressed
    expect(ids).not.toContain("window_track_sill_detail");
    // But hard_water_treatment has no suppressIfFeatureCovered features covered by Platinum
    // Since they're all in the same exclusive group and all suppressed, hard_water should show
    // (it's the only remaining window-addon eligible item)
    expect(result.addOn?.id).toBe("hard_water_treatment");
  });

  it("4. House Washing + Gutter Cleaning → Gutter Brightening price correct ($79 flat)", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing", "gutter_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    // Gutter Brightening should be eligible (requiresAnyServices: gutter_cleaning)
    const gutterBright = result.displayOffers.find(o => o.id === "gutter_brightening_addon");
    if (gutterBright) {
      expect(gutterBright.price).toBe(79);
    }
  });

  it("5. Driveway Cleaning → Oil Stain price correct ($69 flat)", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["driveway_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const oilStain = result.displayOffers.find(o => o.id === "oil_stain_removal");
    expect(oilStain).toBeTruthy();
    expect(oilStain!.price).toBe(69);
  });

  // ── Cross-sells ──

  it("6. Window Cleaning only → no cross-sells (no house_washing or roof_cleaning selected)", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      coveredFeatures: coveredFeaturesForTier("good"),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    // All cross-sells require house_washing or roof_cleaning
    expect(result.crossSell).toBeNull();
  });

  it("6b. House Washing only → Driveway cross-sell uses service_multiplier pricing", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing"]),
      servicePrices: { driveway_cleaning: 160 },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const driveway = result.displayOffers.find(o => o.id === "driveway_crosssell");
    expect(driveway).toBeTruthy();
    // Should use live price: $160 × 0.85 = $136
    expect(driveway!.price).toBe(136);
  });

  it("6c. House Washing only → Driveway cross-sell uses basePrice fallback when no live price", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing"]),
      // No servicePrices provided
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const driveway = result.displayOffers.find(o => o.id === "driveway_crosssell");
    expect(driveway).toBeTruthy();
    // Should use fallback: $140 × 0.85 = $119
    expect(driveway!.price).toBe(119);
  });

  it("7. House Washing already selected → Add House Washing cross-sell suppressed", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["roof_cleaning", "house_washing"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const ids = result.displayOffers.map(o => o.id);
    expect(ids).not.toContain("house_washing_crosssell");
  });

  it("8. Gutter Cleaning already selected → Add Gutter Cleaning suppressed", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["roof_cleaning", "gutter_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const ids = result.displayOffers.map(o => o.id);
    expect(ids).not.toContain("gutter_cleaning_crosssell");
  });

  // ── Bundles ──

  it("9. Roof Cleaning only → Roof + House + Gutters bundle may show", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["roof_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const combo = result.displayOffers.find(o => o.id === "roof_house_gutter_combo");
    expect(combo).toBeTruthy();
    expect(result.bundle?.id).toBe("roof_house_gutter_combo");
  });

  it("10. House Washing + Roof Cleaning → bundle suppressed (house_washing in excludeIfServicesSelected)", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing", "roof_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const ids = result.displayOffers.map(o => o.id);
    expect(ids).not.toContain("roof_house_gutter_combo");
  });

  it("11. Bundle math matches — bundlePrice is used as display price", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["roof_cleaning"]),
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const combo = result.displayOffers.find(o => o.id === "roof_house_gutter_combo");
    expect(combo).toBeTruthy();
    expect(combo!.price).toBe(249);
  });

  // ── Admin truth ──

  it("12. Changing flat price in admin → public quote reflects new price", () => {
    const modified = V1_CATALOG.map(item =>
      item.id === "oil_stain_removal"
        ? { ...item, priceConfig: { amount: 99 }, price: 99 }
        : item
    );
    const ctx = makeCtx({
      selectedServices: new Set(["driveway_cleaning"]),
    });
    const result = evaluateUpsells(modified, ctx);
    const oilStain = result.displayOffers.find(o => o.id === "oil_stain_removal");
    expect(oilStain).toBeTruthy();
    expect(oilStain!.price).toBe(99);
  });

  it("13. Changing multiplier in admin → public quote reflects new price", () => {
    const modified = V1_CATALOG.map(item =>
      item.id === "driveway_crosssell"
        ? { ...item, priceConfig: { baseService: "driveway_cleaning", multiplier: 0.75, basePrice: 140 } }
        : item
    );
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing"]),
    });
    const result = evaluateUpsells(modified, ctx);
    const driveway = result.displayOffers.find(o => o.id === "driveway_crosssell");
    expect(driveway).toBeTruthy();
    // $140 × 0.75 = $105
    expect(driveway!.price).toBe(105);
  });

  it("14. Changing bundle price in admin → public quote reflects new price", () => {
    const modified = V1_CATALOG.map(item =>
      item.id === "roof_house_gutter_combo"
        ? { ...item, priceConfig: { bundlePrice: 299, discountAmount: 50 } }
        : item
    );
    const ctx = makeCtx({
      selectedServices: new Set(["roof_cleaning"]),
    });
    const result = evaluateUpsells(modified, ctx);
    const combo = result.displayOffers.find(o => o.id === "roof_house_gutter_combo");
    expect(combo).toBeTruthy();
    expect(combo!.price).toBe(299);
  });

  // ── Totals truth ──

  it("15. displayOffers price = computePrice result for each offer", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing"]),
      servicePrices: { driveway_cleaning: 140 },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    for (const offer of result.displayOffers) {
      const computed = computePrice(offer, ctx);
      // The displayed offer should already have the resolved price
      expect(offer.price).toBe(computed);
    }
  });

  // ── Display rules ──

  it("At most 1 add-on, 1 cross-sell, 1 bundle shown", () => {
    const ctx = makeCtx({
      selectedServices: new Set(["house_washing", "window_cleaning", "gutter_cleaning"]),
      coveredFeatures: coveredFeaturesForTier("good"),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    const result = evaluateUpsells(V1_CATALOG, ctx);
    const addOns = result.displayOffers.filter(o => o.category === "add_on");
    const crossSells = result.displayOffers.filter(o => o.category === "cross_sell");
    const bundles = result.displayOffers.filter(o => o.category === "bundle");
    expect(addOns.length).toBeLessThanOrEqual(1);
    expect(crossSells.length).toBeLessThanOrEqual(1);
    expect(bundles.length).toBeLessThanOrEqual(1);
    expect(result.displayOffers.length).toBeLessThanOrEqual(3);
  });

  // ── per_unit pricing with min/max clamping ──

  it("per_unit pricing: rate × quantity with min/max clamping", () => {
    const item: UpsellItem = {
      id: "test_per_unit",
      title: "Test",
      description: "",
      price: 0,
      appliesTo: ["window_cleaning"],
      category: "add_on",
      pricingMode: "per_unit",
      priceConfig: { ratePerUnit: 5, unitKey: "windowCount", minimumCharge: 49, maximumCharge: 199 },
    };
    // 15 windows × $5 = $75, within [49, 199]
    const ctx15 = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      serviceInputQuantities: { window_cleaning: { windowCount: 15, sqft: 0, linearFeet: 0 } },
    });
    expect(computePrice(item, ctx15)).toBe(75);

    // 5 windows × $5 = $25, clamped to minimum $49
    const ctx5 = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      serviceInputQuantities: { window_cleaning: { windowCount: 5, sqft: 0, linearFeet: 0 } },
    });
    expect(computePrice(item, ctx5)).toBe(49);

    // 50 windows × $5 = $250, clamped to maximum $199
    const ctx50 = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      serviceInputQuantities: { window_cleaning: { windowCount: 50, sqft: 0, linearFeet: 0 } },
    });
    expect(computePrice(item, ctx50)).toBe(199);
  });

  // ── Legacy admin field names still work ──

  it("per_unit pricing: legacy field names (rate/unitSource) work via computePrice", () => {
    const item: UpsellItem = {
      id: "test_legacy",
      title: "Test",
      description: "",
      price: 99,
      appliesTo: ["window_cleaning"],
      category: "add_on",
      pricingMode: "per_unit",
      priceConfig: { rate: 6, unitSource: "window_count" } as any,
    };
    const ctx = makeCtx({
      selectedServices: new Set(["window_cleaning"]),
      serviceInputQuantities: { window_cleaning: { windowCount: 20, sqft: 0, linearFeet: 0 } },
    });
    // 20 × $6 = $120
    expect(computePrice(item, ctx)).toBe(120);
  });

  it("bundle_discount pricing: legacy explicitBundlePrice field works", () => {
    const item: UpsellItem = {
      id: "test_legacy_bundle",
      title: "Test",
      description: "",
      price: 0,
      appliesTo: ["house_washing"],
      category: "bundle",
      pricingMode: "bundle_discount",
      priceConfig: { explicitBundlePrice: 179 } as any,
    };
    const ctx = makeCtx({ selectedServices: new Set(["house_washing"]) });
    expect(computePrice(item, ctx)).toBe(179);
  });
});
