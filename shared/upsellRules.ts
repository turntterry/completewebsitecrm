/**
 * Shared upsell rule evaluator — QuoteIQ-style offer engine.
 *
 * Architecture:
 *   1. Offer types   — add_on | cross_sell | bundle
 *   2. Pricing model — flat | per_unit | service_multiplier | package_delta | bundle_discount
 *   3. Coverage      — coveredFeatures derived from service selection + package tiers
 *   4. Suppression   — applied before ranking so only valid offers reach the user
 *   5. Ranking       — best per category slot, max 3 displayed
 *
 * All rendering, pricing, review, submission, and analytics must derive from
 * the same `displayOffers` list returned by evaluateUpsells().
 */

// ── Offer type ────────────────────────────────────────────────────────────────

/**
 * add_on    — small extra attached to a selected service (toggle / checkbox)
 * cross_sell — adjacent service that pairs naturally with current selection
 * bundle    — named grouped offer with visible savings or value framing
 */
export type UpsellCategory = "add_on" | "cross_sell" | "bundle";

// ── Pricing model ─────────────────────────────────────────────────────────────

/**
 * flat              — explicit dollar amount; most add-ons use this
 * per_unit          — ratePerUnit × quantity (windows, sqft, linear ft)
 * service_multiplier — baseService price × multiplier (same-visit discount)
 * package_delta     — difference between two package tiers
 * bundle_discount   — explicit bundle price with optional savingsText
 */
export type PricingMode =
  | "flat"
  | "per_unit"
  | "service_multiplier"
  | "package_delta"
  | "bundle_discount";

/**
 * Admin-editable pricing parameters.
 * Only fields relevant to the selected pricingMode are used.
 */
export interface PriceConfig {
  /** flat / package_delta: the explicit dollar amount */
  amount?: number;
  /** per_unit: price per single unit */
  ratePerUnit?: number;
  /**
   * per_unit: which quantity from UpsellContext to multiply against.
   * Canonical keys: "windowCount", "sqft", "linearFeet"
   */
  unitKey?: "windowCount" | "sqft" | "linearFeet";
  /** service_multiplier: service key whose resolved price is the base */
  baseService?: string;
  /** service_multiplier: fraction of base service price (e.g. 0.85 = 15% off) */
  multiplier?: number;
  /** bundle_discount: what the user pays for the bundle */
  bundlePrice?: number;
  /** bundle_discount: dollar amount saved vs booking separately */
  discountAmount?: number;
  /**
   * Fallback base price for service_multiplier mode when the base service is
   * not yet in the user's cart (typical for cross-sell offers).
   * Admin sets this to the typical standalone price of that service.
   * Example: driveway_cleaning basePrice = 140 → 140 × 0.85 = $119 cross-sell price.
   */
  basePrice?: number;
  /** per_unit / service_multiplier: floor on computed price */
  minimumCharge?: number;
  /** per_unit / service_multiplier: ceiling on computed price */
  maximumCharge?: number;
}

// ── Data model ────────────────────────────────────────────────────────────────

export interface UpsellItem {
  id: string;
  title: string;
  description: string;
  /**
   * Resolved display price shown to the user.
   * Should be kept in sync with pricingMode + priceConfig for flat offers.
   * Dynamic modes (per_unit, service_multiplier) compute at runtime via computePrice().
   */
  price: number;
  /** Legacy: services that make this item eligible. Prefer requiresAnyServices. */
  appliesTo: string[];
  badge?: string;
  active?: boolean;
  sortOrder?: number;

  // ── Offer type ──────────────────────────────────────────────────────────────
  /** add_on | cross_sell | bundle */
  category?: UpsellCategory;

  // ── Pricing model ────────────────────────────────────────────────────────────
  /** How this offer's price is computed. Admin-editable. Defaults to "flat". */
  pricingMode?: PricingMode;
  /** Parameters for the selected pricingMode. Admin-editable without code changes. */
  priceConfig?: PriceConfig;
  /** Overrides computePrice() entirely. Use only when dynamic pricing is wrong. */
  manualPriceOverride?: number;
  /** Human-readable savings framing shown on bundle cards. */
  displaySavingsText?: string;

  // ── Eligibility rules ────────────────────────────────────────────────────────
  /** Item is eligible when at least one of these services is selected. */
  requiresAnyServices?: string[];
  /** Item is suppressed when any of these services is already selected. */
  excludeIfServicesSelected?: string[];

