import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Home,
  Car,
  Triangle,
  Building2,
  LayoutGrid,
  Layers,
  Square,
  Droplets,
  Copy,
  ExternalLink,
  GripVertical,
  ChevronLeft,
  Plus,
  Share2,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WINDOW_FEATURE_LIST } from "@shared/windowFeatures";

// ── Upsell editor helpers ──────────────────────────────────────────────────

function ServiceChips({
  value,
  onChange,
  services,
  single = false,
  placeholder = "Add service…",
}: {
  value: string;
  onChange: (v: string) => void;
  services: Array<{ serviceKey: string | null; name: string }>;
  single?: boolean;
  placeholder?: string;
}) {
  const selected = strToArr(value);
  const available = services.filter(s => s.serviceKey && !selected.includes(s.serviceKey));
  const remove = (key: string) => onChange(selected.filter(k => k !== key).join(", "));
  const add = (key: string) => {
    if (!key) return;
    if (single) { onChange(key); return; }
    if (!selected.includes(key)) onChange([...selected, key].join(", "));
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[26px]">
        {selected.map(key => {
          const svc = services.find(s => s.serviceKey === key);
          return (
            <span key={key} className="inline-flex items-center gap-1 rounded-full bg-slate-100 border px-2 py-0.5 text-xs font-medium text-slate-700">
              {svc?.name ?? key}
              <button type="button" onClick={() => remove(key)} className="hover:text-red-500 leading-none ml-0.5">×</button>
            </span>
          );
        })}
      </div>
      {(!single || selected.length === 0) && (
        <select
          className="border rounded-md px-2 py-1.5 text-xs bg-background w-full"
          value=""
          onChange={e => add(e.target.value)}
        >
          <option value="">+ {placeholder}</option>
          {(single ? services : available).filter(s => s.serviceKey).map(s => (
            <option key={s.serviceKey!} value={s.serviceKey!}>{s.name}</option>
          ))}
        </select>
      )}
      {single && selected.length > 0 && (
        <select
          className="border rounded-md px-2 py-1.5 text-xs bg-background w-full"
          value={selected[0] ?? ""}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">— none —</option>
          {services.filter(s => s.serviceKey).map(s => (
            <option key={s.serviceKey!} value={s.serviceKey!}>{s.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function FeatureChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = strToArr(value);
  const available = WINDOW_FEATURE_LIST.filter(f => !selected.includes(f.key));
  const remove = (key: string) => onChange(selected.filter(k => k !== key).join(", "));
  const add = (key: string) => {
    if (!key || selected.includes(key)) return;
    onChange([...selected, key].join(", "));
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[26px]">
        {selected.map(key => {
          const feat = WINDOW_FEATURE_LIST.find(f => f.key === key);
          return (
            <span key={key} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
              {feat?.label ?? key}
              <button type="button" onClick={() => remove(key)} className="hover:text-red-500 leading-none ml-0.5">×</button>
            </span>
          );
        })}
      </div>
      <select
        className="border rounded-md px-2 py-1.5 text-xs bg-background w-full"
        value=""
        onChange={e => add(e.target.value)}
      >
        <option value="">+ Add feature…</option>
        {available.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
    </div>
  );
}

type UpsellDraft = {
  id: string;
  title: string;
  description: string;
  appliesTo: string;
  badge: string;
  active: boolean;
  sortOrder: number;
  category: string;
  pricingMode: string;
  displaySavingsText: string;
  // Flat
  flatAmount: string;
  // Per unit
  puRate: string;
  puSource: string;
  puMin: string;
  puMax: string;
  // Service multiplier
  smBaseService: string;
  smMultiplier: string;
  smBasePrice: string;
  smMin: string;
  smMax: string;
  // Package delta
  pdFromPackage: string;
  pdToPackage: string;
  pdAmount: string;
  // Bundle discount
  bdPrice: string;
  bdDiscount: string;
  bdIncluded: string;
  // Eligibility
  requiresServices: string;
  excludeServices: string;
  suppressIfCovered: string;
  priority: string;
  exclusiveGroup: string;
  // Thresholds (go into rules)
  minSqft: string;
  maxSqft: string;
  minWindows: string;
  maxWindows: string;
  minSubtotal: string;
  maxSubtotal: string;
  // Advanced fallback
  showAdvanced: boolean;
  // Inline price preview test input
  previewQty: string;
};

function fromDbUpsell(upsell: any, idx: number): UpsellDraft {
  const pc = upsell.priceConfig ?? {};
  const rules = upsell.rules ?? {};
  const mode: string = upsell.pricingMode ?? "flat";
  return {
    id: upsell.id ?? "",
    title: upsell.title ?? "",
    description: upsell.description ?? "",
    appliesTo: (upsell.appliesTo ?? []).join(", "),
    badge: upsell.badge ?? "",
    active: upsell.active !== false,
    sortOrder: Number(upsell.sortOrder ?? idx),
    category: upsell.category ?? "add_on",
    pricingMode: mode,
    displaySavingsText: upsell.displaySavingsText ?? "",
    // Flat
    flatAmount: mode === "flat" ? String(pc.amount ?? upsell.price ?? "") : "",
    // Per unit — accept both legacy (rate/unitSource) and canonical (ratePerUnit/unitKey)
    puRate: String(pc.ratePerUnit ?? pc.rate ?? ""),
    puSource: UNIT_KEY_TO_SOURCE[pc.unitKey] ?? pc.unitSource ?? pc.unitKey ?? "window_count",
    puMin: String(pc.minimumCharge ?? ""),
    puMax: String(pc.maximumCharge ?? ""),
    // Service multiplier
    smBaseService: pc.baseService ?? "",
    smMultiplier: String(pc.multiplier ?? ""),
    smBasePrice: String(pc.basePrice ?? ""),
    smMin: String(pc.minimumCharge ?? ""),
    smMax: String(pc.maximumCharge ?? ""),
    // Package delta
    pdFromPackage: pc.fromPackage ?? "",
    pdToPackage: pc.toPackage ?? "",
    pdAmount: String(pc.amount ?? ""),
    // Bundle discount
    bdPrice: String(pc.bundlePrice ?? pc.explicitBundlePrice ?? ""),
    bdDiscount: String(pc.discountAmount ?? ""),
    bdIncluded: (upsell.includesServices ?? []).join(", "),
    // Eligibility
    requiresServices: (upsell.requiresAnyServices ?? []).join(", "),
    excludeServices: (upsell.excludeIfServicesSelected ?? []).join(", "),
    suppressIfCovered: (upsell.suppressIfFeatureCovered ?? []).join(", "),
    priority: String(upsell.priority ?? ""),
    exclusiveGroup: upsell.exclusiveGroup ?? "",
    // Thresholds
    minSqft: String(rules.minSqft ?? ""),
    maxSqft: String(rules.maxSqft ?? ""),
    minWindows: String(rules.minWindows ?? ""),
    maxWindows: String(rules.maxWindows ?? ""),
    minSubtotal: String(rules.minSubtotal ?? ""),
    maxSubtotal: String(rules.maxSubtotal ?? ""),
    // Advanced
    showAdvanced: false,
    previewQty: "",
  };
}

function strToArr(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

// Map admin UI unit source labels to canonical engine keys
const UNIT_SOURCE_TO_KEY: Record<string, string> = {
  window_count: "windowCount",
  affected_window_count: "windowCount",
  square_feet: "sqft",
  linear_feet: "linearFeet",
};
const UNIT_KEY_TO_SOURCE: Record<string, string> = {
  windowCount: "window_count",
  sqft: "square_feet",
  linearFeet: "linear_feet",
};

function toUpsertInput(item: UpsellDraft, idx: number) {
  let priceConfig: Record<string, unknown> = {};
  let price = 0;
  switch (item.pricingMode) {
    case "flat":
      price = Number(item.flatAmount) || 0;
      priceConfig = { amount: price };
      break;
    case "per_unit": {
      const rate = Number(item.puRate) || 0;
      price = rate;
      const unitKey = UNIT_SOURCE_TO_KEY[item.puSource] ?? item.puSource ?? "windowCount";
      priceConfig = {
        ratePerUnit: rate,
        unitKey,
        ...(item.puMin ? { minimumCharge: Number(item.puMin) } : {}),
        ...(item.puMax ? { maximumCharge: Number(item.puMax) } : {}),
      };
      break;
    }
    case "service_multiplier":
      price = Number(item.smBasePrice) || 0;
      priceConfig = {
        baseService: item.smBaseService,
        multiplier: Number(item.smMultiplier) || 1,
        ...(item.smBasePrice ? { basePrice: Number(item.smBasePrice) } : {}),
        ...(item.smMin ? { minimumCharge: Number(item.smMin) } : {}),
        ...(item.smMax ? { maximumCharge: Number(item.smMax) } : {}),
      };
      break;
    case "package_delta":
      price = Number(item.pdAmount) || 0;
      priceConfig = {
        fromPackage: item.pdFromPackage,
        toPackage: item.pdToPackage,
        amount: price,
      };
      break;
    case "bundle_discount":
      price = Number(item.bdPrice) || Number(item.bdDiscount) || 0;
      priceConfig = {
        ...(item.bdPrice ? { bundlePrice: Number(item.bdPrice) } : {}),
        ...(item.bdDiscount ? { discountAmount: Number(item.bdDiscount) } : {}),
      };
      break;
  }
  const rules: Record<string, unknown> = {};
  if (item.minSqft) rules.minSqft = Number(item.minSqft);
  if (item.maxSqft) rules.maxSqft = Number(item.maxSqft);
  if (item.minWindows) rules.minWindows = Number(item.minWindows);
  if (item.maxWindows) rules.maxWindows = Number(item.maxWindows);
  if (item.minSubtotal) rules.minSubtotal = Number(item.minSubtotal);
  if (item.maxSubtotal) rules.maxSubtotal = Number(item.maxSubtotal);
  const bdIncluded = strToArr(item.bdIncluded);
  return {
    id: item.id.trim(),
    title: item.title.trim(),
    description: item.description.trim(),
    price,
    appliesTo: strToArr(item.appliesTo),
    badge: item.badge?.trim() || undefined,
    active: item.active,
    sortOrder: idx,
    rules: Object.keys(rules).length ? rules : undefined,
    category: item.category || undefined,
    pricingMode: item.pricingMode || undefined,
    priceConfig: Object.keys(priceConfig).length ? priceConfig : undefined,
    displaySavingsText: item.displaySavingsText?.trim() || undefined,
    requiresAnyServices: strToArr(item.requiresServices).length ? strToArr(item.requiresServices) : undefined,
    excludeIfServicesSelected: strToArr(item.excludeServices).length ? strToArr(item.excludeServices) : undefined,
    includesServices: bdIncluded.length ? bdIncluded : undefined,
    suppressIfFeatureCovered: strToArr(item.suppressIfCovered).length ? strToArr(item.suppressIfCovered) : undefined,
    priority: item.priority ? Number(item.priority) : undefined,
    exclusiveGroup: item.exclusiveGroup?.trim() || undefined,
  };
}

function upsellPreview(item: UpsellDraft): string {
  const mode = item.pricingMode;
  const fmt = (v: string | number) => {
    const n = Number(v);
    return isNaN(n) ? "?" : `$${n.toFixed(2)}`;
  };
  let pricing = "";
  switch (mode) {
    case "flat":
      pricing = item.flatAmount ? `Flat fee of ${fmt(item.flatAmount)}` : "Flat fee (amount not set)";
      break;
    case "per_unit": {
      const src = item.puSource.replace(/_/g, " ");
      pricing = `${fmt(item.puRate)} per ${src}`;
      if (item.puMin) pricing += `, min ${fmt(item.puMin)}`;
      if (item.puMax) pricing += `, max ${fmt(item.puMax)}`;
      break;
    }
    case "service_multiplier": {
      const pct = item.smMultiplier ? `${(Number(item.smMultiplier) * 100).toFixed(0)}%` : "?%";
      pricing = `${pct} of ${item.smBaseService || "base service"} price`;
      if (item.smBasePrice) pricing += `. Fallback: ${fmt(item.smBasePrice)}`;
      if (item.smMin) pricing += `, min ${fmt(item.smMin)}`;
      if (item.smMax) pricing += `, max ${fmt(item.smMax)}`;
      break;
    }
    case "package_delta":
      pricing = `Upgrade from ${item.pdFromPackage || "?"} → ${item.pdToPackage || "?"}: ${fmt(item.pdAmount)}`;
      break;
    case "bundle_discount":
      if (item.bdPrice) pricing = `Bundle price: ${fmt(item.bdPrice)}`;
      else if (item.bdDiscount) pricing = `Discount: ${fmt(item.bdDiscount)} off`;
      else pricing = "Bundle (price not set)";
      if (item.bdIncluded) pricing += `. Includes: ${item.bdIncluded}`;
      break;
    default:
      pricing = "Unknown pricing mode";
  }
  const parts: string[] = [pricing];
  if (item.requiresServices) parts.push(`Shows when: ${item.requiresServices}`);
  if (item.excludeServices) parts.push(`Hidden if: ${item.excludeServices}`);
  if (item.minSubtotal) parts.push(`Min subtotal: ${fmt(item.minSubtotal)}`);
  if (item.maxSubtotal) parts.push(`Max subtotal: ${fmt(item.maxSubtotal)}`);
  if (item.minWindows) parts.push(`Min windows: ${item.minWindows}`);
  if (item.maxWindows) parts.push(`Max windows: ${item.maxWindows}`);
  if (item.minSqft) parts.push(`Min sqft: ${item.minSqft}`);
  if (item.maxSqft) parts.push(`Max sqft: ${item.maxSqft}`);
  return parts.join(" · ");
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5" />,
  Car: <Car className="w-5 h-5" />,
  Triangle: <Triangle className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Fence: <LayoutGrid className="w-5 h-5" />,
  LayoutGrid: <LayoutGrid className="w-5 h-5" />,
  Footprints: <Droplets className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Square: <Square className="w-5 h-5" />,
  Droplets: <Droplets className="w-5 h-5" />,
};

type TabId =
  | "services"
  | "packages"
  | "appearance"
  | "upsells"
  | "form"
  | "deploy";

const TABS: { id: TabId; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "packages", label: "Packages" },
  { id: "appearance", label: "Appearance" },
  { id: "upsells", label: "Upsells" },
  { id: "form", label: "Form" },
  { id: "deploy", label: "Deploy" },
];

export default function QuoteTool() {
  const [activeTab, setActiveTab] = useState<TabId>("services");

  // Queries
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = trpc.quoteToolSettings.getSettings.useQuery();
  const {
    data: services,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = trpc.quoteToolSettings.getServices.useQuery();
  const { data: upsellAnalytics } =
    trpc.quoteToolSettings.getUpsellAnalytics.useQuery({
      days: 30,
    });
  const { data: funnelSummary } = trpc.quoteAnalytics.funnelSummary.useQuery({
    days: 30,
  });
  const { data: attributionSummary } = trpc.quoteAnalytics.attribution.useQuery(
    { days: 30 }
  );
  const { data: upsells, refetch: refetchUpsells } =
    trpc.quoteToolSettings.listUpsells.useQuery();
  const { data: experienceVersions = [], refetch: refetchVersions } =
    trpc.quoteToolSettings.listExperienceVersions.useQuery();

  // ── Pricing / Packages state ──────────────────────────────────────────────
  const [jobMinimum, setJobMinimum] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState<string>("");
  const [packageDiscountsEnabled, setPackageDiscountsEnabled] = useState(false);
  const [discounts, setDiscounts] = useState({
    d2: "5",
    d3: "7",
    d4: "10",
    d5: "12",
  });

  // ── Appearance state ──────────────────────────────────────────────────────
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e293b");
  const [buttonText, setButtonText] = useState("Get My Free Quote");
  const [tierLabelGood, setTierLabelGood] = useState("Expert Essential");
  const [tierLabelBetter, setTierLabelBetter] = useState("Signature Sparkle");
  const [tierLabelBest, setTierLabelBest] = useState("Platinum Perfection");

  // ── Form state ────────────────────────────────────────────────────────────
  const [showPropertySqft, setShowPropertySqft] = useState(true);
  const [showStories, setShowStories] = useState(true);
  const [showCondition, setShowCondition] = useState(true);
  const [showPropertyType, setShowPropertyType] = useState(true);
  const [requireEmail, setRequireEmail] = useState(true);
  const [requirePhone, setRequirePhone] = useState(false);

  // ── Deploy state ──────────────────────────────────────────────────────────
  const [onlineBooking, setOnlineBooking] = useState(true);
  const [requireAdvance, setRequireAdvance] = useState(false);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [commercialRouting, setCommercialRouting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [availabilityStartHour, setAvailabilityStartHour] = useState(9);
  const [availabilityEndHour, setAvailabilityEndHour] = useState(17);
  const [availabilityDaysAhead, setAvailabilityDaysAhead] = useState(9);
  const [availabilityPreferExternal, setAvailabilityPreferExternal] =
    useState(true);
  const [slotPaddingMinutes, setSlotPaddingMinutes] = useState(0);
  const [maxServicesForInstantBooking, setMaxServicesForInstantBooking] =
    useState(2);
  const [blockedInstantServices, setBlockedInstantServices] = useState<
    string[]
  >([]);
  const [maxSqftAuto, setMaxSqftAuto] = useState(5000);
  const [maxLinearFtAuto, setMaxLinearFtAuto] = useState(800);
  const [maxStoriesAuto, setMaxStoriesAuto] = useState(3);
  const [maxWindowsAuto, setMaxWindowsAuto] = useState(120);

  // ── Add service dialog state ──────────────────────────────────────────────
  const [newServiceName, setNewServiceName] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  const [draftVersionLabel, setDraftVersionLabel] = useState("Config Snapshot");
  // ── Edit service dialog state ────────────────────────────────────────────
  const [editingService, setEditingService] = useState<any | null>(null);
  const [svcName, setSvcName] = useState("");
  const [svcKey, setSvcKey] = useState("");
  const [svcDescription, setSvcDescription] = useState("");
  const [svcPricingType, setSvcPricingType] = useState<"fixed" | "per_sqft" | "per_linear_ft" | "per_unit" | "tiered">("per_sqft");
  const [svcBasePrice, setSvcBasePrice] = useState<string>("0");
  const [svcPricePerUnit, setSvcPricePerUnit] = useState<string>("0");
  const [svcMinCharge, setSvcMinCharge] = useState<string>("0");
  const [svcManualReview, setSvcManualReview] = useState(false);
  // ── Upsell state ─────────────────────────────────────────────────────────
  const [upsellCatalog, setUpsellCatalog] = useState<UpsellDraft[]>([]);

  // Sync state from loaded settings (once)
  const [synced, setSynced] = useState(false);
  if (settings && upsells && !synced) {
    setJobMinimum(settings.jobMinimum ?? "0.00");
    setExpirationDays(String(settings.defaultExpirationDays ?? 7));
    setPackageDiscountsEnabled(settings.packageDiscountsEnabled ?? false);
    setDiscounts({
      d2: settings.discount2Services ?? "5.00",
      d3: settings.discount3Services ?? "7.00",
      d4: settings.discount4Services ?? "10.00",
      d5: settings.discount5PlusServices ?? "12.00",
    });
    setHeaderTitle((settings as any).headerTitle ?? "Get an Instant Quote");
    setHeaderSubtitle(
      (settings as any).headerSubtitle ??
        "Select your services and get a price in seconds"
    );
    setPrimaryColor((settings as any).primaryColor ?? "#1e293b");
    setButtonText((settings as any).buttonText ?? "Get My Free Quote");
    setTierLabelGood(
      (settings as any).customerTierLabels?.good ?? "Expert Essential"
    );
    setTierLabelBetter(
      (settings as any).customerTierLabels?.better ?? "Signature Sparkle"
    );
    setTierLabelBest(
      (settings as any).customerTierLabels?.best ?? "Platinum Perfection"
    );
    setShowPropertySqft((settings as any).showPropertySqft ?? true);
    setShowStories((settings as any).showStories ?? true);
    setShowCondition((settings as any).showCondition ?? true);
    setShowPropertyType((settings as any).showPropertyType ?? true);
    setRequireEmail((settings as any).requireEmail ?? true);
    setRequirePhone((settings as any).requirePhone ?? false);
    setOnlineBooking(settings.onlineBookingEnabled ?? true);
    setRequireAdvance(settings.requireAdvanceBooking ?? false);
    setAdvanceDays(settings.advanceBookingDays ?? 1);
    setCommercialRouting(settings.commercialRoutingEnabled ?? false);
    setAvailabilityStartHour(
      (settings as any).availabilityStartHour ?? 9
    );
    setAvailabilityEndHour((settings as any).availabilityEndHour ?? 17);
    setAvailabilityDaysAhead((settings as any).availabilityDaysAhead ?? 9);
    setAvailabilityPreferExternal(
      (settings as any).availabilityPreferExternal ?? true
    );
    setSlotPaddingMinutes((settings as any).slotPaddingMinutes ?? 0);
    setMaxServicesForInstantBooking(
      settings.maxServicesForInstantBooking ?? 2
    );
    setBlockedInstantServices(
      Array.isArray((settings as any).instantBookingBlockedServices)
        ? ((settings as any).instantBookingBlockedServices as string[])
        : []
    );
    setMaxSqftAuto(Number(settings.maxSqftAuto ?? 5000));
    setMaxLinearFtAuto(Number(settings.maxLinearFtAuto ?? 800));
    setMaxStoriesAuto(Number(settings.maxStoriesAuto ?? 3));
    setMaxWindowsAuto(Number(settings.maxWindowsAuto ?? 120));
    if (Array.isArray(upsells) && upsells.length > 0) {
      setUpsellCatalog(upsells.map((u: any, idx: number) => fromDbUpsell(u, idx)));
    } else {
      setUpsellCatalog([
        fromDbUpsell({ id: "window_screen_deep_clean", title: "Screen Deep Clean", description: "Full screen scrub and rinse for better clarity and airflow.", price: 89, appliesTo: ["window_cleaning"], badge: "Popular", active: true, sortOrder: 0, pricingMode: "flat", priceConfig: { amount: 89 }, category: "add_on" }, 0),
        fromDbUpsell({ id: "window_track_sill_detail", title: "Track + Sill Detailing", description: "Premium detailing for tracks, sills, and frame edges.", price: 129, appliesTo: ["window_cleaning"], active: true, sortOrder: 1, pricingMode: "flat", priceConfig: { amount: 129 }, category: "add_on" }, 1),
      ]);
    }

    setSynced(true);
  }

  // Mutations
  const updatePricing = trpc.quoteToolSettings.updatePricing.useMutation({
    onSuccess: () => {
      toast.success("Pricing settings saved");
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const updateDeploy = trpc.quoteToolSettings.updateDeploy.useMutation({
    onSuccess: () => {
      toast.success("Deploy settings saved");
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const pushDeployUpdate = (partial: {
    onlineBookingEnabled?: boolean;
    requireAdvanceBooking?: boolean;
    advanceBookingDays?: number;
    commercialRoutingEnabled?: boolean;
    maxServicesForInstantBooking?: number;
    instantBookingBlockedServices?: string[];
    availabilityStartHour?: number;
    availabilityEndHour?: number;
    availabilityDaysAhead?: number;
    availabilityPreferExternal?: boolean;
    slotPaddingMinutes?: number;
    maxSqftAuto?: number;
    maxLinearFtAuto?: number;
    maxStoriesAuto?: number;
    maxWindowsAuto?: number;
  }) => {
    updateDeploy.mutate({
      onlineBookingEnabled:
        partial.onlineBookingEnabled ?? onlineBooking,
      requireAdvanceBooking:
        partial.requireAdvanceBooking ?? requireAdvance,
      advanceBookingDays:
        partial.advanceBookingDays ?? advanceDays,
      commercialRoutingEnabled:
        partial.commercialRoutingEnabled ?? commercialRouting,
      maxServicesForInstantBooking:
        partial.maxServicesForInstantBooking ??
        maxServicesForInstantBooking,
      instantBookingBlockedServices:
        partial.instantBookingBlockedServices ??
        blockedInstantServices,
      availabilityStartHour:
        partial.availabilityStartHour ?? availabilityStartHour,
      availabilityEndHour:
        partial.availabilityEndHour ?? availabilityEndHour,
      availabilityDaysAhead:
        partial.availabilityDaysAhead ?? availabilityDaysAhead,
      availabilityPreferExternal:
        partial.availabilityPreferExternal ?? availabilityPreferExternal,
      slotPaddingMinutes:
        partial.slotPaddingMinutes ?? slotPaddingMinutes,
      maxSqftAuto: partial.maxSqftAuto ?? maxSqftAuto,
      maxLinearFtAuto: partial.maxLinearFtAuto ?? maxLinearFtAuto,
      maxStoriesAuto: partial.maxStoriesAuto ?? maxStoriesAuto,
      maxWindowsAuto: partial.maxWindowsAuto ?? maxWindowsAuto,
    });
  };
  const updateService = trpc.quoteToolSettings.updateService.useMutation({
    onSuccess: () => {
      refetchServices();
      toast.success("Service updated");
      setEditingService(null);
    },
    onError: e => toast.error(e.message),
  });
  const createService = trpc.quoteToolSettings.createService.useMutation({
    onSuccess: () => {
      toast.success("Service added");
      refetchServices();
      setNewServiceName("");
      setShowAddService(false);
    },
    onError: e => toast.error(e.message),
  });
  const deleteService = trpc.quoteToolSettings.deleteService.useMutation({
    onSuccess: () => {
      toast.success("Service removed");
      refetchServices();
    },
    onError: e => toast.error(e.message),
  });
  const updateAppearance = trpc.quoteToolSettings.updateAppearance.useMutation({
    onSuccess: () => {
      toast.success("Appearance saved");
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const updateTierLabels = trpc.quoteToolSettings.updateTierLabels.useMutation({
    onSuccess: () => {
      toast.success("Tier labels saved");
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const upsertUpsell = trpc.quoteToolSettings.upsertUpsell.useMutation({
    onSuccess: () => {
      refetchUpsells();
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const deleteUpsell = trpc.quoteToolSettings.deleteUpsell.useMutation({
    onSuccess: () => {
      refetchUpsells();
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });
  const reorderUpsells = trpc.quoteToolSettings.reorderUpsells.useMutation({
    onSuccess: () => {
      refetchUpsells();
    },
    onError: e => toast.error(e.message),
  });
  const setUpsellRules = trpc.quoteToolSettings.setUpsellRules.useMutation({
    onSuccess: () => {
      refetchUpsells();
      toast.success("Upsell rules saved");
    },
    onError: e => toast.error(e.message),
  });
  const createExperienceDraft =
    trpc.quoteToolSettings.createExperienceDraft.useMutation({
      onSuccess: () => {
        toast.success("Draft snapshot created");
        refetchVersions();
      },
      onError: e => toast.error(e.message),
    });
  const publishExperienceVersion =
    trpc.quoteToolSettings.publishExperienceVersion.useMutation({
      onSuccess: () => {
        toast.success("Version published");
        refetchVersions();
      },
      onError: e => toast.error(e.message),
    });
  const rollbackExperienceVersion =
    trpc.quoteToolSettings.rollbackExperienceVersion.useMutation({
      onSuccess: () => {
        toast.success("Rollback applied");
        refetchSettings();
        refetchServices();
        refetchVersions();
      },
      onError: e => toast.error(e.message),
    });
  const updateFormSettings =
    trpc.quoteToolSettings.updateFormSettings.useMutation({
      onSuccess: () => {
        toast.success("Form settings saved");
        refetchSettings();
      },
      onError: e => toast.error(e.message),
    });
  const setActiveMutation = trpc.quoteToolSettings.setActive.useMutation({
    onSuccess: () => {
      toast.success(
        isActive ? "Quote tool deactivated" : "Quote tool activated"
      );
      refetchSettings();
    },
    onError: e => toast.error(e.message),
  });

  const standaloneUrl = settings?.standaloneToken
    ? `${window.location.origin}/quote/${settings.standaloneToken}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standaloneUrl);
    toast.success("Link copied to clipboard");
  };

  const formatMoney = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  };

  if (settingsLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Instant Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Configure your quote tool and service pricing
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-slate-800 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Services Tab ─────────────────────────────────────────────────── */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Available Services
                  </CardTitle>
                  <CardDescription>
                    Toggle and configure the services shown in your quote tool
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="bg-slate-800 hover:bg-slate-700 text-white gap-1.5"
                  onClick={() => setShowAddService(!showAddService)}
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {showAddService && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 mb-3">
                  <Input
                    placeholder="Service name (e.g. Gutter Cleaning)"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newServiceName.trim()) {
                        createService.mutate({ name: newServiceName.trim() });
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    className="bg-slate-800 hover:bg-slate-700 text-white"
                    onClick={() => {
                      if (newServiceName.trim())
                        createService.mutate({ name: newServiceName.trim() });
                    }}
                    disabled={createService.isPending || !newServiceName.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddService(false);
                      setNewServiceName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {services?.map(svc => (
                <div
                  key={svc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: svc.iconColor ?? "#3b82f6" }}
                  >
                    {SERVICE_ICONS[svc.icon ?? "Droplets"] ?? (
                      <Droplets className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {svc.name}
                      {svc.manualReviewRequired ? (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                          Manual review
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {svc.serviceKey || "no key set"}
                    </div>
                  </div>
                  <Switch
                    checked={svc.enabled ?? true}
                    onCheckedChange={v =>
                      updateService.mutate({ id: svc.id, enabled: v })
                    }
                  />
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <Label className="text-xs text-muted-foreground">
                      Manual review
                    </Label>
                    <Switch
                      checked={svc.manualReviewRequired ?? false}
                      onCheckedChange={v =>
                        updateService.mutate({
                          id: svc.id,
                          manualReviewRequired: v,
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingService(svc);
                      setSvcName(svc.name ?? "");
                      setSvcKey(svc.serviceKey ?? "");
                      setSvcDescription(svc.description ?? "");
                      setSvcPricingType(
                        (svc.pricingType as any) ?? "per_sqft"
                      );
                      setSvcBasePrice(String(svc.basePrice ?? "0"));
                      setSvcPricePerUnit(String(svc.pricePerUnit ?? "0"));
                      setSvcMinCharge(String(svc.minimumCharge ?? "0"));
                      setSvcManualReview(!!svc.manualReviewRequired);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (
                        confirm(`Remove "${svc.name}" from your quote tool?`)
                      ) {
                        deleteService.mutate({ id: svc.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Packages Tab ─────────────────────────────────────────────────── */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          {/* Job Minimum */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Job Minimum</CardTitle>
              <CardDescription>
                Set the minimum amount charged for any job, regardless of
                services selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label
                    htmlFor="jobMin"
                    className="text-xs text-muted-foreground mb-1 block"
                  >
                    Minimum Job Price ($)
                  </Label>
                  <Input
                    id="jobMin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={jobMinimum}
                    onChange={e => setJobMinimum(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <Button
                  className="mt-5 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={() =>
                    updatePricing.mutate({
                      jobMinimum: parseFloat(jobMinimum) || 0,
                      defaultExpirationDays: parseInt(expirationDays) || 7,
                      packageDiscountsEnabled,
                      discount2Services: parseFloat(discounts.d2) || 5,
                      discount3Services: parseFloat(discounts.d3) || 7,
                      discount4Services: parseFloat(discounts.d4) || 10,
                      discount5PlusServices: parseFloat(discounts.d5) || 12,
                    })
                  }
                  disabled={updatePricing.isPending}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Default Quote Expiration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Default Quote Expiration
              </CardTitle>
              <CardDescription>
                Set the default number of days before a quote expires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label
                    htmlFor="expDays"
                    className="text-xs text-muted-foreground mb-1 block"
                  >
                    Days Until Expiration
                  </Label>
                  <Input
                    id="expDays"
                    type="number"
                    min="1"
                    max="365"
                    value={expirationDays}
                    onChange={e => setExpirationDays(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <Button
                  className="mt-5 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={() =>
                    updatePricing.mutate({
                      jobMinimum: parseFloat(jobMinimum) || 0,
                      defaultExpirationDays: parseInt(expirationDays) || 7,
                      packageDiscountsEnabled,
                      discount2Services: parseFloat(discounts.d2) || 5,
                      discount3Services: parseFloat(discounts.d3) || 7,
                      discount4Services: parseFloat(discounts.d4) || 10,
                      discount5PlusServices: parseFloat(discounts.d5) || 12,
                    })
                  }
                  disabled={updatePricing.isPending}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Package Discounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Package Discounts</CardTitle>
              <CardDescription>
                Encourage customers to bundle services with automatic discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Enable Package Discounts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically apply discounts when customers select multiple
                    services
                  </p>
                </div>
                <Switch
                  checked={packageDiscountsEnabled}
                  onCheckedChange={setPackageDiscountsEnabled}
                />
              </div>
              <Separator />
              <div className="space-y-3">
                {[
                  { label: "2 Services", key: "d2" as const },
                  { label: "3 Services", key: "d3" as const },
                  { label: "4 Services", key: "d4" as const },
                  { label: "5+ Services", key: "d5" as const },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm w-24">{label}</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discounts[key]}
                      onChange={e =>
                        setDiscounts(d => ({ ...d, [key]: e.target.value }))
                      }
                      className="w-20"
                      disabled={!packageDiscountsEnabled}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
              <Button
                className="bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() =>
                  updatePricing.mutate({
                    jobMinimum: parseFloat(jobMinimum) || 0,
                    defaultExpirationDays: parseInt(expirationDays) || 7,
                    packageDiscountsEnabled,
                    discount2Services: parseFloat(discounts.d2) || 5,
                    discount3Services: parseFloat(discounts.d3) || 7,
                    discount4Services: parseFloat(discounts.d4) || 10,
                    discount5PlusServices: parseFloat(discounts.d5) || 12,
                  })
                }
                disabled={updatePricing.isPending}
              >
                Save Package Discounts
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Appearance Tab ────────────────────────────────────────────────── */}
      {activeTab === "appearance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Header Text</CardTitle>
              <CardDescription>
                Customize the headline and subheadline shown at the top of your
                quote tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Headline
                </Label>
                <Input
                  value={headerTitle}
                  onChange={e => setHeaderTitle(e.target.value)}
                  placeholder="Get an Instant Quote"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Subheadline
                </Label>
                <Input
                  value={headerSubtitle}
                  onChange={e => setHeaderSubtitle(e.target.value)}
                  placeholder="Select your services and get a price in seconds"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Colors &amp; Button</CardTitle>
              <CardDescription>
                Customize the primary color and call-to-action button text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-32 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Button Text
                </Label>
                <Input
                  value={buttonText}
                  onChange={e => setButtonText(e.target.value)}
                  placeholder="Get My Free Quote"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Customer Package Names
              </CardTitle>
              <CardDescription>
                These labels are customer-facing only. Internal pricing keys
                remain good, better, and best.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tier 1 Label
                </Label>
                <Input
                  value={tierLabelGood}
                  onChange={e => setTierLabelGood(e.target.value)}
                  placeholder="Expert Essential"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tier 2 Label
                </Label>
                <Input
                  value={tierLabelBetter}
                  onChange={e => setTierLabelBetter(e.target.value)}
                  placeholder="Signature Sparkle"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tier 3 Label
                </Label>
                <Input
                  value={tierLabelBest}
                  onChange={e => setTierLabelBest(e.target.value)}
                  placeholder="Platinum Perfection"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            onClick={async () => {
              await updateAppearance.mutateAsync({
                headerTitle,
                headerSubtitle,
                primaryColor,
                buttonText,
              });
              await updateTierLabels.mutateAsync({
                good: tierLabelGood.trim() || "Expert Essential",
                better: tierLabelBetter.trim() || "Signature Sparkle",
                best: tierLabelBest.trim() || "Platinum Perfection",
              });
            }}
            disabled={updateAppearance.isPending || updateTierLabels.isPending}
          >
            Save Appearance
          </Button>
        </div>
      )}

      {/* ── Upsells Tab ─────────────────────────────────────────────────── */}
      {activeTab === "upsells" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Upsell Performance (30 days)
              </CardTitle>
              <CardDescription>
                Quick attach-rate snapshot from tracked quote events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upsellAnalytics?.rows?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b">
                    <span>Offer</span>
                    <span>Shown / Accepted / Rate</span>
                  </div>
                  {upsellAnalytics.rows.slice(0, 8).map((row: any) => (
                    <div
                      key={row.upsellId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium truncate pr-3">
                        {row.title}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {row.shown} / {row.accepted} /{" "}
                        {(row.acceptRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t text-xs text-muted-foreground flex justify-between">
                    <span>Total shown: {upsellAnalytics.totalShown}</span>
                    <span>Total accepted: {upsellAnalytics.totalAccepted}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upsell event data yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Funnel + Attribution (30 days)
              </CardTitle>
              <CardDescription>
                Conversion performance from first view to submission with top
                traffic sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  {
                    label: "Sessions",
                    value: funnelSummary?.totals?.sessionsStarted ?? 0,
                  },
                  {
                    label: "Viewed",
                    value: funnelSummary?.totals?.quoteViewed ?? 0,
                  },
                  {
                    label: "Submitted",
                    value: funnelSummary?.totals?.quoteSubmitted ?? 0,
                  },
                  {
                    label: "Upsell Accepted",
                    value: funnelSummary?.totals?.upsellAccepted ?? 0,
                  },
                  {
                    label: "Schedule Blocked",
                    value: funnelSummary?.totals?.scheduleBlocked ?? 0,
                  },
                  {
                    label: "Slot Selected",
                    value: funnelSummary?.slotSelected ?? 0,
                  },
                  {
                    label: "Slot Confirmed",
                    value: funnelSummary?.slotConfirmed ?? 0,
                  },
                ].map(metric => (
                  <div key={metric.label} className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-lg font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">View Rate</p>
                  <p className="font-semibold">
                    {funnelSummary?.rates?.viewRate ?? 0}%
                  </p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Submit Rate</p>
                  <p className="font-semibold">
                    {funnelSummary?.rates?.submitRate ?? 0}%
                  </p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">
                    Upsell Attach Rate
                  </p>
                  <p className="font-semibold">
                    {funnelSummary?.rates?.upsellAttachRate ?? 0}%
                  </p>
                </div>
              </div>

              {funnelSummary?.scheduleBlockedReasons?.length ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Schedule Blocked Reasons
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {funnelSummary.scheduleBlockedReasons.map((row: any) => (
                      <div
                        key={row.reason}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {( {
                            too_many_services: "Too many services (3+)",
                            blocked_service_type: "Blocked service type",
                            service_requires_manual_review:
                              "Service marked manual review",
                            size_or_complexity: "Size/complexity threshold",
                            range_output: "Range / low confidence",
                            no_slots_from_scheduler: "No live slots returned",
                            client_marked_ineligible: "Client marked ineligible",
                          } as Record<string, string>)[row.reason] ??
                            row.reason.replace(/_/g, " ")}
                        </span>
                        <span className="font-semibold">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Top Sources
                </p>
                {attributionSummary?.topSources?.length ? (
                  <div className="space-y-1">
                    {attributionSummary.topSources
                      .slice(0, 5)
                      .map((row: any) => (
                        <div
                          key={row.source}
                          className="flex items-center justify-between text-sm rounded-md border p-2"
                        >
                          <span className="font-medium truncate pr-3">
                            {row.source}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {row.submitted}/{row.sessions} ({row.submitRate}%)
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No attribution data yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Experience Versions</CardTitle>
              <CardDescription>
                Create draft snapshots, publish versions, and rollback quickly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={draftVersionLabel}
                  onChange={e => setDraftVersionLabel(e.target.value)}
                  placeholder="Config Snapshot"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    createExperienceDraft.mutate({
                      versionLabel:
                        draftVersionLabel.trim() || "Config Snapshot",
                    })
                  }
                  disabled={createExperienceDraft.isPending}
                >
                  Save Draft
                </Button>
              </div>

              <div className="space-y-2">
                {experienceVersions.slice(0, 8).map((version: any) => (
                  <div
                    key={version.id}
                    className="rounded-md border p-2 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {version.versionLabel}
                        {version.status === "published" && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] uppercase font-semibold">
                            Live
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {version.status} ·{" "}
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (version.status === "published") return;
                          if (
                            confirm(
                              `Publish version "${version.versionLabel}"?`
                            )
                          ) {
                            publishExperienceVersion.mutate({ id: version.id });
                          }
                        }}
                        disabled={
                          publishExperienceVersion.isPending ||
                          version.status === "published"
                        }
                      >
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              `Rollback current experience to "${version.versionLabel}"? This replaces current settings and services.`
                            )
                          ) {
                            rollbackExperienceVersion.mutate({
                              id: version.id,
                            });
                          }
                        }}
                        disabled={rollbackExperienceVersion.isPending}
                      >
                        Rollback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upsell Catalog</CardTitle>
              <CardDescription>
                Add-ons, cross-sells, and bundles shown on the public quote Enhance step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upsellCatalog.map((upsell, idx) => {
                const patch = (fields: Partial<UpsellDraft>) =>
                  setUpsellCatalog(prev =>
                    prev.map((u, i) => (i === idx ? { ...u, ...fields } : u))
                  );
                const svcList = services ?? [];

                // Inline price preview calculation
                const qty = Number(upsell.previewQty) || 0;
                let previewLine = "";
                if (upsell.pricingMode === "flat" && upsell.flatAmount) {
                  previewLine = `Public price: $${Number(upsell.flatAmount).toFixed(2)}`;
                } else if (upsell.pricingMode === "per_unit" && upsell.puRate && upsell.previewQty) {
                  const raw = qty * Number(upsell.puRate);
                  const clamped = upsell.puMin ? Math.max(raw, Number(upsell.puMin)) : raw;
                  const final = upsell.puMax ? Math.min(clamped, Number(upsell.puMax)) : clamped;
                  const unitLabel = upsell.puSource.replace(/_/g, " ");
                  previewLine = `${qty} ${unitLabel} × $${upsell.puRate} = $${final.toFixed(2)}`;
                } else if (upsell.pricingMode === "service_multiplier" && upsell.smMultiplier && upsell.previewQty) {
                  const base = qty;
                  const result = base * Number(upsell.smMultiplier);
                  previewLine = `$${base.toFixed(2)} base × ${upsell.smMultiplier} = $${result.toFixed(2)}`;
                } else if (upsell.pricingMode === "package_delta" && upsell.pdAmount) {
                  previewLine = `Upgrade price: $${Number(upsell.pdAmount).toFixed(2)}`;
                } else if (upsell.pricingMode === "bundle_discount") {
                  if (upsell.bdPrice) previewLine = `Bundle price: $${Number(upsell.bdPrice).toFixed(2)}`;
                  else if (upsell.bdDiscount) previewLine = `Discount: $${Number(upsell.bdDiscount).toFixed(2)} off`;
                }

                return (
                <div key={upsell.id || idx} className="rounded-lg border p-4 space-y-4">

                  {/* ── Card header row ── */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={upsell.active} onCheckedChange={v => patch({ active: v })} />
                      <span className="text-sm font-medium">{upsell.title || "New Upsell"}</span>
                      {upsell.badge && <Badge variant="secondary" className="text-xs">{upsell.badge}</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0}
                        onClick={() => setUpsellCatalog(prev => {
                          if (idx === 0) return prev;
                          const next = [...prev];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          return next.map((item, i) => ({ ...item, sortOrder: i }));
                        })}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === upsellCatalog.length - 1}
                        onClick={() => setUpsellCatalog(prev => {
                          if (idx >= prev.length - 1) return prev;
                          const next = [...prev];
                          [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                          return next.map((item, i) => ({ ...item, sortOrder: i }));
                        })}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* ── Basic info ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
                      <Input value={upsell.title} onChange={e => patch({ title: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Badge (optional)</Label>
                      <Input value={upsell.badge} onChange={e => patch({ badge: e.target.value })} placeholder="Popular" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                    <Input value={upsell.description} onChange={e => patch({ description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Show for these services</Label>
                      <ServiceChips value={upsell.appliesTo} onChange={v => patch({ appliesTo: v })} services={svcList} placeholder="Add service…" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Offer type</Label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={upsell.category} onChange={e => patch({ category: e.target.value })}>
                        <option value="add_on">Add-on</option>
                        <option value="cross_sell">Cross-sell</option>
                        <option value="bundle">Bundle</option>
                      </select>
                    </div>
                  </div>

                  {/* ── Pricing section ── */}
                  <div className="rounded-md bg-muted/40 border p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20 shrink-0">Pricing</Label>
                      <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={upsell.pricingMode} onChange={e => patch({ pricingMode: e.target.value })}>
                        <option value="flat">Flat fee</option>
                        <option value="per_unit">Per unit (windows, sqft…)</option>
                        <option value="service_multiplier">Based on another service's price</option>
                        <option value="package_delta">Upgrade price difference</option>
                        <option value="bundle_discount">Bundle discount</option>
                      </select>
                    </div>

                    {/* Flat */}
                    {upsell.pricingMode === "flat" && (
                      <div className="flex items-end gap-3">
                        <div className="w-40">
                          <Label className="text-xs text-muted-foreground mb-1 block">Flat price ($)</Label>
                          <Input type="number" min="0" step="0.01" value={upsell.flatAmount} onChange={e => patch({ flatAmount: e.target.value })} placeholder="89" />
                        </div>
                        {previewLine && <p className="text-xs text-emerald-700 font-medium pb-2">{previewLine}</p>}
                      </div>
                    )}

                    {/* Per unit */}
                    {upsell.pricingMode === "per_unit" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Use this when price depends on quantity, like number of windows or square footage.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Rate per unit ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.puRate} onChange={e => patch({ puRate: e.target.value })} placeholder="5" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Unit type</Label>
                            <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={upsell.puSource} onChange={e => patch({ puSource: e.target.value })}>
                              <option value="window_count">Window count</option>
                              <option value="affected_window_count">Affected window count</option>
                              <option value="square_feet">Square feet</option>
                              <option value="linear_feet">Linear feet</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Min charge ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.puMin} onChange={e => patch({ puMin: e.target.value })} placeholder="—" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Max charge ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.puMax} onChange={e => patch({ puMax: e.target.value })} placeholder="—" />
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="w-36">
                            <Label className="text-xs text-muted-foreground mb-1 block">Test: example quantity</Label>
                            <Input type="number" min="0" value={upsell.previewQty} onChange={e => patch({ previewQty: e.target.value })} placeholder="15" />
                          </div>
                          {previewLine && <p className="text-xs text-emerald-700 font-medium pb-2">{previewLine}</p>}
                        </div>
                      </div>
                    )}

                    {/* Service multiplier */}
                    {upsell.pricingMode === "service_multiplier" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Use this when the price should be a percentage of another service already in the quote.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Use price from this service</Label>
                            <ServiceChips value={upsell.smBaseService} onChange={v => patch({ smBaseService: v })} services={svcList} single placeholder="Choose service…" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Multiplier (e.g. 0.85 = 85%)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.smMultiplier} onChange={e => patch({ smMultiplier: e.target.value })} placeholder="0.85" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Fallback price if service not in cart ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.smBasePrice} onChange={e => patch({ smBasePrice: e.target.value })} placeholder="140" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Min charge ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.smMin} onChange={e => patch({ smMin: e.target.value })} placeholder="—" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Max charge ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.smMax} onChange={e => patch({ smMax: e.target.value })} placeholder="—" />
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="w-40">
                            <Label className="text-xs text-muted-foreground mb-1 block">Test: example base price ($)</Label>
                            <Input type="number" min="0" value={upsell.previewQty} onChange={e => patch({ previewQty: e.target.value })} placeholder="140" />
                          </div>
                          {previewLine && <p className="text-xs text-emerald-700 font-medium pb-2">{previewLine}</p>}
                        </div>
                      </div>
                    )}

                    {/* Package delta */}
                    {upsell.pricingMode === "package_delta" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">The extra price a customer pays to upgrade from one package tier to another.</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">From package</Label>
                            <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={upsell.pdFromPackage} onChange={e => patch({ pdFromPackage: e.target.value })}>
                              <option value="">— select —</option>
                              <option value="good">Good</option>
                              <option value="better">Better</option>
                              <option value="best">Best</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">To package</Label>
                            <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={upsell.pdToPackage} onChange={e => patch({ pdToPackage: e.target.value })}>
                              <option value="">— select —</option>
                              <option value="good">Good</option>
                              <option value="better">Better</option>
                              <option value="best">Best</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Upgrade amount ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.pdAmount} onChange={e => patch({ pdAmount: e.target.value })} placeholder="49" />
                          </div>
                        </div>
                        {previewLine && <p className="text-xs text-emerald-700 font-medium">{previewLine}</p>}
                      </div>
                    )}

                    {/* Bundle discount */}
                    {upsell.pricingMode === "bundle_discount" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Bundle price ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.bdPrice} onChange={e => patch({ bdPrice: e.target.value })} placeholder="249" />
                            <p className="text-[10px] text-muted-foreground mt-0.5">Set a fixed bundle price, or set a discount amount below</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Discount amount ($)</Label>
                            <Input type="number" min="0" step="0.01" value={upsell.bdDiscount} onChange={e => patch({ bdDiscount: e.target.value })} placeholder="50" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Services included in this bundle</Label>
                          <ServiceChips value={upsell.bdIncluded} onChange={v => patch({ bdIncluded: v })} services={svcList} placeholder="Add included service…" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Savings text (shown in green on the quote)</Label>
                          <Input value={upsell.displaySavingsText} onChange={e => patch({ displaySavingsText: e.target.value })} placeholder="Save ~$50 vs booking separately" />
                        </div>
                        {previewLine && <p className="text-xs text-emerald-700 font-medium">{previewLine}</p>}
                      </div>
                    )}
                  </div>

                  {/* ── Eligibility section ── */}
                  <div className="rounded-md bg-muted/40 border p-3 space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">When to show this offer</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Only show when customer has selected</Label>
                        <ServiceChips value={upsell.requiresServices} onChange={v => patch({ requiresServices: v })} services={svcList} placeholder="Add required service…" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Hide if customer has already selected</Label>
                        <ServiceChips value={upsell.excludeServices} onChange={v => patch({ excludeServices: v })} services={svcList} placeholder="Add excluded service…" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Hide when already included in their package</Label>
                      <FeatureChips value={upsell.suppressIfCovered} onChange={v => patch({ suppressIfCovered: v })} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Min quote subtotal ($)</Label>
                        <Input type="number" min="0" value={upsell.minSubtotal} onChange={e => patch({ minSubtotal: e.target.value })} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Max quote subtotal ($)</Label>
                        <Input type="number" min="0" value={upsell.maxSubtotal} onChange={e => patch({ maxSubtotal: e.target.value })} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Min windows</Label>
                        <Input type="number" min="0" value={upsell.minWindows} onChange={e => patch({ minWindows: e.target.value })} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Max windows</Label>
                        <Input type="number" min="0" value={upsell.maxWindows} onChange={e => patch({ maxWindows: e.target.value })} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Min sqft</Label>
                        <Input type="number" min="0" value={upsell.minSqft} onChange={e => patch({ minSqft: e.target.value })} placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Max sqft</Label>
                        <Input type="number" min="0" value={upsell.maxSqft} onChange={e => patch({ maxSqft: e.target.value })} placeholder="—" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Priority (higher = shown first)</Label>
                        <Input type="number" value={upsell.priority} onChange={e => patch({ priority: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Exclusive group (only one from group shown)</Label>
                        <Input value={upsell.exclusiveGroup} onChange={e => patch({ exclusiveGroup: e.target.value })} placeholder="interior_windows" />
                      </div>
                    </div>
                  </div>

                  {/* ── Plain-English preview ── */}
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    <span className="font-medium">Summary: </span>{upsellPreview(upsell)}
                  </div>

                  {/* ── Advanced section (collapsed) ── */}
                  <div>
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => patch({ showAdvanced: !upsell.showAdvanced })}>
                      {upsell.showAdvanced ? "Hide" : "Show"} Advanced
                    </button>
                    {upsell.showAdvanced && (() => {
                      const liveInput = toUpsertInput(upsell, idx);
                      return (
                        <div className="mt-2 space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Internal ID</Label>
                            <Input value={upsell.id} onChange={e => patch({ id: e.target.value })} className="font-mono text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Price config that will be saved (live)</Label>
                            <Textarea rows={4} value={JSON.stringify(liveInput.priceConfig ?? {}, null, 2)} readOnly className="font-mono text-xs bg-muted" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Rules that will be saved (live)</Label>
                            <Textarea rows={3} value={JSON.stringify(liveInput.rules ?? {}, null, 2)} readOnly className="font-mono text-xs bg-muted" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Full payload preview</Label>
                            <Textarea rows={8} value={JSON.stringify(liveInput, null, 2)} readOnly className="font-mono text-xs bg-muted" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Row actions ── */}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUpsellCatalog(prev => {
                          const copy = { ...upsell, id: `${upsell.id}_copy_${Date.now()}`, title: `${upsell.title} (Copy)`, sortOrder: prev.length };
                          return [...prev, copy];
                        })}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const input = toUpsertInput(upsell, idx);
                          if (!input.appliesTo.length) { toast.error("Choose at least one service in 'Show for these services'"); return; }
                          try {
                            await upsertUpsell.mutateAsync(input);
                            toast.success(`Saved: ${upsell.title || upsell.id}`);
                          } catch (error: any) {
                            toast.error(error?.message || "Save failed");
                          }
                        }}
                        disabled={upsertUpsell.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={async () => {
                          if (!confirm(`Remove upsell "${upsell.title}"?`)) return;
                          if (upsells?.some(item => item.id === upsell.id)) {
                            await deleteUpsell.mutateAsync({ id: upsell.id });
                          }
                          setUpsellCatalog(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setUpsellCatalog(prev => [
                      ...prev,
                      fromDbUpsell({
                        id: `upsell_${Date.now()}`,
                        title: "New Upsell",
                        description: "Describe the value of this add-on.",
                        price: 0,
                        appliesTo: [],
                        badge: "",
                        active: true,
                        sortOrder: prev.length,
                        pricingMode: "flat",
                        priceConfig: { amount: 0 },
                        category: "add_on",
                      }, prev.length),
                    ])
                  }
                >
                  Add Upsell
                </Button>
                <Button
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={async () => {
                    try {
                      const normalized = upsellCatalog
                        .filter(item => item.id.trim() && item.title.trim())
                        .map((item, orderIdx) => toUpsertInput(item, orderIdx))
                        .filter(item => item.appliesTo.length > 0);

                      await Promise.all(normalized.map(item => upsertUpsell.mutateAsync(item)));
                      await reorderUpsells.mutateAsync(normalized.map(item => ({ id: item.id, sortOrder: item.sortOrder! })));
                      toast.success("All upsells saved");
                    } catch (error: any) {
                      toast.error(error?.message || "Unable to save upsells");
                    }
                  }}
                  disabled={upsertUpsell.isPending || reorderUpsells.isPending}
                >
                  Save All Upsells
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Form Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "form" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Property Details</CardTitle>
              <CardDescription>
                Choose which property fields to show in the quote form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Square Footage",
                  desc: "Ask for approximate property size",
                  key: "showPropertySqft",
                  value: showPropertySqft,
                  set: setShowPropertySqft,
                },
                {
                  label: "Number of Stories",
                  desc: "Ask how many stories the property has",
                  key: "showStories",
                  value: showStories,
                  set: setShowStories,
                },
                {
                  label: "Property Condition",
                  desc: "Ask about the current cleanliness level",
                  key: "showCondition",
                  value: showCondition,
                  set: setShowCondition,
                },
                {
                  label: "Property Type",
                  desc: "Ask if residential or commercial",
                  key: "showPropertyType",
                  value: showPropertyType,
                  set: setShowPropertyType,
                },
              ].map(({ label, desc, key, value, set }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {value ? (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch checked={value} onCheckedChange={set} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Fields</CardTitle>
              <CardDescription>
                Choose which contact fields are required
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Email Address",
                  desc: "Required to send the quote",
                  key: "requireEmail",
                  value: requireEmail,
                  set: setRequireEmail,
                },
                {
                  label: "Phone Number",
                  desc: "Optional – collect for follow-up calls",
                  key: "requirePhone",
                  value: requirePhone,
                  set: setRequirePhone,
                },
              ].map(({ label, desc, key, value, set }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </div>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() =>
              updateFormSettings.mutate({
                showPropertySqft,
                showStories,
                showCondition,
                showPropertyType,
                requireEmail,
                requirePhone,
              })
            }
            disabled={updateFormSettings.isPending}
          >
            Save Form Settings
          </Button>
        </div>
      )}

      {/* ── Deploy Tab ────────────────────────────────────────────────────── */}
      {activeTab === "deploy" && (
        <div className="space-y-4">
          {/* Activate / Deactivate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quote Tool Status</CardTitle>
              <CardDescription>
                Enable or disable the public-facing quote tool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Quote Tool Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When active, customers can access your standalone quote tool
                    via the link below.
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={v => {
                    setIsActive(v);
                    setActiveMutation.mutate({ isActive: v });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Online Booking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Online Booking</CardTitle>
              <CardDescription>
                Control whether customers can self-schedule during the quote
                flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Enable Online Booking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, customers can select a date and time during
                    the quote flow.
                  </p>
                </div>
                <Switch
                  checked={onlineBooking}
                  onCheckedChange={v => {
                    setOnlineBooking(v);
                    pushDeployUpdate({
                      onlineBookingEnabled: v,
                    });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Require Advance Booking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Require customers to book a minimum number of business days
                    in advance.
                  </p>
                </div>
                <Switch
                  checked={requireAdvance}
                  disabled={!onlineBooking}
                  onCheckedChange={v => {
                    setRequireAdvance(v);
                    pushDeployUpdate({
                      requireAdvanceBooking: v,
                    });
                  }}
                />
              </div>
              {requireAdvance && onlineBooking && (
                <div className="flex items-center gap-3 pl-1 pt-1">
                  <Label className="text-sm text-muted-foreground shrink-0">
                    Minimum days in advance:
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    className="w-20 h-8 text-sm"
                    value={advanceDays}
                    onChange={e => {
                      const v = Math.max(
                        1,
                        Math.min(30, parseInt(e.target.value) || 1)
                      );
                      setAdvanceDays(v);
                      pushDeployUpdate({
                        advanceBookingDays: v,
                      });
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    business days
                  </span>
                </div>
              )}

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-28">
                    Start hour
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={12}
                    className="w-20 h-8 text-sm"
                    value={availabilityStartHour}
                    onChange={e => {
                      const v = Math.max(
                        5,
                        Math.min(12, parseInt(e.target.value) || 9)
                      );
                      setAvailabilityStartHour(v);
                      pushDeployUpdate({ availabilityStartHour: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">AM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-28">
                    End hour
                  </Label>
                  <Input
                    type="number"
                    min={13}
                    max={22}
                    className="w-20 h-8 text-sm"
                    value={availabilityEndHour}
                    onChange={e => {
                      const v = Math.max(
                        13,
                        Math.min(22, parseInt(e.target.value) || 17)
                      );
                      setAvailabilityEndHour(v);
                      pushDeployUpdate({ availabilityEndHour: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-28">
                    Days ahead
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={21}
                    className="w-20 h-8 text-sm"
                    value={availabilityDaysAhead}
                    onChange={e => {
                      const v = Math.max(
                        1,
                        Math.min(21, parseInt(e.target.value) || 9)
                      );
                      setAvailabilityDaysAhead(v);
                      pushDeployUpdate({ availabilityDaysAhead: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Use external scheduler</p>
                    <p className="text-xs text-muted-foreground">
                      When enabled, the quote tool will request live slots from
                      your scheduler API (falls back to mock if unavailable).
                    </p>
                  </div>
                  <Switch
                    checked={availabilityPreferExternal}
                    onCheckedChange={v => {
                      setAvailabilityPreferExternal(v);
                      pushDeployUpdate({ availabilityPreferExternal: v });
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-32">
                    Slot padding (mins)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={240}
                    className="w-24 h-8 text-sm"
                    value={slotPaddingMinutes}
                    onChange={e => {
                      const v = Math.max(
                        0,
                        Math.min(240, parseInt(e.target.value) || 0)
                      );
                      setSlotPaddingMinutes(v);
                      pushDeployUpdate({ slotPaddingMinutes: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    buffer per job
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commercial Property Routing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Commercial Property Routing
              </CardTitle>
              <CardDescription>
                Automatically redirect commercial properties to a request form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Re-route commercial properties
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Commercial and industrial selections redirect to the chosen
                    request form.
                  </p>
                </div>
                <Switch
                  checked={commercialRouting}
                  onCheckedChange={v => {
                    setCommercialRouting(v);
                    pushDeployUpdate({
                      commercialRoutingEnabled: v,
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Instant Booking Guardrails */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Instant Booking Guardrails
              </CardTitle>
              <CardDescription>
                Control when self-scheduling is available to customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Max services allowed for instant booking
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If a quote has more than this number of services, scheduling
                    is disabled and the team will follow up manually.
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-24 h-9 text-sm"
                  value={maxServicesForInstantBooking}
                  onChange={e => {
                    const v = Math.max(
                      1,
                      Math.min(20, parseInt(e.target.value) || 1)
                    );
                    setMaxServicesForInstantBooking(v);
                    pushDeployUpdate({
                      maxServicesForInstantBooking: v,
                    });
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Complexity thresholds (auto range/manual review)
                </p>
                <p className="text-xs text-muted-foreground">
                  Quotes exceeding these values will skip instant booking and
                  route to manual review.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground w-32">
                      Max sqft
                    </Label>
                    <Input
                      type="number"
                      min={500}
                      max={20000}
                      className="w-28 h-8 text-sm"
                      value={maxSqftAuto}
                      onChange={e => {
                        const v = Math.max(
                          500,
                          Math.min(20000, parseInt(e.target.value) || 500)
                        );
                        setMaxSqftAuto(v);
                        pushDeployUpdate({ maxSqftAuto: v });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground w-32">
                      Max linear ft
                    </Label>
                    <Input
                      type="number"
                      min={100}
                      max={10000}
                      className="w-28 h-8 text-sm"
                      value={maxLinearFtAuto}
                      onChange={e => {
                        const v = Math.max(
                          100,
                          Math.min(10000, parseInt(e.target.value) || 100)
                        );
                        setMaxLinearFtAuto(v);
                        pushDeployUpdate({ maxLinearFtAuto: v });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground w-32">
                      Max stories
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      className="w-20 h-8 text-sm"
                      value={maxStoriesAuto}
                      onChange={e => {
                        const v = Math.max(
                          1,
                          Math.min(6, parseInt(e.target.value) || 1)
                        );
                        setMaxStoriesAuto(v);
                        pushDeployUpdate({ maxStoriesAuto: v });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground w-32">
                      Max windows
                    </Label>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      className="w-24 h-8 text-sm"
                      value={maxWindowsAuto}
                      onChange={e => {
                        const v = Math.max(
                          10,
                          Math.min(500, parseInt(e.target.value) || 10)
                        );
                        setMaxWindowsAuto(v);
                        pushDeployUpdate({ maxWindowsAuto: v });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Services that can never be instant-booked
                </p>
                <p className="text-xs text-muted-foreground">
                  Selected services will always route to manual scheduling, even
                  if they are the only service in the quote.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {services?.map(service => (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={blockedInstantServices.includes(
                          service.serviceKey ?? service.name
                        )}
                        onCheckedChange={checked => {
                          const key = service.serviceKey ?? service.name;
                          const next = checked
                            ? [...blockedInstantServices, key]
                            : blockedInstantServices.filter(s => s !== key);
                          setBlockedInstantServices(next);
                          pushDeployUpdate({
                            instantBookingBlockedServices: next,
                          });
                        }}
                      />
                      <span>{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standalone Quote Tool Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Standalone Quote Tool</CardTitle>
              <CardDescription>
                Share this direct link with customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Direct Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={standaloneUrl}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => window.open(standaloneUrl, "_blank")}
                  disabled={!standaloneUrl}
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Tool
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() =>
                    (window.location.href = "/admin/standalone-link")
                  }
                >
                  <Share2 className="w-4 h-4" />
                  Share &amp; Embed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>

    <Dialog open={!!editingService} onOpenChange={v => !v && setEditingService(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update pricing basics for this service.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={svcName} onChange={e => setSvcName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Service Key</Label>
              <Input
                value={svcKey}
                onChange={e => setSvcKey(e.target.value)}
                placeholder="house_washing"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              rows={2}
              value={svcDescription}
              onChange={e => setSvcDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pricing Type</Label>
              <Select value={svcPricingType} onValueChange={v => setSvcPricingType(v as any)}>
                <SelectTrigger><SelectValue placeholder="per_sqft" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                  <SelectItem value="per_linear_ft">Per Linear Ft</SelectItem>
                  <SelectItem value="per_unit">Per Unit</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Base Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={svcBasePrice}
                onChange={e => setSvcBasePrice(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Price / Unit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={svcPricePerUnit}
                onChange={e => setSvcPricePerUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Minimum Charge ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={svcMinCharge}
                onChange={e => setSvcMinCharge(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Switch checked={svcManualReview} onCheckedChange={setSvcManualReview} />
              <Label className="text-xs text-muted-foreground">Manual review</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!editingService) return;
              updateService.mutate({
                id: editingService.id,
                name: svcName || editingService.name,
                serviceKey: svcKey || null,
                description: svcDescription || null,
                pricingType: svcPricingType,
                basePrice: parseFloat(formatMoney(svcBasePrice)) as any,
                pricePerUnit: parseFloat(formatMoney(svcPricePerUnit)) as any,
                minimumCharge: parseFloat(formatMoney(svcMinCharge)) as any,
                manualReviewRequired: svcManualReview,
              } as any);
            }}
            disabled={updateService.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
