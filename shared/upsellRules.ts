/**
 * Shared upsell rule evaluator.
 *
 * Used by PublicQuoteTool to select which offers to display.
 * All rendering, pricing, review, submission, and analytics must
 * derive from the same `displayOffers` list this produces.
 */

export type UpsellCategory = "micro" | "cross-sell" | "bundle";

export interface UpsellItem {
  id: string;
  title: string;
  description: string;
  price: number;
  /** Legacy: services that make this item eligible. Prefer requiresAnyServices. */
  appliesTo: string[];
  badge?: string;
  active?: boolean;
  sortOrder?: number;
  // ── Rule engine fields ───────────────────────────────────────────────────
  /** micro = small add-on | cross-sell = adjacent service | bundle = named package */
  category?: UpsellCategory;
  /** Higher = shown first within its category slot. Default 50. */
  priority?: number;
  /** Only one item per group is ever shown (highest priority wins). */
  exclusiveGroup?: string;
  /** Item is eligible when at least one of these services is selected. */
  requiresAnyServices?: string[];
  /** Item is suppressed when any of these services is already selected. */
  excludeIfServicesSelected?: string[];
  /** Minimum living area sqft required. */
  minSqft?: number;
  /** Maximum living area sqft allowed. */
  maxSqft?: number;
  /**
   * Services this bundle/offer effectively contains.
   * If any listed service is already directly selected, the offer is suppressed
   * (prevents showing a "House Wash Combo" when house washing is already in cart).
   */
  includesServices?: string[];
  /**
   * Suppress this offer when any of these feature keys are already covered
   * by the user's current selection (e.g. package tier, another bundle).
   * Example: ["interior_windows"] on Add Interior Windows upsell.
   */
  suppressIfFeatureCovered?: string[];
  /** Passthrough storage for admin-defined rule overrides. */
  rules?: Record<string, unknown>;
}

export interface UpsellContext {
  selectedServices: Set<string>;
  sqft?: number | null;
  stories?: number | null;
  subtotal: number;
  /**
   * Derived features already covered by the user's selection.
   * Built from selected package tiers, bundle choices, and service defaults.
   * Used to suppress offers that are redundant with current package coverage.
   */
  coveredFeatures?: Set<string>;
}

export interface EvaluatedOffers {
  micro: UpsellItem | null;
  crossSell: UpsellItem | null;
  bundle: UpsellItem | null;
  /** The exact flat list to render, price, track, and submit. Max 3 items. */
  displayOffers: UpsellItem[];
}

function isEligible(item: UpsellItem, ctx: UpsellContext): boolean {
  // Service match: requiresAnyServices takes precedence over legacy appliesTo
  const matchSet = item.requiresAnyServices ?? item.appliesTo;
  if (!matchSet.some(s => ctx.selectedServices.has(s))) return false;

  // Suppression: conflicting service already selected
  if (item.excludeIfServicesSelected?.some(s => ctx.selectedServices.has(s))) return false;

  // Bundle component suppression: if this offer "includes" a service the user
  // already has, showing it would imply double-charging for that service.
  if (item.includesServices?.some(s => ctx.selectedServices.has(s))) return false;

  // Feature-coverage suppression: hide offers when the user's selected package
  // tier (or another bundle) already covers the advertised capability.
  if (
    item.suppressIfFeatureCovered &&
    ctx.coveredFeatures &&
    item.suppressIfFeatureCovered.some(f => ctx.coveredFeatures!.has(f))
  ) return false;

  // Property size guards
  if (item.minSqft != null && ctx.sqft != null && ctx.sqft < item.minSqft) return false;
  if (item.maxSqft != null && ctx.sqft != null && ctx.sqft > item.maxSqft) return false;

  return true;
}

export function evaluateUpsells(
  catalog: UpsellItem[],
  ctx: UpsellContext
): EvaluatedOffers {
  const active = catalog.filter(item => item.active !== false);

  // 1. Eligibility filter
  const eligible = active.filter(item => isEligible(item, ctx));

  // 2. Rank: priority desc → sortOrder asc → price asc
  const ranked = [...eligible].sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pb - pa;
    const sa = a.sortOrder ?? 999;
    const sb = b.sortOrder ?? 999;
    if (sa !== sb) return sa - sb;
    return a.price - b.price;
  });

  // 3. Pick best item per category, respecting exclusive groups
  const usedGroups = new Set<string>();

  function pickBest(category: UpsellCategory): UpsellItem | null {
    for (const item of ranked) {
      if ((item.category ?? "micro") !== category) continue;
      if (item.exclusiveGroup && usedGroups.has(item.exclusiveGroup)) continue;
      if (item.exclusiveGroup) usedGroups.add(item.exclusiveGroup);
      return item;
    }
    return null;
  }

  const micro = pickBest("micro");
  const crossSell = pickBest("cross-sell");
  const bundle = pickBest("bundle");

  // 4. Flat display list — same order: micro, cross-sell, bundle
  const displayOffers = [micro, crossSell, bundle].filter(Boolean) as UpsellItem[];

  return { micro, crossSell, bundle, displayOffers };
}
