import SiteLayout from "@/components/SiteLayout";
import { DEFAULT_COMPANY_ID } from "@/lib/tenancy";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { geocodeAddress } from "@/lib/maps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BUSINESS, SERVICES } from "@shared/data";
import { WINDOW_PACKAGE_FEATURES } from "@shared/windowFeatures";
import { trpc } from "@/lib/trpc";
import {
  calculateServicePrice,
  calculateQuoteTotal,
  type PricingInput,
  type PricingResult,
  type GlobalConfig,
  type ServiceConfig,
} from "@shared/pricing";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Phone,
  MapPin,
  Upload,
  Calendar,
  Clock,
  Home as HomeIcon,
  Droplets,
  SquareStack,
  Filter,
  LayoutGrid,
  Triangle,
  Fence,
  X,
  Loader2,
  Shield,
  Star,
  Ruler,
  FlipHorizontal,
  Info,
  Camera,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCanonical } from "@/hooks/useCanonical";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Slot } from "@shared/availability";
import { trackEvent } from "@/lib/analytics";
import { evaluateUpsells, type UpsellItem } from "@shared/upsellRules";

const ICON_MAP: Record<string, React.ElementType> = {
  Home: HomeIcon,
  Droplets,
  SquareStack,
  Filter,
  LayoutGrid,
  Triangle,
  Fence,
};

// Quotable services (subset of SERVICES)
const QUOTABLE_SERVICES = [
  {
    id: "house_washing",
    name: "House Washing",
    icon: "Home",
    desc: "Soft wash your home's exterior",
  },
  {
    id: "window_cleaning",
    name: "Window Cleaning",
    icon: "SquareStack",
    desc: "Interior & exterior windows",
  },
  {
    id: "gutter_cleaning",
    name: "Gutter Cleaning",
    icon: "Filter",
    desc: "Debris removal & flushing",
  },
  {
    id: "driveway_cleaning",
    name: "Driveway / Concrete",
    icon: "LayoutGrid",
    desc: "Driveways, sidewalks & patios",
  },
  {
    id: "roof_cleaning",
    name: "Roof Cleaning",
    icon: "Triangle",
    desc: "Soft wash roof treatment",
  },
  {
    id: "deck_cleaning",
    name: "Deck Cleaning",
    icon: "Fence",
    desc: "Deck surface cleaning",
  },
  {
    id: "fence_cleaning",
    name: "Fence Cleaning",
    icon: "Fence",
    desc: "Fence washing & restoration",
  },
  {
    id: "patio_cleaning",
    name: "Patio Cleaning",
    icon: "LayoutGrid",
    desc: "Patio surface cleaning",
  },
  {
    id: "walkway_cleaning",
    name: "Walkway Cleaning",
    icon: "LayoutGrid",
    desc: "Walkway & path cleaning",
  },
];

// Slider configs per service (defaults, overridden by DB config)
const SLIDER_DEFAULTS: Record<
  string,
  { min: number; max: number; step: number; default: number; unit: string }
> = {
  gutter_cleaning: {
    min: 50,
    max: 400,
    step: 10,
    default: 150,
    unit: "linear ft",
  },
  fence_cleaning: {
    min: 20,
    max: 500,
    step: 10,
    default: 100,
    unit: "linear ft",
  },
  deck_cleaning: { min: 50, max: 1200, step: 25, default: 300, unit: "sq ft" },
  driveway_cleaning: {
    min: 100,
    max: 10000,
    step: 50,
    default: 500,
    unit: "sq ft",
  },
  patio_cleaning: { min: 50, max: 1000, step: 25, default: 250, unit: "sq ft" },
  walkway_cleaning: {
    min: 20,
    max: 500,
    step: 10,
    default: 100,
    unit: "sq ft",
  },
};

// WINDOW_PACKAGE_FEATURES is imported from @shared/windowFeatures

/**
 * Derive the set of features already covered by the user's current selections.
 * Coverage comes from selected window package tiers.
 * Feature keys produced here must match suppressIfFeatureCovered on catalog items.
 */
function buildCoveredFeatures(
  selectedServices: Set<string>,
  serviceInputs: Record<string, PricingInput>
): Set<string> {
  const covered = new Set<string>();

  if (selectedServices.has("window_cleaning")) {
    const tier = (serviceInputs["window_cleaning"]?.packageTier as string | undefined) ?? "good";
    const features = WINDOW_PACKAGE_FEATURES[tier] ?? [];
    features.forEach(f => covered.add(f));
  }

  return covered;
}

/**
 * Default upsell catalog.
 *
 * Structure follows the QuoteIQ-style offer engine:
 *   - category:    add_on | cross_sell | bundle
 *   - pricingMode: flat | per_unit | service_multiplier | package_delta | bundle_discount
 *   - priceConfig: admin-editable pricing parameters (no code change needed to update prices)
 *
 * Admin override order: manualPriceOverride → priceConfig → item.price fallback.
 */
const DEFAULT_UPSELL_CATALOG: UpsellItem[] = [

  // ── Add-ons: small extras attached to an existing service ──────────────────

  {
    id: "window_screen_deep_clean",
    title: "Screen Deep Clean",
    description: "Full screen scrub and rinse — removes built-up grime for better clarity and airflow.",
    price: 89,
    appliesTo: ["window_cleaning"],
    badge: "Popular",
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 89 },
    priority: 80,
    exclusiveGroup: "window-addon",
    // Platinum Perfection (best tier) includes deep_screen_washing — suppress there
    suppressIfFeatureCovered: ["deep_screen_washing"],
  },
  {
    id: "window_track_sill_detail",
    title: "Track + Sill Detailing",
    description: "Deep clean of tracks, sills, and frame edges — the spots regular cleaning misses.",
    price: 129,
    appliesTo: ["window_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 129 },
    priority: 70,
    exclusiveGroup: "window-addon",
    // Suppress only for Platinum Perfection (covers deep_track_detailing + sills).
    // Signature Sparkle only wipes frames — Track + Sill is still a valid upsell there.
    suppressIfFeatureCovered: ["deep_track_detailing", "sills"],
  },
  {
    id: "gutter_brightening_addon",
    title: "Gutter Brightening",
    description: "Remove oxidation and tiger-stripe staining from exterior gutter faces — restores the look without a full replacement.",
    price: 79,
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
    description: "Targeted degreaser pre-treatment for oil and fluid stains on concrete — works best when combined with a full driveway clean.",
    price: 69,
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
    description: "Mineral deposit remover applied after cleaning — clears stubborn calcium and rust rings that regular washing leaves behind.",
    price: 79,
    appliesTo: ["window_cleaning"],
    requiresAnyServices: ["window_cleaning"],
    category: "add_on",
    pricingMode: "flat",
    priceConfig: { amount: 79 },
    priority: 65,
    exclusiveGroup: "window-addon",
    // Hard water treatment is a separate chemical process — not suppressed by any tier
  },

  // ── Cross-sells: adjacent services that pair naturally with current selection ─

  {
    id: "driveway_crosssell",
    title: "Add Driveway Cleaning",
    description: "Most customers add driveway cleaning while we're on site — one trip, sharper pricing, noticeably cleaner curb.",
    // price is the pre-computed same-visit rate: typical driveway base ($140) × 0.85 same-visit discount
    price: 119,
    appliesTo: ["house_washing"],
    requiresAnyServices: ["house_washing"],
    excludeIfServicesSelected: ["driveway_cleaning"],
    badge: "Recommended",
    category: "cross_sell",
    // service_multiplier: uses real driveway_cleaning price when available, otherwise falls back to basePrice
    pricingMode: "service_multiplier",
    priceConfig: {
      baseService: "driveway_cleaning",
      multiplier: 0.85,
      basePrice: 140, // admin-editable: typical standalone driveway price
    },
    priority: 85,
  },
  {
    id: "gutter_cleaning_crosssell",
    title: "Add Gutter Cleaning",
    description: "Roof wash loosens debris that settles straight into your gutters. Cleaning them in the same visit prevents the mess from re-entering.",
    // price: typical gutter base ($145) × 0.90 same-visit discount
    price: 130,
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    excludeIfServicesSelected: ["gutter_cleaning"],
    badge: "Recommended",
    category: "cross_sell",
    pricingMode: "service_multiplier",
    priceConfig: {
      baseService: "gutter_cleaning",
      multiplier: 0.90,
      basePrice: 145, // admin-editable: typical standalone gutter price
    },
    priority: 85,
  },
  {
    id: "interior_windows_addon",
    title: "Add Interior Windows",
    description: "While we clean the outside, add interior glass for a complete clear view — no second appointment needed.",
    price: 75,
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
    // Suppress for Signature Sparkle and Platinum Perfection — both include interior_glass
    suppressIfFeatureCovered: ["interior_glass"],
  },
  {
    id: "house_washing_crosssell",
    title: "Add House Washing",
    description: "Since we're already treating your roof, add a full soft-wash house exterior — same crew, same visit, cleaner result overall.",
    // price: typical house wash base ($235) × 0.90 same-visit discount
    price: 212,
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    excludeIfServicesSelected: ["house_washing"],
    badge: "Recommended",
    category: "cross_sell",
    pricingMode: "service_multiplier",
    priceConfig: {
      baseService: "house_washing",
      multiplier: 0.90,
      basePrice: 235, // admin-editable: typical standalone house wash price
    },
    priority: 78,
  },

  // ── Bundles: named packages with visible savings or value framing ───────────

  {
    id: "curb_appeal_bundle",
    title: "Curb Appeal Package",
    description: "Includes walkway touch-up and edge rinse alongside your house wash — polished full-front look in one visit.",
    price: 99,
    appliesTo: ["house_washing"],
    requiresAnyServices: ["house_washing"],
    excludeIfServicesSelected: ["driveway_cleaning", "walkway_cleaning"],
    includesServices: ["walkway_cleaning"],
    badge: "Bundle",
    category: "bundle",
    pricingMode: "bundle_discount",
    priceConfig: { bundlePrice: 99, discountAmount: 30 },
    displaySavingsText: "Save ~$30 vs adding separately",
    priority: 90,
  },
  {
    id: "roof_house_gutter_combo",
    title: "Roof + House + Gutters Combo",
    description: "Full exterior treatment in one visit — roof soft-wash, house wash, and gutter cleaning together. Best value when combining all three.",
    price: 249,
    appliesTo: ["roof_cleaning"],
    requiresAnyServices: ["roof_cleaning"],
    // Suppress if they've already independently chosen house or gutters
    excludeIfServicesSelected: ["house_washing", "gutter_cleaning"],
    badge: "Best Value",
    category: "bundle",
    pricingMode: "bundle_discount",
    priceConfig: { bundlePrice: 249, discountAmount: 79 },
    displaySavingsText: "Save ~$79 vs booking each separately",
    priority: 88,
    includesServices: ["house_washing", "gutter_cleaning"],
  },
];