  // ── Coverage / suppression ───────────────────────────────────────────────────
  /**
   * Services this bundle/offer effectively delivers.
   * Suppressed if any listed service is already directly selected
   * (prevents offering a "House Wash Combo" when house washing is already in cart).
   */
  includesServices?: string[];
  /**
   * Features this offer provides (for suppressing other offers targeting the same feature).
   * Example: a bundle that includes interior window cleaning declares "interior_glass".
   */
  includesFeatures?: string[];
  /**
   * Suppress this offer when any of these feature keys are already covered
   * by the user's selected package tier or another bundle.
   * Must use exact vocabulary from WINDOW_PACKAGE_FEATURES or equivalent.
   */
  suppressIfFeatureCovered?: string[];

  // ── Size guards ──────────────────────────────────────────────────────────────
  /** Minimum living area sqft required to show this offer. */
  minSqft?: number;
  /** Maximum living area sqft allowed. */
  maxSqft?: number;

  // ── Ranking ──────────────────────────────────────────────────────────────────
  /** Higher priority = shown first within its category slot. Default 50. */
  priority?: number;
  /** Only one item per group is ever shown (highest priority wins). */
  exclusiveGroup?: string;

  /** Passthrough storage for admin-defined rule overrides. */
  rules?: Record<string, unknown>;
}

// ── Evaluation context ────────────────────────────────────────────────────────

export interface UpsellContext {
  selectedServices: Set<string>;
  sqft?: number | null;
  stories?: number | null;
  subtotal: number;
  /**
   * Derived features already covered by the user's selection.
   * Built by buildCoveredFeatures() from selected package tiers and bundles.
   */
  coveredFeatures?: Set<string>;
  /**
   * Resolved per-service prices for service_multiplier pricing mode.
   * Keyed by service id (e.g. "driveway_cleaning" → 119).
   */
  servicePrices?: Record<string, number>;
  /**
   * Raw service input quantities for per_unit pricing mode.
   * Keyed by service id → input field map.
   */
  serviceInputQuantities?: Record<string, Record<string, number>>;
}

// ── Pricing engine ────────────────────────────────────────────────────────────

/**
 * Clamp a computed price between optional min/max bounds.
 */
function clamp(value: number, min?: number, max?: number): number {
  let v = value;
  if (min != null && v < min) v = min;
  if (max != null && v > max) v = max;
  return v;
}

/**
 * Compute the display price for an offer given the current quote context.
 *
 * flat              → priceConfig.amount ?? item.price
 * bundle_discount   → priceConfig.bundlePrice ?? priceConfig.amount ?? item.price
 * service_multiplier → ctx.servicePrices[baseService] × multiplier, clamped to min/max
 * per_unit          → ratePerUnit × quantity from context, clamped to min/max
 * package_delta     → priceConfig.amount ?? item.price
 *
 * The engine accepts both canonical PriceConfig field names and legacy admin
 * field names (rate/unitSource/explicitBundlePrice) so existing DB data works.
 */
export function computePrice(item: UpsellItem, ctx: UpsellContext): number {
  if (item.manualPriceOverride != null) return item.manualPriceOverride;

  const mode = item.pricingMode ?? "flat";
  // Use a loose type so we accept both canonical field names and legacy admin field names
  const cfg = (item.priceConfig ?? {}) as Record<string, unknown>;

  switch (mode) {
    case "flat":
    case "package_delta":
      return (cfg.amount as number) ?? item.price;

    case "bundle_discount":
      // Accept both bundlePrice (canonical) and explicitBundlePrice (legacy admin)
      return (cfg.bundlePrice as number)
        ?? (cfg.explicitBundlePrice as number)
        ?? (cfg.amount as number)
        ?? item.price;

    case "service_multiplier": {
      const baseService = cfg.baseService as string | undefined;
      const multiplier = (cfg.multiplier as number) ?? 1;
      const fallbackBase = (cfg.basePrice as number) ?? 0;
      // Use real service price from quote context if available (service already in cart).
      // Fall back to admin-set basePrice (typical standalone price) when service is not yet selected.
      const livePrice = baseService
        ? (ctx.servicePrices?.[baseService] ?? 0)
        : 0;
      const base = livePrice > 0 ? livePrice : fallbackBase;
      if (base <= 0) return item.price;
      const raw = Math.round(base * multiplier);
      return clamp(raw, cfg.minimumCharge as number, cfg.maximumCharge as number);
    }

    case "per_unit": {
      // Accept both canonical (ratePerUnit/unitKey) and legacy admin (rate/unitSource)
      const rate = (cfg.ratePerUnit as number) ?? (cfg.rate as number) ?? 0;
      const rawKey = (cfg.unitKey as string) ?? (cfg.unitSource as string) ?? "";
      if (!rate || !rawKey) return item.price;

      // Map legacy admin values (window_count, square_feet, linear_feet) to
      // canonical serviceInputQuantities keys (windowCount, sqft, linearFeet)
      const UNIT_KEY_MAP: Record<string, string> = {
        window_count: "windowCount",
        affected_window_count: "windowCount",
        square_feet: "sqft",
        linear_feet: "linearFeet",
        // canonical keys map to themselves
        windowCount: "windowCount",
        sqft: "sqft",
        linearFeet: "linearFeet",
      };
      const resolvedKey = UNIT_KEY_MAP[rawKey] ?? rawKey;

      // Flatten serviceInputQuantities to find the right quantity
      const allInputs = ctx.serviceInputQuantities ?? {};
      let quantity = 0;
      for (const inputs of Object.values(allInputs)) {
        const v = inputs[resolvedKey];
        if (v != null && v > 0) { quantity = v; break; }
      }
      if (quantity <= 0) return item.price;
      const raw = Math.round(rate * quantity);
      return clamp(raw, cfg.minimumCharge as number, cfg.maximumCharge as number);
    }

    default:
      return item.price;
  }
}

