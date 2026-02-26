// ─── Pricing Engine (shared between client and server) ───────────────

export interface PricingInput {
  serviceType: string;
  // House washing
  sqft?: number;
  stories?: number;
  // Window cleaning
  windowCount?: number;
  includeInterior?: boolean;
  includeExterior?: boolean;
  includeScreens?: boolean;
  // Size-tier services (legacy support)
  sizeSelection?: "S" | "M" | "L" | "XL" | "2XL";
  // Direct measurement inputs (slider-based)
  linearFeet?: number;
  // Roof
  roofPitch?: "low" | "medium" | "steep";
  // Fence
  fenceSides?: 1 | 2;
  // Package tier
  packageTier?: "good" | "better" | "best";
}

export interface PricingResult {
  serviceType: string;
  basePrice: number;
  finalPrice: number;
  breakdown: string[];
  minApplied: boolean;
}

export interface QuoteSummary {
  items: PricingResult[];
  subtotal: number;
  bundleDiscount: number;
  bundleDiscountPercent: number;
  travelFee: number;
  jobMinimumApplied: boolean;
  totalPrice: number;
}

export interface ServiceConfig {
  ratePerSqft?: number;
  minPrice?: number;
  minDuration?: number;
  targetRevenuePerHour?: number;
  storyMultipliers?: Record<string, number>;
  garageMultiplier?: number;
  interiorPerWindow?: number;
  exteriorPerWindow?: number;
  screenPerWindow?: number;
  ratePerLinearFt?: number;
  pitchMultipliers?: Record<string, number>;
  sizeTiers?: Record<string, number>;
  fenceSidesMultiplier?: number; // multiplier for both sides (default 1.75)
  windowPackageMultipliers?: {
    good: number;
    better: number;
    best: number;
  };
  // Slider range config
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderDefault?: number;
  sliderUnit?: string; // "sq ft" or "linear ft"
}

export interface GlobalConfig {
  jobMinimum: number;
  taxRate: number;
  travelRadius: number;
  baseAddress: string;
  baseLat: number;
  baseLng: number;
  bundleDiscounts: Record<string, number>;
  travelFeePerMile: number;
  freeRadius: number;
}

