/**
 * Feature Maturity Registry
 *
 * Tracks which features are production-ready, in beta, internal-only, or stubbed.
 * This makes code maturity transparent and prevents users from depending on
 * incomplete functionality.
 */

export type FeatureMaturity = "production" | "beta" | "internal" | "stubbed";

export interface FeatureStatus {
  name: string;
  maturity: FeatureMaturity;
  description: string;
  notes?: string;
}

export const FEATURE_MATURITY_REGISTRY: Record<string, FeatureStatus> = {
  // ─── PRODUCTION: Fully implemented and tested in production ────────────────
  quoteEngine: {
    name: "Quote Engine",
    maturity: "production",
    description: "Public quote tool for instant quotes with session tracking",
  },
  crmPipeline: {
    name: "CRM Pipeline",
    maturity: "production",
    description: "Lead/request → Quote → Job → Invoice pipeline",
  },
  invoicing: {
    name: "Invoicing",
    maturity: "production",
    description: "Invoice creation, status tracking, and portal payment view",
  },
  smsInbox: {
    name: "SMS Inbox",
    maturity: "production",
    description: "Inbound/outbound SMS with conversation threading",
  },
  customerPortal: {
    name: "Customer Portal",
    maturity: "production",
    description: "Public portal for customers to view quotes and invoices",
  },

  // ─── BETA: Mostly implemented but not fully tested in production ──────────
  automationEngine: {
    name: "Automation Engine",
    maturity: "beta",
    description: "Trigger-based automations (email, SMS, status changes)",
    notes:
      "Email behavior is placeholder-level; not all action types are fully real. See server/services/automationEngine.ts",
  },
  aiReceptionist: {
    name: "AI Receptionist",
    maturity: "beta",
    description: "Auto-reply to SMS using Claude API",
    notes: "Optional; app works fine without it. Requires ANTHROPIC_API_KEY env var",
  },

  // ─── INTERNAL: Only for admin use; not customer-facing ────────────────────
  analyticsTracking: {
    name: "Analytics Tracking",
    maturity: "internal",
    description: "Quote session events and pipeline metrics",
    notes: "Used internally for dashboards and reporting",
  },
  adminSettings: {
    name: "Admin Settings",
    maturity: "internal",
    description: "Company settings, service configuration, team management",
  },

  // ─── STUBBED: Not actually implemented; disabled or mocked ────────────────
  propertyIntelligence: {
    name: "Property Intelligence",
    maturity: "stubbed",
    description: "Property data like living area, roof area, year built",
    notes:
      "Uses mockPropertyIntel() to generate synthetic data from address hash. Never treat as authoritative. See server/routers/publicSite.ts mockPropertyIntel()",
  },
  schedulerAvailability: {
    name: "Scheduler Availability",
    maturity: "stubbed",
    description: "Provider-based scheduling with real slot availability",
    notes:
      "Mixed real + fallback behavior. May show polished UI while relying on mock data. See server/routers/publicSite.ts mockAvailabilityProvider",
  },
  mapMeasurement: {
    name: "Map Measurement",
    maturity: "stubbed",
    description: "Polygon drawing, parcel tracing, quote-driven measurements",
    notes:
      "Map integration exists for service areas + address support only. Full measurement workflow was never completed. Do not expose as a feature.",
  },
  expertCam: {
    name: "Expert Cam",
    maturity: "stubbed",
    description: "Photo documentation module for field crew",
    notes: "Groundwork exists but feature is not production-ready",
  },
  reviewAutomation: {
    name: "Review Automation",
    maturity: "stubbed",
    description: "Automated review request and management",
    notes: "Not fully integrated into the CRM workflow",
  },
};

/**
 * Get feature maturity info
 */
export function getFeatureStatus(featureKey: string): FeatureStatus | undefined {
  return FEATURE_MATURITY_REGISTRY[featureKey];
}

/**
 * Check if a feature is production-ready
 */
export function isProductionReady(featureKey: string): boolean {
  return getFeatureStatus(featureKey)?.maturity === "production";
}

/**
 * Check if a feature is safe to use (production or beta)
 */
export function isSafeToUse(featureKey: string): boolean {
  const status = getFeatureStatus(featureKey);
  return status?.maturity === "production" || status?.maturity === "beta";
}

/**
 * Check if a feature is disabled (stubbed)
 */
export function isDisabled(featureKey: string): boolean {
  return getFeatureStatus(featureKey)?.maturity === "stubbed";
}

/**
 * Get all stubbed features (to hide from UI)
 */
export function getStubbedFeatures(): FeatureStatus[] {
  return Object.values(FEATURE_MATURITY_REGISTRY).filter(
    (f) => f.maturity === "stubbed"
  );
}

/**
 * Get all production features
 */
export function getProductionFeatures(): FeatureStatus[] {
  return Object.values(FEATURE_MATURITY_REGISTRY).filter(
    (f) => f.maturity === "production"
  );
}