// ── Evaluation result ─────────────────────────────────────────────────────────

export interface EvaluatedOffers {
  addOn: UpsellItem | null;
  crossSell: UpsellItem | null;
  bundle: UpsellItem | null;
  /** Exact flat list to render, price, track, and submit. Max 3 items. */
  displayOffers: UpsellItem[];
}

// ── Suppression check ─────────────────────────────────────────────────────────

function isEligible(item: UpsellItem, ctx: UpsellContext): boolean {
  // 1. Service match: requiresAnyServices takes precedence over legacy appliesTo
  const matchSet = item.requiresAnyServices ?? item.appliesTo;
  if (!matchSet.some(s => ctx.selectedServices.has(s))) return false;

  // 2. Conflicting service already selected
  if (item.excludeIfServicesSelected?.some(s => ctx.selectedServices.has(s))) return false;

  // 3. Bundle component suppression: offering a bundle that "includes" a service
  //    the user already has would imply double-charging for that service.
  if (item.includesServices?.some(s => ctx.selectedServices.has(s))) return false;

  // 4. Feature-coverage suppression: hide offers whose target capability is
  //    already covered by the user's selected package tier or another bundle.
  if (
    item.suppressIfFeatureCovered &&
    ctx.coveredFeatures &&
    item.suppressIfFeatureCovered.some(f => ctx.coveredFeatures!.has(f))
  ) return false;

  // 5. Property size guards
  if (item.minSqft != null && ctx.sqft != null && ctx.sqft < item.minSqft) return false;
  if (item.maxSqft != null && ctx.sqft != null && ctx.sqft > item.maxSqft) return false;

  return true;
}

// ── Main evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluate the upsell catalog against the current quote context.
 *
 * Returns the exact flat list to render (max 3):
 *   1 best add_on  +  1 best cross_sell  +  1 best bundle
 *
 * Suppression runs before ranking so only valid offers reach the user.
 */
export function evaluateUpsells(
  catalog: UpsellItem[],
  ctx: UpsellContext
): EvaluatedOffers {
  const active = catalog.filter(item => item.active !== false);

  // Phase 1: Suppression — filter out redundant or ineligible offers
  const eligible = active.filter(item => isEligible(item, ctx));

  // Phase 2: Rank — priority desc → sortOrder asc → price asc
  const ranked = [...eligible].sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pb - pa;
    const sa = a.sortOrder ?? 999;
    const sb = b.sortOrder ?? 999;
    if (sa !== sb) return sa - sb;
    return a.price - b.price;
  });

  // Phase 3: Pick best per category slot, respecting exclusive groups
  const usedGroups = new Set<string>();

  function pickBest(category: UpsellCategory): UpsellItem | null {
    for (const item of ranked) {
      if ((item.category ?? "add_on") !== category) continue;
      if (item.exclusiveGroup && usedGroups.has(item.exclusiveGroup)) continue;
      if (item.exclusiveGroup) usedGroups.add(item.exclusiveGroup);
      return item;
    }
    return null;
  }

  const addOn = pickBest("add_on");
  const crossSell = pickBest("cross_sell");
  const bundle = pickBest("bundle");

  // Phase 4: Resolve prices — compute final price from pricingMode + ctx for each selected offer.
  // This ensures downstream code (totals, review, submission) always reads the real computed price.
  function withResolvedPrice(item: UpsellItem): UpsellItem {
    const computed = computePrice(item, ctx);
    return computed !== item.price ? { ...item, price: computed } : item;
  }

  // Phase 5: Flat display list — consistent order: add-on, cross-sell, bundle
  const displayOffers = [addOn, crossSell, bundle]
    .filter(Boolean)
    .map(item => withResolvedPrice(item!)) as UpsellItem[];

  return { addOn, crossSell, bundle, displayOffers };
}