const STEPS = [
  "Address & Contact",
  "Home Details",
  "Services",
  "Details",
  "Enhance",
  "Review & Schedule",
  "Submit",
];

export default function QuoteTool() {
  useCanonical("/instant-quote");
  usePageMeta({
    title: "Instant Quote | Exterior Experts",
    description: "Get a price in under 2 minutes for pressure washing, house washing, windows, gutters, and more in Cookeville & Upper Cumberland.",
  });
  const { data: pricingData, isLoading: pricingLoading } =
    trpc.publicSite.quote.getPricing.useQuery();
  const { data: experienceConfig } =
    trpc.publicSite.quote.getExperienceConfig.useQuery();
  const submitMutation = trpc.publicSite.quote.submitV2.useMutation();
  const startSessionMutation = trpc.publicSite.quote.startSession.useMutation();
  const trackEventMutation = trpc.publicSite.quote.trackEvent.useMutation();
  const uploadMutation = trpc.publicSite.quote.uploadPhoto.useMutation();

  const [step, setStep] = useState(0);
  const seenStepsRef = useRef<Set<number>>(new Set());
  const abandonTrackedRef = useRef(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("TN");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number>(0);
  const [outOfRange, setOutOfRange] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("randall@exteriorexperts.co");
  const [phone, setPhone] = useState("");

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [serviceInputs, setServiceInputs] = useState<Record<string, PricingInput>>({});
  const [propertyIntel, setPropertyIntel] = useState<PropertyIntel | null>(
    null
  );
  const lastLookupKeyRef = useRef<string | null>(null);
  const autoPrefilledServicesRef = useRef<Set<string>>(new Set());
  const newlyAddedServicesRef = useRef<Set<string>>(new Set());

  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{
    quoteId: number;
    totalPrice: number;
    confidenceMode: "exact" | "range" | "manual_review";
    schedulingEligible: boolean;
    manualReviewLeadId?: number | null;
    lowConfidenceReasons?: string[];
    schedulingBlockedReasons?: string[];
  } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [acceptedUpsells, setAcceptedUpsells] = useState<
    Record<string, boolean>
  >({});
  const shownUpsellsRef = useRef<Set<string>>(new Set());
  const [scheduleHandoffStarted, setScheduleHandoffStarted] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("quote_step", { step: STEPS[step] ?? step });
  }, [step]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const propertyLookup = trpc.publicSite.quote.lookupProperty.useQuery(
    {
      address,
      city,
      state: stateVal,
      zip,
      lat: lat || undefined,
      lng: lng || undefined,
    },
    {
      enabled:
        Boolean(address && city && stateVal && zip) &&
        !pricingLoading &&
        !submitted,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  const tierLabels = useMemo(
    () =>
      experienceConfig?.settings?.customerTierLabels ?? {
        good: "Expert Essential",
        better: "Signature Sparkle",
        best: "Platinum Perfection",
      },
    [experienceConfig?.settings?.customerTierLabels]
  );
  const propertyLookupStatus: "idle" | "loading" | "success" | "error" =
    propertyLookup.isFetching
      ? "loading"
      : propertyLookup.isError
        ? "error"
        : propertyLookup.data
          ? "success"
          : "idle";
  const propertyLookupError =
    propertyLookup.error instanceof Error
      ? propertyLookup.error.message
      : undefined;
  const manualReviewServiceKeys = useMemo(
    () =>
      new Set(
        (experienceConfig?.services ?? [])
          .filter(s => s.manualReviewRequired)
          .map(s => s.serviceKey ?? s.name)
      ),
    [experienceConfig?.services]
  );
  const complexityThresholds = useMemo(
    () => ({
      maxSqft: Number(experienceConfig?.settings?.maxSqftAuto ?? 5000),
      maxLinearFt: Number(experienceConfig?.settings?.maxLinearFtAuto ?? 800),
      maxStories: Number(experienceConfig?.settings?.maxStoriesAuto ?? 3),
      maxWindows: Number(experienceConfig?.settings?.maxWindowsAuto ?? 120),
    }),
    [
      experienceConfig?.settings?.maxSqftAuto,
      experienceConfig?.settings?.maxLinearFtAuto,
      experienceConfig?.settings?.maxStoriesAuto,
      experienceConfig?.settings?.maxWindowsAuto,
    ]
  );

  const upsellCatalog = useMemo(() => {
    const configured = experienceConfig?.settings?.upsellCatalog;
    if (!Array.isArray(configured) || configured.length === 0) {
      return DEFAULT_UPSELL_CATALOG;
    }

    return configured.filter(upsell => upsell.active !== false);
  }, [experienceConfig?.settings?.upsellCatalog]);

  const globalConfig = useMemo<GlobalConfig>(() => {
    if (!pricingData?.global_settings)
      return {
        jobMinimum: 225,
        taxRate: 0,
        travelRadius: 40,
        baseAddress: BUSINESS.fullAddress,
        baseLat: BUSINESS.baseLat,
        baseLng: BUSINESS.baseLng,
        bundleDiscounts: { "2": 5, "3": 10, "4": 15, "5": 20 },
        travelFeePerMile: 3,
        freeRadius: 15,
      };
    return pricingData.global_settings as unknown as GlobalConfig;
  }, [pricingData]);

  const getServiceConfig = useCallback(
    (serviceType: string): ServiceConfig => {
      if (!pricingData?.[serviceType]) return {};
      return pricingData[serviceType] as unknown as ServiceConfig;
    },
    [pricingData]
  );

  // Calculate prices for all selected services
  const pricingResults = useMemo(() => {
    const results: PricingResult[] = [];
    selectedServices.forEach(svcId => {
      const input = serviceInputs[svcId] || { serviceType: svcId };
      const config = getServiceConfig(svcId);
      results.push(
        calculateServicePrice({ ...input, serviceType: svcId }, config)
      );
    });
    return results;
  }, [selectedServices, serviceInputs, getServiceConfig]);

  const complexityFlagged = useMemo(() => {
    const { maxSqft, maxLinearFt, maxStories, maxWindows } =
      complexityThresholds ?? {};
    return pricingResults.some(r => {
      const inputs = serviceInputs[r.serviceType] ?? {};
      const sqft = Number((inputs as any).sqft ?? 0);
      const linearFeet = Number((inputs as any).linearFeet ?? 0);
      const stories = Number((inputs as any).stories ?? 1);
      const windowCount = Number((inputs as any).windowCount ?? 0);
      return (
        (maxSqft && sqft > maxSqft) ||
        (maxLinearFt && linearFeet > maxLinearFt) ||
        (maxStories && stories >= maxStories) ||
        (maxWindows && windowCount > maxWindows)
      );
    });
  }, [complexityThresholds, pricingResults, serviceInputs]);

  const availabilityHorizonDays = Number(
    experienceConfig?.settings?.availabilityDaysAhead ?? 9
  );
  const availabilityStartHour = Number(
    experienceConfig?.settings?.availabilityStartHour ?? 9
  );
  const availabilityEndHour = Number(
    experienceConfig?.settings?.availabilityEndHour ?? 17
  );
  const availabilityPreferExternal = Boolean(
    experienceConfig?.settings?.availabilityPreferExternal ?? true
  );
  const slotPaddingMinutes = Number(
    experienceConfig?.settings?.slotPaddingMinutes ?? 0
  );

  const totalDurationMinutes = useMemo(() => {
    return pricingResults.reduce((sum, r) => {
      const cfg = pricingData?.[r.serviceType] as any;
      const minDur = Number(cfg?.minDuration ?? 60);
      return sum + minDur;
    }, 0);
  }, [pricingData, pricingResults]);

  const slotsQuery = trpc.publicSite.quote.getSlots.useQuery(
    {
      durationMinutes: totalDurationMinutes || 90,
      daysAhead: availabilityHorizonDays,
      startHour: availabilityStartHour,
      endHour: availabilityEndHour,
      preferExternal: availabilityPreferExternal,
      slotPaddingMinutes,
      address,
      city,
      state: stateVal,
      zip,
      lat: lat || undefined,
      lng: lng || undefined,
    },
    { enabled: step >= 5 && !pricingLoading }
  );

  const fallbackSlots: Slot[] = useMemo(() => {
    const now = new Date();
    const label = (offsetDays: number, window: string): Slot => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return {
        id: `${d.toISOString().split("T")[0]}_${window}`,
        date: d.toISOString().split("T")[0],
        window,
        display: `${d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} · ${window}`,
        source: "estimated",
      };
    };
    return [label(1, "Next available"), label(2, "Weekday AM"), label(3, "Weekday PM")];
  }, []);

  const slots: Slot[] = (slotsQuery.data ?? []).length > 0 ? slotsQuery.data! : fallbackSlots;

  const selectedSlotLabel = useMemo(() => {
    return slots.find(slot => slot.id === selectedSlotId)?.display;
  }, [selectedSlotId, slots]);

  const rawQuoteSummary = useMemo(() => {
    return calculateQuoteTotal(pricingResults, distanceMiles, globalConfig);
  }, [pricingResults, distanceMiles, globalConfig]);

  const quoteSummary = rawQuoteSummary;
  // Build real per-service prices from live pricing results.
  // Used by service_multiplier pricing mode to compute cross-sell prices dynamically.
  const servicePrices = useMemo(
    () => Object.fromEntries(pricingResults.map(r => [r.serviceType, r.finalPrice])),
    [pricingResults]
  );

  // Build service input quantities for per_unit pricing mode.
  const serviceInputQuantities = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(serviceInputs).map(([svcId, inputs]) => [
          svcId,
          {
            sqft: Number((inputs as any).sqft ?? 0),
            windowCount: Number((inputs as any).windowCount ?? 0),
            linearFeet: Number((inputs as any).linearFeet ?? 0),
          },
        ])
      ),
    [serviceInputs]
  );

  const { displayOffers: displayUpsells, addOn: _addOnOffer } = useMemo(() =>
    evaluateUpsells(upsellCatalog as UpsellItem[], {
      selectedServices,
      sqft: propertyIntel?.livingAreaSqft ?? undefined,
      stories: propertyIntel?.stories ?? undefined,
      subtotal: quoteSummary?.subtotal ?? 0,
      coveredFeatures: buildCoveredFeatures(selectedServices, serviceInputs),
      servicePrices,
      serviceInputQuantities,
    }),
    [upsellCatalog, selectedServices, serviceInputs, propertyIntel, quoteSummary?.subtotal, servicePrices, serviceInputQuantities]
  );

  // eligibleUpsells kept for any legacy checks (e.g. empty-state messaging)
  const eligibleUpsells = displayUpsells;

  const acceptedUpsellItems = useMemo(
    () => displayUpsells.filter(upsell => acceptedUpsells[upsell.id]),
    [displayUpsells, acceptedUpsells]
  );

  const upsellTotal = useMemo(
    () => acceptedUpsellItems.reduce((sum, upsell) => sum + upsell.price, 0),
    [acceptedUpsellItems]
  );

  const finalQuoteSummary = useMemo(
    () => ({
      ...quoteSummary,
      subtotal: quoteSummary.subtotal + upsellTotal,
      totalPrice: quoteSummary.totalPrice + upsellTotal,
    }),
    [quoteSummary, upsellTotal]
  );

  const previewInput = useMemo(
    () => ({
      companyId: experienceConfig?.settings?.companyId ?? DEFAULT_COMPANY_ID,
      distanceMiles,
      travelFee: quoteSummary.travelFee,
      items: pricingResults.map(item => ({
        serviceType: item.serviceType,
        basePrice: item.basePrice,
        finalPrice: item.finalPrice,
        packageTier: (serviceInputs[item.serviceType]?.packageTier ||
          "good") as "good" | "better" | "best",
      })),
      acceptedUpsells: acceptedUpsellItems.map(upsell => ({
        id: upsell.id,
        title: upsell.title,
        price: upsell.price,
      })),
    }),
    [
      acceptedUpsellItems,
      distanceMiles,
      experienceConfig?.settings?.companyId,
      pricingResults,
      quoteSummary.travelFee,
      serviceInputs,
    ]
  );

  const { data: previewData } = trpc.publicSite.quote.pricePreview.useQuery(
    previewInput,
    {
      enabled: previewInput.items.length > 0,
    }
  );

  const quotePreviewSummary = useMemo(() => {
    if (!previewData?.breakdown) return finalQuoteSummary;

    return {
      ...finalQuoteSummary,
      subtotal: Math.max(0, previewData.breakdown.servicesSubtotal),
      bundleDiscountPercent: previewData.breakdown.bundleDiscountPercent,
      bundleDiscount: previewData.breakdown.bundleDiscountAmount,
      travelFee: previewData.breakdown.travelFee,
      jobMinimumApplied: previewData.breakdown.jobMinimumApplied,
      // Server total already includes upsells — do NOT add upsellTotal again
      totalPrice: Math.max(0, previewData.breakdown.total),
    };
  }, [previewData?.breakdown, finalQuoteSummary]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      const removed = next.has(id);
      if (removed) {
        next.delete(id);
        autoPrefilledServicesRef.current.delete(id);
        setAcceptedUpsells(prev => {
          const nextAccepted = { ...prev };
          for (const upsell of upsellCatalog) {
            if (upsell.appliesTo.includes(id)) {
              const stillEligible = upsell.appliesTo.some(service =>
                next.has(service)
              );
              if (!stillEligible) delete nextAccepted[upsell.id];
            }
          }
          return nextAccepted;
        });
      } else {
        next.add(id);
        newlyAddedServicesRef.current.add(id);
        if (!serviceInputs[id]) {
          setServiceInputs(prev => ({ ...prev, [id]: getDefaultInputs(id) }));
        }
      }

      if (sessionToken) {
        trackEventMutation.mutate({
          sessionToken,
          eventName: removed ? "service_removed" : "service_added",
          payload: { serviceType: id, selectedCount: next.size },
        });
      }

      return next;
    });
  };

  const updateServiceInput = (svcId: string, key: string, value: unknown) => {
    autoPrefilledServicesRef.current.delete(svcId);
    setServiceInputs(prev => ({
      ...prev,
      [svcId]: { ...(prev[svcId] || { serviceType: svcId }), [key]: value },
    }));
  };

  const toggleUpsell = (upsellId: string) => {
    setAcceptedUpsells(prev => {
      const next = { ...prev, [upsellId]: !prev[upsellId] };
      const upsell = displayUpsells.find(item => item.id === upsellId);
      if (sessionToken && upsell) {
        trackEventMutation.mutate({
          sessionToken,
          eventName: next[upsellId] ? "upsell_accepted" : "upsell_removed",
          payload: {
            upsellId,
            title: upsell.title,
            price: upsell.price,
            category: upsell.category ?? "micro",
          },
        });
      }
      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const result = await uploadMutation.mutateAsync({
          fileBase64: base64,
          fileName: file.name,
          contentType: file.type,
        });
        setPhotos(prev => [...prev, result.url]);
      }
      toast.success("Photos uploaded!");
    } catch (err) {
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    try {
      trackEvent("quote_submit", {
        services: Array.from(selectedServices),
        city,
        zip,
        step: STEPS[step] ?? "submit",
      });
      const result = await submitMutation.mutateAsync({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: `${address}, ${city}, ${stateVal} ${zip}`,
        city,
        state: stateVal,
        zip,
        lat: lat || undefined,
        lng: lng || undefined,
        subtotal: quotePreviewSummary.subtotal,
        bundleDiscount: quotePreviewSummary.bundleDiscount,
        travelFee: quotePreviewSummary.travelFee,
        totalPrice: quotePreviewSummary.totalPrice,
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
        referralSource: referralSource || undefined,
        preferredSlot: selectedSlotId || undefined,
        preferredSlotLabel: selectedSlotLabel || undefined,
        customerPhotos: photos.length > 0 ? photos : undefined,
        propertyIntel: propertyIntel
          ? {
              ...propertyIntel,
              yearBuilt:
                propertyIntel.yearBuilt === null
                  ? undefined
                  : propertyIntel.yearBuilt,
            }
          : undefined,
        items: [
          ...pricingResults.map(r => ({
            serviceType: r.serviceType,
            packageTier: (serviceInputs[r.serviceType]?.packageTier ||
              "good") as "good" | "better" | "best",
            inputs:
              (serviceInputs[r.serviceType] as unknown as Record<
                string,
                unknown
              >) || {},
            basePrice: r.basePrice,
            finalPrice: r.finalPrice,
            description: r.breakdown.join("; "),
          })),
          ...acceptedUpsellItems.map(upsell => ({
            serviceType: `upsell_${upsell.id}`,
            packageTier: "good" as const,
            inputs: { upsell: true, upsellId: upsell.id },
            basePrice: upsell.price,
            finalPrice: upsell.price,
            description: upsell.title,
          })),
        ],
        acceptedUpsells: acceptedUpsellItems.map(upsell => ({
          id: upsell.id,
          title: upsell.title,
          price: upsell.price,
        })),
        confidenceMode: complexityFlagged
          ? "range"
          : quotePreviewSummary.jobMinimumApplied
            ? "manual_review"
            : "exact",
        schedulingEligible:
          !quotePreviewSummary.jobMinimumApplied && !complexityFlagged,
        sessionToken: sessionToken || undefined,
      });
      setQuoteResult(result);
      setScheduleHandoffStarted(false);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quote");
    }
  };

  useEffect(() => {
    if (sessionToken || startSessionMutation.isPending) return;

    startSessionMutation
      .mutateAsync({
        companyId: experienceConfig?.settings?.companyId ?? DEFAULT_COMPANY_ID,
        source: "public_quote_tool",
        referrer:
          typeof document !== "undefined"
            ? document.referrer || undefined
            : undefined,
      })
      .then(result => {
        setSessionToken(result.sessionToken);
        trackEventMutation.mutate({
          sessionToken: result.sessionToken,
          eventName: "quote_viewed",
          payload: { path: "/instant-quote" },
        });
      })
      .catch(() => {
        // Non-blocking analytics setup.
      });
  }, [
    experienceConfig?.settings?.companyId,
    sessionToken,
    startSessionMutation,
    trackEventMutation,
  ]);

  // Step view analytics
  // TODO: Add "step_view" to trackEvent enum when analytics schema is updated
  // useEffect(() => {
  //   if (!sessionToken) return;
  //   if (seenStepsRef.current.has(step)) return;
  //   seenStepsRef.current.add(step);
  //   trackEventMutation.mutate({
  //     sessionToken,
  //     eventName: "step_view" as any,
  //     payload: {
  //       step,
  //       label: STEPS[step],
  //       progress: Number(((step / (STEPS.length - 1)) * 100).toFixed(1)),
  //     },
  //   });
  // }, [sessionToken, step, trackEventMutation]);

  // Abandonment tracking (visibility)
  // TODO: Add "quote_abandoned" to trackEvent enum when analytics schema is updated
  // useEffect(() => {
  //   const handler = () => {
  //     if (abandonTrackedRef.current) return;
  //     if (submitted || !sessionToken) return;
  //     abandonTrackedRef.current = true;
  //     trackEventMutation.mutate({
  //       sessionToken,
  //       eventName: "quote_abandoned" as any,
  //       payload: {
  //         step,
  //         label: STEPS[step],
  //         reason: "visibility_hidden",
  //       },
  //     });
  //   };
  //   const onVisibilityChange = () => {
  //     if (document.visibilityState === "hidden") handler();
  //   };
  //   document.addEventListener("visibilitychange", onVisibilityChange);
  //   return () => {
  //     document.removeEventListener("visibilitychange", onVisibilityChange);
  //   };
  // }, [sessionToken, step, submitted, trackEventMutation]);

  // Address-first auto lookup (MapMeasure/Zillow-style)
  useEffect(() => {
    const key = `${address}|${city}|${stateVal}|${zip}`;
    if (!address || !city || !stateVal || !zip) return;

    if (propertyLookup.data && lastLookupKeyRef.current !== key) {
      const data = propertyLookup.data as any;
      setPropertyIntel({
        livingAreaSqft: data.livingAreaSqft ? Number(data.livingAreaSqft) : undefined,
        stories: data.stories ? Number(data.stories) : undefined,
        yearBuilt: data.yearBuilt !== undefined && data.yearBuilt !== null ? Number(data.yearBuilt) : null,
        roofAreaSqft: data.roofAreaSqft ? Number(data.roofAreaSqft) : undefined,
        drivewaySqft: data.drivewaySqft ? Number(data.drivewaySqft) : undefined,
        source: data.source,
        fetchedAt: data.fetchedAt,
      });
      lastLookupKeyRef.current = key;
    }

    if (propertyLookup.error) {
      setPropertyIntel(null);
    }
  }, [
    address,
    city,
    propertyLookup.data,
    propertyLookup.error,
    stateVal,
    zip,
  ]);

  useEffect(() => {
    if (address || city || zip) return;
    setPropertyIntel(null);
    lastLookupKeyRef.current = null;
  }, [address, city, zip]);

  // Push property intel into default service inputs when available
  useEffect(() => {
    if (!propertyIntel) return;
    setServiceInputs(prev => {
      const next = { ...prev };
      selectedServices.forEach(id => {
        const existing = next[id] ?? getDefaultInputs(id);
        const wasAuto =
          newlyAddedServicesRef.current.has(id) ||
          autoPrefilledServicesRef.current.has(id);
        newlyAddedServicesRef.current.delete(id);
        if (!wasAuto) return;

        const updates: Record<string, unknown> = {};
        switch (id) {
          case "house_washing":
            if (propertyIntel.livingAreaSqft)
              updates.sqft = propertyIntel.livingAreaSqft;
            if (propertyIntel.stories) updates.stories = propertyIntel.stories;
            break;
          case "roof_cleaning":
            if (propertyIntel.roofAreaSqft) {
              updates.sqft = propertyIntel.roofAreaSqft;
            } else if (propertyIntel.livingAreaSqft) {
              updates.sqft = Math.round(propertyIntel.livingAreaSqft * 1.2);
            }
            if (propertyIntel.stories) updates.stories = propertyIntel.stories;
            break;
          case "driveway_cleaning":
            if (propertyIntel.drivewaySqft) {
              updates.sqft = propertyIntel.drivewaySqft;
            }
            break;
          case "gutter_cleaning":
            if (propertyIntel.livingAreaSqft) {
              updates.linearFeet = Math.max(
                80,
                Math.round(propertyIntel.livingAreaSqft / 10)
              );
            }
            if (propertyIntel.stories) updates.stories = propertyIntel.stories;
            break;
          case "window_cleaning":
            if (propertyIntel.stories) updates.stories = propertyIntel.stories;
            break;
          default:
            break;
        }

        next[id] = { ...existing, ...updates, serviceType: id };
        autoPrefilledServicesRef.current.add(id);
      });
      return next;
    });
  }, [propertyIntel, selectedServices]);

  // Fire upsell_shown only when user actually reaches the Enhance step (step 4)
  // and only for the exact offers that are rendered — not all eligible items.
  useEffect(() => {
    if (step !== 4 || !sessionToken || displayUpsells.length === 0) return;

    displayUpsells.forEach((upsell, position) => {
      if (shownUpsellsRef.current.has(upsell.id)) return;
      shownUpsellsRef.current.add(upsell.id);
      trackEventMutation.mutate({
        sessionToken,
        eventName: "upsell_shown",
        payload: {
          upsellId: upsell.id,
          title: upsell.title,
          price: upsell.price,
          category: upsell.category ?? "micro",
          position,
          subtotalBeforeUpsell: quoteSummary?.subtotal ?? 0,
        },
      });
    });
  }, [step, sessionToken, displayUpsells, quoteSummary?.subtotal, trackEventMutation]);

  const handleScheduleHandoffStart = () => {
    if (!sessionToken || !quoteResult?.schedulingEligible) return;

    setScheduleHandoffStarted(true);
    trackEventMutation.mutate({
      sessionToken,
      eventName: "schedule_started",
      payload: {
        quoteId: quoteResult.quoteId,
        confidenceMode: quoteResult.confidenceMode,
      },
    });
  };

  const handleScheduleHandoffComplete = async () => {
    if (!sessionToken || !quoteResult?.schedulingEligible) return;

    if (selectedSlotId) {
      trackEventMutation.mutate({
        sessionToken,
        eventName: "schedule_slot_confirmed",
        payload: { slotId: selectedSlotId },
      });
    }

    trackEventMutation.mutate({
      sessionToken,
      eventName: "schedule_completed",
      payload: {
        quoteId: quoteResult.quoteId,
      },
    });
    toast.success("Great — we marked your scheduling handoff as completed.");

    // Submit the quote with the scheduled slot to trigger the workflow
    // This will auto-create the customer and draft quote
    await handleSubmit();
  };

  useEffect(() => {
    if (step !== 5 || slotsQuery.isFetching) return;
    if (!sessionToken || slots.length > 0) return;
    trackEventMutation.mutate({
      sessionToken,
      eventName: "schedule_blocked",
      payload: { reasons: ["no_slots_from_scheduler"] },
    });
  }, [sessionToken, slots.length, slotsQuery.isFetching, step, trackEventMutation]);

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  // On step 0 Next: if city/zip not yet filled (user typed but didn't pick autocomplete),
  // geocode the typed address to fill them before advancing.
  const handleNext = async () => {
    if (step === 0 && (!city.trim() || !zip.trim())) {
      if (!address.trim()) return;
      setGeocoding(true);
      setGeocodeError("");
      try {
        const parsed = await geocodeAddress(address);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setStateVal(parsed.state);
        if (parsed.zip) setZip(parsed.zip);
        if (parsed.lat) setLat(parsed.lat);
        if (parsed.lng) setLng(parsed.lng);
        if (parsed.street) setAddress(parsed.street);
        setStep(step + 1);
      } catch {
        setGeocodeError("Couldn't find that address. Please check it and try again.");
      } finally {
        setGeocoding(false);
      }
      return;
    }
    setStep(step + 1);
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        // City/zip not required here — handleNext geocodes them if missing
        return (
          address.trim().length > 0 &&
          name.trim().length > 0 &&
          email.trim().length > 0 &&
          phone.trim().length > 0 &&
          !outOfRange
        );
      case 1:
        return propertyLookupStatus !== "loading";
      case 2:
        return selectedServices.size > 0;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        // Review & Schedule: require contact info + at least one item, with address captured
        return (
          address.trim().length > 0 &&
          city.trim().length > 0 &&
          name.trim().length > 0 &&
          email.trim().length > 0 &&
          phone.trim().length > 0 &&
          (pricingResults.length > 0 || acceptedUpsellItems.length > 0)
        );
      default:
        return true;
    }
  };

  if (pricingLoading) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (submitted && quoteResult) {
    const readableSchedulingReasons: Record<string, string> = {
      too_many_services:
        "Instant booking is off for quotes with three or more services.",
      blocked_service_type:
        "One or more selected services always require manual scheduling.",
      client_marked_ineligible:
        "Customer marked scheduling as not eligible during submission.",
      size_or_complexity:
        "Size or complexity requires manual confirmation (oversize, steep roof, high stories, or large window count).",
      range_output:
        "Quote is provided as a range; a team member will confirm exact pricing.",
      service_requires_manual_review:
        "Selected service requires manual review before scheduling.",
    };

    return (
      <SiteLayout>
        <section className="py-16 md:py-24 bg-white">
          <div className="container max-w-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="font-heading font-bold text-3xl md:text-4xl mb-4">
              Quote Submitted!
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              Your estimated total:
            </p>
            <p className="font-heading font-black text-5xl text-primary mb-6">
              ${quoteResult.totalPrice.toFixed(2)}
            </p>
            <p className="text-muted-foreground mb-3">
              Quote #{quoteResult.quoteId} has been sent to {BUSINESS.owner}.
            </p>
            {quoteResult.confidenceMode === "manual_review" ? (
              <>
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm">
                  This quote is in <strong>manual review</strong> mode due to
                  job minimum or complexity. Our team will verify details and
                  confirm exact scheduling options within 24 hours.
                </p>
                {quoteResult.manualReviewLeadId ? (
                  <p className="text-xs text-amber-800 mt-2">
                    Internal follow-up lead created: #
                    {quoteResult.manualReviewLeadId}
                  </p>
                ) : null}
                {quoteResult.lowConfidenceReasons?.length ? (
                  <p className="text-xs text-amber-800 mt-1">
                    Reason codes: {quoteResult.lowConfidenceReasons.join(", ")}
                  </p>
                ) : null}
              </>
            ) : quoteResult.schedulingEligible ? (
              <div className="space-y-4 mb-8">
                <p className="text-muted-foreground">
                  {slots.length > 0 && slots[0]?.source === "estimated"
                    ? "Pick an estimated time window below. We'll confirm your exact appointment."
                    : "You're eligible for fast scheduling handoff right now. Pick a time window or tap call if you prefer."}
                </p>
                {slotsQuery.isFetching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Checking availability…
                  </div>
                )}
                {slotsQuery.isError && (
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    We couldn't load live slots. You can still call to schedule.
                  </div>
                )}
                {!slotsQuery.isFetching && slots.length === 0 ? (
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    No instant slots available right now. We'll call/text with the next openings.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {slots.length > 0 && slots[0]?.source === "estimated" && (
                      <p className="col-span-full text-xs text-muted-foreground">Estimated availability — subject to confirmation</p>
                    )}
                    {slots.map((slot: any) => (
                      <Button
                        key={slot.id}
                        variant={
                          selectedSlotId === slot.id ? "default" : "outline"
                        }
                        className={`justify-start ${
                          selectedSlotId === slot.id
                            ? "border-primary bg-primary text-white"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedSlotId(slot.id);
                          if (sessionToken) {
                            trackEventMutation.mutate({
                              sessionToken,
                              eventName: "schedule_slot_selected",
                              payload: {
                                slotId: slot.id,
                                date: slot.date,
                                window: slot.window,
                              },
                            });
                          }
                        }}
                      >
                        {slot.display}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm">
                Instant booking is disabled for this quote. We'll confirm the
                best time with you directly.
                {quoteResult.schedulingBlockedReasons?.length ? (
                  <ul className="text-xs mt-2 space-y-1 text-amber-800 text-left">
                    {quoteResult.schedulingBlockedReasons.map(reason => (
                      <li key={reason}>
                        • {readableSchedulingReasons[reason] ?? reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-navy-light text-white font-bold"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                <Phone className="w-4 h-4 mr-2" />
                Submit My Quote
              </Button>
              {quoteResult.schedulingEligible && !scheduleHandoffStarted && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleScheduleHandoffStart}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Service
                </Button>
              )}
              {quoteResult.schedulingEligible && scheduleHandoffStarted && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleScheduleHandoffComplete}
                  disabled={!selectedSlotId}
                >
                  I Picked a Time
                </Button>
              )}
              <a href="/">
                <Button size="lg" variant="outline">
                  Back to Home
                </Button>
              </a>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="bg-navy py-8 md:py-12 relative">
        <div className="container relative">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white mb-2">
            Get Your Instant Quote
          </h1>
          <p className="text-white/70 text-sm md:text-base">
            Accurate pricing in under 2 minutes. No obligation, no sales pitch.
          </p>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-secondary/30">
        <div className="container max-w-3xl">
          {/* Step indicators */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={i <= step ? "text-primary font-semibold" : ""}
                >
                  {s}
                </span>
              ))}
            </div>
            <Progress
              value={(step / (STEPS.length - 1)) * 100}
              className="h-2"
            />
          </div>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6 md:p-8">
              {step === 0 && (
              <StepAddress
                address={address}
                setAddress={setAddress}
                city={city}
                setCity={setCity}
                stateVal={stateVal}
                setStateVal={setStateVal}
                zip={zip}
                setZip={setZip}
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                lat={lat}
                setLat={setLat}
                lng={lng}
                setLng={setLng}
                distanceMiles={distanceMiles}
                setDistanceMiles={setDistanceMiles}
                outOfRange={outOfRange}
                setOutOfRange={setOutOfRange}
                globalConfig={globalConfig}
                geocodeError={geocodeError}
              />
            )}
            {step === 1 && (
              <StepPropertyIntel
                address={`${address}, ${city}, ${stateVal} ${zip}`}
                  propertyIntel={propertyIntel}
                  setPropertyIntel={setPropertyIntel}
                  lookupStatus={propertyLookupStatus}
                  lookupError={propertyLookupError}
                  onRetry={() => {
                    lastLookupKeyRef.current = null;
                    propertyLookup.refetch();
                  }}
                />
              )}
              {step === 2 && (
                <StepServices
                  selectedServices={selectedServices}
                  toggleService={toggleService}
                />
              )}
              {step === 3 && (
                <StepDetails
                  selectedServices={selectedServices}
                  serviceInputs={serviceInputs}
                  updateServiceInput={updateServiceInput}
                  pricingResults={pricingResults}
                  getServiceConfig={getServiceConfig}
                  tierLabels={tierLabels}
                />
              )}
              {step === 4 && (
                <StepUpsells
                  displayUpsells={displayUpsells}
                  acceptedUpsells={acceptedUpsells}
                  toggleUpsell={toggleUpsell}
                  upsellTotal={upsellTotal}
                  selectedServices={selectedServices}
                />
              )}
              {step === 5 && (
                <div className="space-y-8">
                  <StepReview
                    pricingResults={pricingResults}
                    quoteSummary={quotePreviewSummary}
                    finalQuoteSummary={quotePreviewSummary}
                    serviceInputs={serviceInputs}
                    address={`${address}, ${city}, ${stateVal} ${zip}`}
                    name={name}
                    tierLabels={tierLabels}
                    acceptedUpsellItems={acceptedUpsellItems}
                    upsellTotal={upsellTotal}
                    manualReviewServiceKeys={manualReviewServiceKeys}
                    complexityFlagged={complexityFlagged}
                  />
                  <StepSchedule
                    preferredDate={preferredDate}
                    setPreferredDate={setPreferredDate}
                    preferredTime={preferredTime}
                    setPreferredTime={setPreferredTime}
                    referralSource={referralSource}
                    setReferralSource={setReferralSource}
                    photos={photos}
                    setPhotos={setPhotos}
                    uploading={uploading}
                    handlePhotoUpload={handlePhotoUpload}
                    fileInputRef={fileInputRef}
                    slots={slots}
                    slotsLoading={slotsQuery.isFetching}
                    slotsError={slotsQuery.isError}
                  />
                </div>
              )}
              {step === 6 && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-heading font-bold text-2xl mb-2">
                    Ready to Submit?
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Your estimated total is{" "}
                    <span className="font-bold text-foreground text-lg">
                      ${quotePreviewSummary.totalPrice.toFixed(2)}
                    </span>
                  </p>
                  {complexityFlagged && (
                    <p className="text-sm text-amber-800 mb-3">
                      Size/complexity triggered a range. We'll confirm exact pricing before
                      scheduling and honor the range shown here.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Book your spot or text yourself this quote. We'll confirm details in minutes.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-navy-light text-white font-semibold"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      Book My Spot
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        handleSubmit();
                        // TODO: Add "quote_text_me" to trackEvent enum when analytics schema is updated
                        // if (sessionToken) {
                        //   trackEventMutation.mutate({
                        //     sessionToken,
                        //     eventName: "quote_text_me" as any,
                        //     payload: { channel: "sms" },
                        //   });
                        // }
                      }}
                      disabled={submitMutation.isPending}
                    >
                      <Phone className="w-4 h-4 mr-2" /> Text Me This Quote
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div
                className={`flex justify-between mt-8 ${step < 7 ? "pt-4 border-t" : ""}`}
              >
                {step > 0 ? (
                  <Button variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                ) : (
                  <div />
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || geocoding}
                    className="bg-primary hover:bg-navy-light text-white font-semibold"
                  >
                    {geocoding ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Checking…</>
                    ) : (
                      <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Trust badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" /> 4.9★ rated (local)
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> Licensed & Insured
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Cookeville-owned
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-4 h-4" /> Recent jobs near you
            </span>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

// ─── Step Components ──────────────────────────────────────────────────

function StepAddress({
  address,
  setAddress,
  city,
  setCity,
  stateVal,
  setStateVal,
  zip,
  setZip,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  lat,
  setLat,
  lng,
  setLng,
  distanceMiles,
  setDistanceMiles,
  outOfRange,
  setOutOfRange,
  globalConfig,
  geocodeError,
}: any) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">
        Where's your property? Who do we contact?
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        We need your address to calculate travel and your contact info to send the quote.
      </p>
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="John Smith"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              placeholder="john@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
              placeholder="(931) 555-0123"
            />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="address">
            <MapPin className="w-4 h-4 inline mr-1" />
            Street Address
          </Label>
          <AddressAutocompleteInput
            id="address"
            value={address}
            onChange={setAddress}
            onSelect={(parsed) => {
              if (parsed.street) setAddress(parsed.street);
              if (parsed.city) setCity(parsed.city);
              if (parsed.state) setStateVal(parsed.state);
              if (parsed.zip) setZip(parsed.zip);
              if (parsed.lat) setLat(parsed.lat);
              if (parsed.lng) setLng(parsed.lng);
            }}
            placeholder="123 Main Street"
          />
          {geocodeError && (
            <p className="text-red-500 text-sm mt-1">{geocodeError}</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCity(e.target.value)
              }
              placeholder="Cookeville"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={stateVal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStateVal(e.target.value)
              }
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP</Label>
            <Input
              id="zip"
              value={zip}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setZip(e.target.value)
              }
              placeholder="38501"
            />
          </div>
        </div>
        {outOfRange && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            This address appears to be outside our service area (
            {globalConfig.travelRadius} mile radius). Please call us at{" "}
            {BUSINESS.phone} for availability.
          </div>
        )}
      </div>
    </div>
  );
}

function StepPropertyIntel({
  address,
  propertyIntel,
  setPropertyIntel,
  lookupStatus,
  lookupError,
  onRetry,
}: {
  address: string;
  propertyIntel: PropertyIntel | null;
  setPropertyIntel: (intel: PropertyIntel | null) => void;
  lookupStatus: "idle" | "loading" | "success" | "error";
  lookupError?: string | null;
  onRetry: () => void;
}) {
  const editableIntel: PropertyIntel = propertyIntel ?? {
    livingAreaSqft: undefined,
    stories: 1,
    yearBuilt: undefined,
    roofAreaSqft: undefined,
    drivewaySqft: undefined,
  };

  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">
        HomeScan found these details
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {propertyIntel?.source === "mock"
          ? "These are estimates based on typical homes in this area. Adjust anything that looks off."
          : "HomeScan pulled these from public property records. Adjust anything that looks off."}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Badge variant="outline" className="text-xs">
          {propertyIntel?.source === "mock" ? "Estimated" : "HomeScan"}
        </Badge>
        {propertyIntel?.fetchedAt ? (
          <span>
            Updated {new Date(propertyIntel.fetchedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {lookupStatus === "loading" && (
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>HomeScan is scanning {address}…</span>
        </div>
      )}

      {lookupStatus === "error" && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>{lookupError || "We couldn't auto-pull this address."}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry lookup
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Living area (sq ft)</Label>
          <Input
            type="number"
            value={editableIntel.livingAreaSqft}
            onChange={e =>
              setPropertyIntel({
                ...editableIntel,
                livingAreaSqft: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <Label>Stories</Label>
          <Input
            type="number"
            value={editableIntel.stories ?? 1}
            onChange={e =>
              setPropertyIntel({
                ...editableIntel,
                stories: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>
        <div>
          <Label>Year built</Label>
          <Input
            type="number"
            value={editableIntel.yearBuilt ?? ""}
            onChange={e =>
              setPropertyIntel({
                ...editableIntel,
                yearBuilt: Number(e.target.value) || null,
              })
            }
          />
        </div>
        <div>
          <Label>Roof area (sq ft)</Label>
          <Input
            type="number"
            value={editableIntel.roofAreaSqft ?? ""}
            onChange={e =>
              setPropertyIntel({
                ...editableIntel,
                roofAreaSqft: Number(e.target.value) || 0,
              })
            }
            placeholder="Auto from aerial"
          />
        </div>
        <div>
          <Label>Driveway area (sq ft)</Label>
          <Input
            type="number"
            value={editableIntel.drivewaySqft ?? ""}
            onChange={e =>
              setPropertyIntel({
                ...editableIntel,
                drivewaySqft: Number(e.target.value) || 0,
              })
            }
            placeholder="Auto from aerial"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        These values will pre-fill your service questions so you get an instant,
        MapMeasure-style quote without extra typing.
      </p>
    </div>
  );
}

function StepContact({ name, setName, email, setEmail, phone, setPhone }: any) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">Your contact info</h2>
      <p className="text-sm text-muted-foreground mb-6">
        So we can send your quote and reach out to schedule.
      </p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            placeholder="John Smith"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            placeholder="john@example.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPhone(e.target.value)
            }
            placeholder="(931) 555-0123"
          />
        </div>
      </div>
    </div>
  );
}

function StepServices({ selectedServices, toggleService }: any) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">What do you need?</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select all services you're interested in. Bundle for savings!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUOTABLE_SERVICES.map(svc => {
          const Icon = ICON_MAP[svc.icon] || LayoutGrid;
          const selected = selectedServices.has(svc.id);
          return (
            <button
              key={svc.id}
              onClick={() => toggleService(svc.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.desc}</p>
              </div>
              {selected && (
                <CheckCircle className="w-5 h-5 text-primary shrink-0 ml-auto" />
              )}
            </button>
          );
        })}
      </div>
      {selectedServices.size >= 2 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Bundle discount applied! {selectedServices.size} services selected.
        </div>
      )}
    </div>
  );
}

function StepDetails({
  selectedServices,
  serviceInputs,
  updateServiceInput,
  pricingResults,
  getServiceConfig,
  tierLabels,
}: any) {
  const services = Array.from(selectedServices as Set<string>);
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">
        Tell us about your property
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Configure each service for accurate pricing.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Don't worry about being exact — a rough estimate is perfectly fine.
          We'll take final measurements on-site before any work begins, and your
          price will be adjusted if needed.
        </p>
      </div>
      <div className="space-y-6">
        {services.map((svcId: string) => (
          <ServiceDetailForm
            key={svcId}
            serviceId={svcId}
            inputs={serviceInputs[svcId] || { serviceType: svcId }}
            updateInput={(key: string, val: unknown) =>
              updateServiceInput(svcId, key, val)
            }
            config={getServiceConfig(svcId)}
            tierLabels={tierLabels}
            price={pricingResults.find(
              (r: PricingResult) => r.serviceType === svcId
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Premium Slider Input ─────────────────────────────────────────────

function PremiumSlider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  icon,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          {icon}
          {label}
        </Label>
        <div className="bg-primary/10 rounded-lg px-3 py-1.5 flex items-center gap-1">
          <span className="font-heading font-bold text-primary text-lg">
            {value}
          </span>
          <span className="text-xs text-primary/70 font-medium">{unit}</span>
        </div>
      </div>
      <div className="px-1">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
          className="[&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-track]]:h-2"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

// ─── Fence Side Toggle ────────────────────────────────────────────────

function FenceSideToggle({
  value,
  onChange,
}: {
  value: 1 | 2;
  onChange: (v: 1 | 2) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <FlipHorizontal className="w-4 h-4" />
        Sides to Clean
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange(1)}
          className={`p-3 rounded-xl border-2 text-center transition-all ${
            value === 1
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          }`}
        >
          <p className="font-semibold text-sm">One Side</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Front or back only
          </p>
        </button>
        <button
          onClick={() => onChange(2)}
          className={`p-3 rounded-xl border-2 text-center transition-all ${
            value === 2
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          }`}
        >
          <p className="font-semibold text-sm">Both Sides</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Front & back
          </p>
        </button>
      </div>
    </div>
  );
}

// ─── Service Detail Form ──────────────────────────────────────────────

function ServiceDetailForm({
  serviceId,
  inputs,
  updateInput,
  config,
  tierLabels,
  price,
}: {
  serviceId: string;
  inputs: PricingInput;
  updateInput: (key: string, val: unknown) => void;
  config: ServiceConfig;
  tierLabels: { good: string; better: string; best: string };
  price?: PricingResult;
}) {
  const svc = QUOTABLE_SERVICES.find(s => s.id === serviceId);
  if (!svc) return null;

  const sliderDef = SLIDER_DEFAULTS[serviceId];

  return (
    <Card className="border-2 overflow-hidden">
      <CardContent className="p-0">
        {/* Service header bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-secondary/50 border-b">
          <h3 className="font-heading font-bold text-lg">{svc.name}</h3>
          {price && (
            <div className="text-right">
              <span className="font-heading font-bold text-xl text-primary">
                ${price.finalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* House Washing */}
          {serviceId === "house_washing" && (
            <>
              <PremiumSlider
                label="Home Square Footage"
                unit="sq ft"
                value={inputs.sqft || 1800}
                min={500}
                max={6000}
                step={100}
                onChange={v => updateInput("sqft", v)}
                icon={<HomeIcon className="w-4 h-4" />}
              />
              <div>
                <Label>Number of Stories</Label>
                <RadioGroup
                  value={String(inputs.stories || 1)}
                  onValueChange={v => updateInput("stories", Number(v))}
                >
                  <div className="flex gap-3 mt-2">
                    {[1, 2, 3].map(n => (
                      <label
                        key={n}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          String(inputs.stories || 1) === String(n)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <RadioGroupItem value={String(n)} id={`stories-${n}`} />
                        <span className="text-sm font-medium">{n}-Story</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Window Cleaning */}
          {serviceId === "window_cleaning" && (
            <>
              <PremiumSlider
                label="Number of Windows"
                unit="windows"
                value={inputs.windowCount || 15}
                min={1}
                max={80}
                step={1}
                onChange={v => updateInput("windowCount", v)}
                icon={<SquareStack className="w-4 h-4" />}
              />
              <WindowPackageSelector
                value={inputs.packageTier}
                onChange={v => updateInput("packageTier", v)}
                windowCount={inputs.windowCount || 15}
                config={config}
                tierLabels={tierLabels}
              />
            </>
          )}

          {/* Roof Cleaning */}
          {serviceId === "roof_cleaning" && (
            <>
              <PremiumSlider
                label="Roof Square Footage"
                unit="sq ft"
                value={inputs.sqft || 2000}
                min={500}
                max={6000}
                step={100}
                onChange={v => updateInput("sqft", v)}
                icon={<Triangle className="w-4 h-4" />}
              />
              <div>
                <Label>Roof Pitch</Label>
                <RadioGroup
                  value={inputs.roofPitch || "low"}
                  onValueChange={v => updateInput("roofPitch", v)}
                >
                  <div className="flex gap-3 mt-2">
                    {[
                      { v: "low", l: "Low" },
                      { v: "medium", l: "Medium" },
                      { v: "steep", l: "Steep" },
                    ].map(p => (
                      <label
                        key={p.v}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          (inputs.roofPitch || "low") === p.v
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <RadioGroupItem value={p.v} id={`pitch-${p.v}`} />
                        <span className="text-sm font-medium">{p.l}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Gutter Cleaning */}
          {serviceId === "gutter_cleaning" && (
            <>
              <PremiumSlider
                label="Gutter Length"
                unit="linear ft"
                value={inputs.linearFeet || sliderDef?.default || 150}
                min={sliderDef?.min || 50}
                max={sliderDef?.max || 400}
                step={sliderDef?.step || 10}
                onChange={v => updateInput("linearFeet", v)}
                icon={<Ruler className="w-4 h-4" />}
              />
              <div>
                <Label>Number of Stories</Label>
                <RadioGroup
                  value={String(inputs.stories || 1)}
                  onValueChange={v => updateInput("stories", Number(v))}
                >
                  <div className="flex gap-3 mt-2">
                    {[1, 2, 3].map(n => (
                      <label
                        key={n}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          String(inputs.stories || 1) === String(n)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <RadioGroupItem
                          value={String(n)}
                          id={`gstories-${n}`}
                        />
                        <span className="text-sm font-medium">{n}-Story</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Fence Cleaning */}
          {serviceId === "fence_cleaning" && (
            <>
              <PremiumSlider
                label="Fence Length"
                unit="linear ft"
                value={inputs.linearFeet || sliderDef?.default || 100}
                min={sliderDef?.min || 20}
                max={sliderDef?.max || 500}
                step={sliderDef?.step || 10}
                onChange={v => updateInput("linearFeet", v)}
                icon={<Ruler className="w-4 h-4" />}
              />
              <FenceSideToggle
                value={(inputs.fenceSides as 1 | 2) || 1}
                onChange={v => updateInput("fenceSides", v)}
              />
            </>
          )}

          {/* Deck Cleaning */}
          {serviceId === "deck_cleaning" && (
            <PremiumSlider
              label="Deck Size"
              unit="sq ft"
              value={inputs.sqft || sliderDef?.default || 300}
              min={sliderDef?.min || 50}
              max={sliderDef?.max || 1200}
              step={sliderDef?.step || 25}
              onChange={v => updateInput("sqft", v)}
              icon={<Ruler className="w-4 h-4" />}
            />
          )}

          {/* Driveway / Concrete */}
          {serviceId === "driveway_cleaning" && (
            <PremiumSlider
              label="Surface Area"
              unit="sq ft"
              value={inputs.sqft || SLIDER_DEFAULTS.driveway_cleaning.default}
              min={SLIDER_DEFAULTS.driveway_cleaning.min}
              max={SLIDER_DEFAULTS.driveway_cleaning.max}
              step={SLIDER_DEFAULTS.driveway_cleaning.step}
              onChange={v => updateInput("sqft", v)}
              icon={<Ruler className="w-4 h-4" />}
            />
          )}

          {/* Patio Cleaning */}
          {serviceId === "patio_cleaning" && (
            <PremiumSlider
              label="Patio Area"
              unit="sq ft"
              value={inputs.sqft || SLIDER_DEFAULTS.patio_cleaning.default}
              min={SLIDER_DEFAULTS.patio_cleaning.min}
              max={SLIDER_DEFAULTS.patio_cleaning.max}
              step={SLIDER_DEFAULTS.patio_cleaning.step}
              onChange={v => updateInput("sqft", v)}
              icon={<Ruler className="w-4 h-4" />}
            />
          )}

          {/* Walkway Cleaning */}
          {serviceId === "walkway_cleaning" && (
            <PremiumSlider
              label="Walkway Area"
              unit="sq ft"
              value={inputs.sqft || SLIDER_DEFAULTS.walkway_cleaning.default}
              min={SLIDER_DEFAULTS.walkway_cleaning.min}
              max={SLIDER_DEFAULTS.walkway_cleaning.max}
              step={SLIDER_DEFAULTS.walkway_cleaning.step}
              onChange={v => updateInput("sqft", v)}
              icon={<Ruler className="w-4 h-4" />}
            />
          )}

        </div>
      </CardContent>
    </Card>
  );
}

// ─── Window Package Selector with Per-Tier Pricing ────────────────────

function WindowPackageSelector({
  value,
  onChange,
  windowCount,
  config,
  tierLabels,
}: {
  value?: string;
  onChange: (v: string) => void;
  windowCount: number;
  config: ServiceConfig;
  tierLabels: { good: string; better: string; best: string };
}) {
  const extRate = config.exteriorPerWindow || 11;
  const packageMults = config.windowPackageMultipliers || {
    good: 1.0,
    better: 1.35,
    best: 1.75,
  };

  const tiers = [
    {
      id: "good",
      name: tierLabels.good,
      included: ["Exterior Glass Cleaning", "Screen Removal & Replacement"],
      notIncluded: [
        "Interior Glass",
        "Frames & Sills",
        "Deep Track & Screen Scrub",
      ],
      price:
        Math.round(windowCount * extRate * (packageMults.good || 1.0) * 100) /
        100,
    },
    {
      id: "better",
      name: tierLabels.better,
      badge: "Most Popular",
      included: [
        "Exterior Glass Cleaning",
        "Interior Glass Cleaning",
        "Frames Wiped Down",
        "Interior Ledges Wiped",
      ],
      notIncluded: ["Sills", "Deep Track Cleaning or Screen Scrub"],
      price:
        Math.round(
          windowCount * extRate * (packageMults.better || 1.35) * 100
        ) / 100,
    },
    {
      id: "best",
      name: tierLabels.best,
      included: [
        "Exterior & Interior Glass",
        "Frames, Sills & Ledges",
        "Deep Screen Washing (Soap & Scrub)",
        "Deep Track Detailing (Clean & Rinse)",
      ],
      notIncluded: [],
      price:
        Math.round(windowCount * extRate * (packageMults.best || 1.75) * 100) /
        100,
    },
  ];

  return (
    <div>
      <Label className="mb-3 block">Choose Your Package</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all relative ${
              (value || "good") === t.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/30"
            }`}
          >
            {t.badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-sky text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {t.badge}
              </span>
            )}
            <p className="font-bold text-sm mb-1">{t.name}</p>
            <p className="font-heading font-bold text-primary text-lg mb-2">
              ${t.price.toFixed(2)}
            </p>
            <div className="space-y-1">
              {t.included.map(item => (
                <p key={item} className="text-xs flex items-start gap-1.5">
                  <span className="text-green-600 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </p>
              ))}
              {t.notIncluded.map(item => (
                <p
                  key={item}
                  className="text-xs flex items-start gap-1.5 text-muted-foreground"
                >
                  <span className="text-red-400 font-bold shrink-0">✗</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Human-readable labels for each service key used in the upsell context subtitle
const SERVICE_LABELS: Record<string, string> = {
  house_washing: "house washing",
  window_cleaning: "window cleaning",
  driveway_cleaning: "driveway cleaning",
  roof_cleaning: "roof cleaning",
  gutter_cleaning: "gutter cleaning",
  patio_cleaning: "patio cleaning",
  walkway_cleaning: "walkway cleaning",
  deck_cleaning: "deck cleaning",
  fence_cleaning: "fence cleaning",
  detached_structure: "detached structure",
};

const CATEGORY_LABEL: Record<string, string> = {
  "add_on": "Add-on",
  "cross_sell": "Recommended Extra",
  "bundle": "Package",
  // legacy aliases kept for any admin-sourced catalog rows
  "micro": "Add-on",
  "cross-sell": "Recommended Extra",
};

function StepUpsells({
  displayUpsells,
  acceptedUpsells,
  toggleUpsell,
  upsellTotal,
  selectedServices,
}: any) {
  // Support legacy prop name
  const eligibleUpsells = displayUpsells;
  const acceptedCount = Object.values(acceptedUpsells).filter(Boolean).length;

  // Build a readable list of selected service names for the subtitle
  const serviceNames = useMemo(() => {
    const names = Array.from(selectedServices as Set<string>)
      .map((key: string) => SERVICE_LABELS[key] ?? key)
      .slice(0, 3);
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
  }, [selectedServices]);

  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">
        Commonly paired with your services
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Customers who book{serviceNames ? ` ${serviceNames}` : " these services"} frequently add one or more of these. One tap to include — skip anything that doesn't apply.
      </p>

      {eligibleUpsells.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select at least one service to see personalized add-on pairings.
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {eligibleUpsells.map((upsell: any) => {
            const active = !!acceptedUpsells[upsell.id];
            const isFree = upsell.price === 0;
            return (
              <button
                key={upsell.id}
                type="button"
                onClick={() => toggleUpsell(upsell.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Checkmark indicator */}
                  <div
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      active
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {active && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm flex flex-wrap items-center gap-1.5">
                      {upsell.title}
                      {upsell.badge && (
                        <Badge
                          variant={active ? "default" : "secondary"}
                          className="text-[10px] px-1.5"
                        >
                          {upsell.badge}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {upsell.description}
                    </p>
                    {upsell.displaySavingsText && (
                      <p className="text-[11px] text-green-600 font-medium mt-1">
                        {upsell.displaySavingsText}
                      </p>
                    )}
                    {upsell.category && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wide">
                        {CATEGORY_LABEL[upsell.category] ?? upsell.category}
                      </p>
                    )}
                  </div>

                  <p
                    className={`font-semibold text-sm flex-shrink-0 ${
                      isFree ? "text-green-600" : ""
                    }`}
                  >
                    {isFree ? "Free" : `+$${upsell.price.toFixed(2)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary bar */}
      <div className="rounded-lg bg-secondary p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {acceptedCount === 0
              ? "No extras added — that's fine"
              : `${acceptedCount} extra${acceptedCount > 1 ? "s" : ""} added`}
          </p>
          {acceptedCount === 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap any item above to include it
            </p>
          )}
        </div>
        <p className="font-heading font-bold text-lg text-primary">
          {upsellTotal > 0 ? `+$${upsellTotal.toFixed(2)}` : "$0"}
        </p>
      </div>
    </div>
  );
}

function StepReview({
  pricingResults,
  quoteSummary,
  finalQuoteSummary,
  serviceInputs,
  address,
  name,
  tierLabels,
  acceptedUpsellItems,
  upsellTotal,
  manualReviewServiceKeys,
  complexityFlagged,
}: any) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">Review Your Quote</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Here's your detailed price breakdown.
      </p>
      {complexityFlagged && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This quote includes higher-complexity inputs (size/stories/windows).
          We may provide a range and confirm exact pricing before scheduling.
        </div>
      )}

      <div className="space-y-3 mb-6">
        {pricingResults.map((r: PricingResult) => {
          const svc = QUOTABLE_SERVICES.find(s => s.id === r.serviceType);
      return (
        <div
          key={r.serviceType}
          className="flex justify-between items-center py-3 border-b"
        >
              <div>
                <p className="font-semibold">{svc?.name || r.serviceType}</p>
                {r.serviceType === "window_cleaning" &&
                  serviceInputs[r.serviceType]?.packageTier && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {serviceInputs[r.serviceType].packageTier === "best"
                        ? tierLabels.best
                        : serviceInputs[r.serviceType].packageTier === "better"
                          ? tierLabels.better
                          : tierLabels.good}
                    </Badge>
                  )}
                {r.serviceType === "fence_cleaning" &&
                  serviceInputs[r.serviceType]?.fenceSides === 2 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Both Sides
                    </Badge>
                  )}
                {manualReviewServiceKeys?.has(r.serviceType) && (
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] mt-1">
                    Requires manual review
                  </Badge>
                )}
              </div>
              <span className="font-heading font-bold">
                ${r.finalPrice.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {acceptedUpsellItems.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="font-semibold text-sm">Selected Add-ons</p>
          {acceptedUpsellItems.map((upsell: any) => (
            <div
              key={upsell.id}
              className="flex justify-between items-center py-2 border-b"
            >
              <span className="text-sm">{upsell.title}</span>
              <span className="font-heading font-semibold">
                +${upsell.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-secondary rounded-xl p-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>${quoteSummary.subtotal.toFixed(2)}</span>
        </div>
        {upsellTotal > 0 && (
          <div className="flex justify-between text-sm text-primary">
            <span>Upsells</span>
            <span>+${upsellTotal.toFixed(2)}</span>
          </div>
        )}
        {quoteSummary.bundleDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Bundle Discount ({quoteSummary.bundleDiscountPercent}%)</span>
            <span>-${quoteSummary.bundleDiscount.toFixed(2)}</span>
          </div>
        )}
        {quoteSummary.jobMinimumApplied && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Job Minimum Applied</span>
            <span>$225.00</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-heading font-bold text-xl">
          <span>Total</span>
          <span className="text-primary">
            ${quoteSummary.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
        <p>
          <strong>Property:</strong> {address}
        </p>
        <p>
          <strong>Customer:</strong> {name}
        </p>
        {complexityFlagged && (
          <p className="mt-2 text-amber-800">
            Estimate shown as a range due to size/complexity. We’ll confirm exact pricing
            before scheduling.
          </p>
        )}
        <p className="mt-2">
          This is an estimate based on the measurements you provided. We'll
          verify all measurements on-site before starting any work, and your
          final price may be adjusted if there's a significant difference.
        </p>
      </div>
    </div>
  );
}

function StepSchedule({
  preferredDate,
  setPreferredDate,
  preferredTime,
  setPreferredTime,
  referralSource,
  setReferralSource,
  photos,
  setPhotos,
  uploading,
  handlePhotoUpload,
  fileInputRef,
  slots,
  slotsLoading,
  slotsError,
}: any) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-1">Schedule & Extras</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Optional: pick a preferred date and upload photos.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">
              <Calendar className="w-4 h-4 inline mr-1" />
              Preferred Date
            </Label>
            <Input
              id="date"
              type="date"
              value={preferredDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPreferredDate(e.target.value)
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <Label htmlFor="time">
              <Clock className="w-4 h-4 inline mr-1" />
              Preferred Time
            </Label>
            <Select value={preferredTime} onValueChange={setPreferredTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (7AM - 12PM)</SelectItem>
                <SelectItem value="afternoon">
                  Afternoon (12PM - 5PM)
                </SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Upload Property Photos (Optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Help us give a more accurate quote by sharing photos of your
            property.
          </p>
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload photos (max 10MB each)
                </p>
              </>
            )}
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((url: string, i: number) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setPhotos((prev: string[]) =>
                        prev.filter((_: string, j: number) => j !== i)
                      )
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="referral">How did you hear about us?</Label>
          <Select value={referralSource} onValueChange={setReferralSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select one (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google Search</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="nextdoor">Nextdoor</SelectItem>
              <SelectItem value="referral">
                Friend / Neighbor Referral
              </SelectItem>
              <SelectItem value="repeat">Repeat Customer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

type PropertyIntel = {
  livingAreaSqft?: number;
  stories?: number;
  yearBuilt?: number | null;
  roofAreaSqft?: number;
  drivewaySqft?: number;
  source?: string;
  fetchedAt?: string;
};

function getDefaultInputs(serviceId: string): PricingInput {
  switch (serviceId) {
    case "house_washing":
      return {
        serviceType: serviceId,
        sqft: 1800,
        stories: 1,
        packageTier: "good",
      };
    case "window_cleaning":
      return {
        serviceType: serviceId,
        windowCount: 15,
        includeExterior: true,
        includeInterior: false,
        includeScreens: false,
        packageTier: "good",
      };
    case "roof_cleaning":
      return { serviceType: serviceId, sqft: 2000, roofPitch: "low" };
    case "gutter_cleaning":
      return { serviceType: serviceId, linearFeet: 150, stories: 1 };
    case "fence_cleaning":
      return { serviceType: serviceId, linearFeet: 100, fenceSides: 1 };
    case "deck_cleaning":
      return { serviceType: serviceId, sqft: 300 };
    case "driveway_cleaning":
      return { serviceType: serviceId, sqft: 500 };
    case "patio_cleaning":
      return { serviceType: serviceId, sqft: 250 };
    case "walkway_cleaning":
      return { serviceType: serviceId, sqft: 100 };
    default:
      return { serviceType: serviceId, sqft: 300 };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
