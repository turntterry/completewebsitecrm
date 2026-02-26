/**
 * Pricing Engine – Phase 2
 * Calculates instant quote line items from service configs and property inputs.
 */

export interface SizeTier {
  minSize: number;
  maxSize: number | null;
  ratePerUnit: number;
}

export interface StoryMultiplier {
  one_story: number;
  two_story: number;
  three_story: number;
}

export interface ConditionMultiplier {
  light: number;
  medium: number;
  heavy: number;
}

export interface ServicePricingConfig {
  id: number;
  name: string;
  pricingType: "fixed" | "per_sqft" | "per_linear_ft" | "per_unit" | "tiered";
  basePrice: string | null;
  pricePerUnit: string | null;
  minimumCharge: string | null;
  sizeTiers: SizeTier[] | null;
  storyMultiplier: StoryMultiplier | null;
  conditionMultiplier: ConditionMultiplier | null;
  addOns: { name: string; price: number; description?: string }[] | null;
}

export interface QuoteInput {
  services: ServicePricingConfig[];
  squareFootage?: number;
  stories?: 1 | 2 | 3;
  condition?: "light" | "medium" | "heavy";
  jobMinimum?: number;
  bundleDiscountEnabled?: boolean;
  bundleDiscountTiers?: { minServices: number; discountPercent: number }[];
}

export interface QuoteLineResult {
  serviceId: number;
  serviceName: string;
  basePrice: number;
  adjustedPrice: number;
  storyMultiplier: number;
  conditionMultiplier: number;
}

export interface QuoteResult {
  lines: QuoteLineResult[];
  subtotal: number;
  bundleDiscountPercent: number;
  bundleDiscountAmount: number;
  total: number;
  appliedJobMinimum: boolean;
}

function parseDecimal(val: string | null | undefined): number {
  if (val == null) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function calcBasePrice(service: ServicePricingConfig, sqft: number): number {
  const pricingType = service.pricingType ?? "per_sqft";
  const basePrice = parseDecimal(service.basePrice);
  const pricePerUnit = parseDecimal(service.pricePerUnit);
  const minimumCharge = parseDecimal(service.minimumCharge);

  let price = 0;

  if (pricingType === "fixed") {
    price = basePrice;
  } else if (pricingType === "per_sqft" || pricingType === "per_linear_ft" || pricingType === "per_unit") {
    price = basePrice + pricePerUnit * sqft;
  } else if (pricingType === "tiered" && service.sizeTiers && service.sizeTiers.length > 0) {
    const tiers = service.sizeTiers;
    const matchedTier = tiers.find(
      (t) => sqft >= t.minSize && (t.maxSize === null || sqft <= t.maxSize)
    );
    if (matchedTier) {
      price = matchedTier.ratePerUnit * sqft;
    } else {
      // Use last tier if beyond range
      const lastTier = tiers[tiers.length - 1];
      price = lastTier.ratePerUnit * sqft;
    }
  } else {
    price = basePrice + pricePerUnit * sqft;
  }

  return Math.max(price, minimumCharge);
}

function getStoryMultiplier(service: ServicePricingConfig, stories: 1 | 2 | 3): number {
  if (!service.storyMultiplier) return 1;
  const key = stories === 1 ? "one_story" : stories === 2 ? "two_story" : "three_story";
  return service.storyMultiplier[key] ?? 1;
}

function getConditionMultiplier(service: ServicePricingConfig, condition: "light" | "medium" | "heavy"): number {
  if (!service.conditionMultiplier) return 1;
  return service.conditionMultiplier[condition] ?? 1;
}

function getBundleDiscount(
  serviceCount: number,
  tiers: { minServices: number; discountPercent: number }[]
): number {
  if (!tiers || tiers.length === 0) return 0;
  // Find the highest applicable tier
  const sorted = [...tiers].sort((a, b) => b.minServices - a.minServices);
  const matched = sorted.find((t) => serviceCount >= t.minServices);
  return matched ? matched.discountPercent : 0;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const sqft = input.squareFootage ?? 1000;
  const stories = (input.stories ?? 1) as 1 | 2 | 3;
  const condition = input.condition ?? "medium";

  const lines: QuoteLineResult[] = input.services.map((service) => {
    const base = calcBasePrice(service, sqft);
    const storyMult = getStoryMultiplier(service, stories);
    const condMult = getConditionMultiplier(service, condition);
    const adjusted = base * storyMult * condMult;

    return {
      serviceId: service.id,
      serviceName: service.name,
      basePrice: Math.round(base * 100) / 100,
      adjustedPrice: Math.round(adjusted * 100) / 100,
      storyMultiplier: storyMult,
      conditionMultiplier: condMult,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.adjustedPrice, 0);

  let bundleDiscountPercent = 0;
  if (input.bundleDiscountEnabled && input.bundleDiscountTiers) {
    bundleDiscountPercent = getBundleDiscount(lines.length, input.bundleDiscountTiers);
  }

  const bundleDiscountAmount = (subtotal * bundleDiscountPercent) / 100;
  let total = subtotal - bundleDiscountAmount;

  const jobMinimum = input.jobMinimum ?? 0;
  const appliedJobMinimum = total < jobMinimum && jobMinimum > 0;
  if (appliedJobMinimum) total = jobMinimum;

  return {
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    bundleDiscountPercent,
    bundleDiscountAmount: Math.round(bundleDiscountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    appliedJobMinimum,
  };
}