export function calculateServicePrice(
  input: PricingInput,
  config: ServiceConfig
): PricingResult {
  const breakdown: string[] = [];
  let basePrice = 0;

  switch (input.serviceType) {
    case "house_washing": {
      const sqft = input.sqft || 1500;
      const stories = input.stories || 1;
      const rate = config.ratePerSqft || 0.14;
      const storyMult = config.storyMultipliers?.[String(stories)] || 1.0;
      basePrice = sqft * rate * storyMult;
      breakdown.push(`${sqft} sq ft × $${rate}/sq ft = $${(sqft * rate).toFixed(2)}`);
      if (storyMult !== 1.0) {
        breakdown.push(`${stories}-story multiplier: ×${storyMult}`);
      }
      break;
    }
    case "window_cleaning": {
      const count = input.windowCount || 10;
      const tier = input.packageTier || "good";
      const packageMults = config.windowPackageMultipliers || { good: 1.0, better: 1.35, best: 1.75 };
      const tierMult = packageMults[tier] || 1.0;
      const extRate = config.exteriorPerWindow || 11;

      // Base price is exterior rate × count × package multiplier
      basePrice = count * extRate * tierMult;
      const tierName = tier === "best" ? "Platinum Perfection" : tier === "better" ? "Signature Sparkle" : "Expert Essential";
      breakdown.push(`${count} windows × $${extRate}/window = $${(count * extRate).toFixed(2)}`);
      if (tierMult !== 1.0) {
        breakdown.push(`${tierName} package: ×${tierMult}`);
      }
      break;
    }
    case "roof_cleaning": {
      const sqft = input.sqft || 1500;
      const rate = config.ratePerSqft || 0.30;
      const pitch = input.roofPitch || "low";
      const pitchMult = config.pitchMultipliers?.[pitch] || 1.0;
      basePrice = sqft * rate * pitchMult;
      breakdown.push(`${sqft} sq ft × $${rate}/sq ft = $${(sqft * rate).toFixed(2)}`);
      if (pitchMult !== 1.0) {
        breakdown.push(`${pitch} pitch multiplier: ×${pitchMult}`);
      }
      break;
    }
    case "gutter_cleaning": {
      const linearFt = input.linearFeet || config.sliderDefault || 150;
      const rate = config.ratePerLinearFt || 1.50;
      const stories = input.stories || 1;
      const storyMult = config.storyMultipliers?.[String(stories)] || 1.0;
      basePrice = linearFt * rate * storyMult;
      breakdown.push(`${linearFt} linear ft × $${rate}/ft = $${(linearFt * rate).toFixed(2)}`);
      if (storyMult !== 1.0) {
        breakdown.push(`${stories}-story multiplier: ×${storyMult}`);
      }
      break;
    }
    case "fence_cleaning": {
      const linearFt = input.linearFeet || config.sliderDefault || 100;
      const rate = config.ratePerLinearFt || 1.25;
      const sides = input.fenceSides || 1;
      const sidesMult = sides === 2 ? (config.fenceSidesMultiplier || 1.75) : 1.0;
      basePrice = linearFt * rate * sidesMult;
      breakdown.push(`${linearFt} linear ft × $${rate}/ft = $${(linearFt * rate).toFixed(2)}`);
      if (sides === 2) {
        breakdown.push(`Both sides: ×${sidesMult}`);
      }
      break;
    }
    case "deck_cleaning": {
      // Deck uses sqft slider
      const sqft = input.sqft || config.sliderDefault || 300;
      const rate = config.ratePerSqft || 0.50;
      basePrice = sqft * rate;
      breakdown.push(`${sqft} sq ft × $${rate}/sq ft = $${basePrice.toFixed(2)}`);
      break;
    }
    default: {
      // Size-tier based services: driveway, patio, walkway, detached
      // Support both slider (sqft/linearFeet) and legacy size selection
      if (input.sqft) {
        const rate = config.ratePerSqft || 0.20;
        basePrice = input.sqft * rate;
        breakdown.push(`${input.sqft} sq ft × $${rate}/sq ft = $${basePrice.toFixed(2)}`);
      } else if (input.linearFeet) {
        const rate = config.ratePerLinearFt || 0.20;
        basePrice = input.linearFeet * rate;
        breakdown.push(`${input.linearFeet} linear ft × $${rate}/ft = $${basePrice.toFixed(2)}`);
      } else if (input.sizeSelection && config.sizeTiers) {
        const sqft = config.sizeTiers[input.sizeSelection] || 0;
        const rate = config.ratePerSqft || config.ratePerLinearFt || 0.20;
        basePrice = sqft * rate;
        breakdown.push(`Size ${input.sizeSelection} (${sqft} sq ft) × $${rate}/sq ft = $${basePrice.toFixed(2)}`);
      }
      break;
    }
  }

  // Enforce minimum
  const minPrice = config.minPrice || 0;
  const minApplied = basePrice < minPrice && basePrice > 0;
  const finalPrice = Math.max(basePrice, minPrice);
  if (minApplied) {
    breakdown.push(`Minimum price applied: $${minPrice.toFixed(2)}`);
  }

  return {
    serviceType: input.serviceType,
    basePrice: Math.round(basePrice * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    breakdown,
    minApplied,
  };
}

export function calculateQuoteTotal(
  items: PricingResult[],
  distanceMiles: number,
  globalConfig: GlobalConfig
): QuoteSummary {
  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);

  // Bundle discount
  const serviceCount = items.length;
  const bundleDiscountPercent = serviceCount >= 2
    ? (globalConfig.bundleDiscounts[String(serviceCount)] || globalConfig.bundleDiscounts[String(Math.min(serviceCount, 5))] || 0)
    : 0;
  const bundleDiscount = subtotal * (bundleDiscountPercent / 100);

  // Travel fee
  let travelFee = 0;
  if (distanceMiles > globalConfig.freeRadius) {
    const extraMiles = distanceMiles - globalConfig.freeRadius;
    travelFee = extraMiles * globalConfig.travelFeePerMile;
  }

  // Calculate total
  let totalPrice = subtotal - bundleDiscount + travelFee;

  // Enforce job minimum
  const jobMinimumApplied = totalPrice < globalConfig.jobMinimum && totalPrice > 0;
  if (jobMinimumApplied) {
    totalPrice = globalConfig.jobMinimum;
  }

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    bundleDiscount: Math.round(bundleDiscount * 100) / 100,
    bundleDiscountPercent,
    travelFee: Math.round(travelFee * 100) / 100,
    jobMinimumApplied,
    totalPrice: Math.round(totalPrice * 100) / 100,
  };
}
