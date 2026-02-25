import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapView } from "@/components/Map";
import { CheckCircle2, ChevronRight, Home, Loader2, X, Tag, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Service Definitions ──────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "house_washing",
    name: "House Washing",
    icon: "🏠",
    color: "bg-blue-500",
    sizes: [
      { label: "S", sqft: 1000, price: 149 },
      { label: "M", sqft: 1500, price: 199 },
      { label: "L", sqft: 2000, price: 249 },
      { label: "XL", sqft: 2500, price: 299 },
      { label: "2XL", sqft: 3000, price: 349 },
    ],
    defaultSize: "M",
  },
  {
    id: "driveway_cleaning",
    name: "Driveway Cleaning",
    icon: "🚗",
    color: "bg-teal-500",
    sizes: [
      { label: "S", sqft: 600, price: 89 },
      { label: "M", sqft: 1000, price: 129 },
      { label: "L", sqft: 1200, price: 159 },
      { label: "XL", sqft: 1500, price: 189 },
      { label: "2XL", sqft: 2000, price: 229 },
    ],
    defaultSize: "M",
  },
  {
    id: "roof_cleaning",
    name: "Roof Cleaning",
    icon: "🏗️",
    color: "bg-green-500",
    sizes: [
      { label: "S", sqft: 1000, price: 199 },
      { label: "M", sqft: 1500, price: 279 },
      { label: "L", sqft: 2000, price: 349 },
      { label: "XL", sqft: 2500, price: 419 },
      { label: "2XL", sqft: 3000, price: 489 },
    ],
    defaultSize: "M",
  },
  {
    id: "detached_structure",
    name: "Detached Structure Wash",
    icon: "🏚️",
    color: "bg-orange-500",
    sizes: [
      { label: "S", sqft: 100, price: 79 },
      { label: "M", sqft: 300, price: 109 },
      { label: "L", sqft: 600, price: 149 },
      { label: "XL", sqft: 1000, price: 189 },
      { label: "2XL", sqft: 1500, price: 229 },
    ],
    defaultSize: "M",
  },
  {
    id: "fence_cleaning",
    name: "Fence Cleaning",
    icon: "🪵",
    color: "bg-yellow-600",
    sizes: null, // custom input
    fenceTypes: ["Wood", "Vinyl"],
    defaultFenceType: "Vinyl",
    defaultLinearFt: 100,
    defaultHeight: 6,
    defaultSides: "one",
    pricePerLinearFt: { wood: 0.85, vinyl: 0.75 },
  },
  {
    id: "patio_cleaning",
    name: "Patio Cleaning",
    icon: "🪑",
    color: "bg-blue-400",
    sizes: [
      { label: "S", sqft: 94, price: 79 },
      { label: "M", sqft: 100, price: 99 },
      { label: "L", sqft: 144, price: 129 },
      { label: "XL", sqft: 200, price: 159 },
      { label: "2XL", sqft: 256, price: 189 },
    ],
    defaultSize: "M",
  },
  {
    id: "walkway_cleaning",
    name: "Walkway Cleaning",
    icon: "🚶",
    color: "bg-cyan-500",
    sizes: [
      { label: "S", sqft: 48, price: 59 },
      { label: "M", sqft: 96, price: 79 },
      { label: "L", sqft: 144, price: 99 },
      { label: "XL", sqft: 192, price: 119 },
      { label: "2XL", sqft: 240, price: 139 },
    ],
    defaultSize: "M",
  },
  {
    id: "deck_cleaning",
    name: "Deck Cleaning",
    icon: "🌿",
    color: "bg-emerald-500",
    deckMaterials: ["Wood", "Composite"],
    defaultMaterial: "Wood",
    defaultSqft: 200,
    pricePerSqft: { wood: 0.55, composite: 0.65 },
    minPrice: 99,
  },
  {
    id: "window_cleaning",
    name: "Window Cleaning",
    icon: "🪟",
    color: "bg-purple-500",
    windowOptions: true,
    defaultWindows: 10,
    prices: {
      interior: 10,
      exterior: 11,
      screen: 4,
    },
  },
] as const;

// ─── Package Discount Tiers ───────────────────────────────────────────────────
const DISCOUNT_TIERS = [
  { minServices: 2, percent: 5 },
  { minServices: 3, percent: 8 },
  { minServices: 5, percent: 12 },
  { minServices: 7, percent: 15 },
];

function getDiscount(serviceCount: number) {
  let best = { minServices: 0, percent: 0 };
  for (const tier of DISCOUNT_TIERS) {
    if (serviceCount >= tier.minServices) best = tier;
  }
  return best.percent;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SelectedService {
  serviceId: string;
  serviceName: string;
  sizeLabel: string;
  sizeValue: number;
  options: Record<string, string>;
  price: number;
}

interface PropertyInfo {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  squareFootage: number;
  stories: number;
  exteriorMaterial: string;
  propertyType: string;
}

// ─── Step 1: Address Entry ────────────────────────────────────────────────────
function AddressStep({ onNext }: { onNext: (info: PropertyInfo) => void }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });
    autocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place.formatted_address) {
        setAddress(place.formatted_address);
      }
    });
  }, []);

  useEffect(() => {
    if (mapReady) initAutocomplete();
  }, [mapReady, initAutocomplete]);

  async function handleContinue() {
    if (!address.trim()) {
      setError("Please enter a property address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Geocode the address
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0]) resolve(results[0]);
          else reject(new Error("Address not found"));
        });
      });

      const components = result.address_components;
      const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name || "";
      const getShort = (type: string) =>
        components.find((c) => c.types.includes(type))?.short_name || "";

      const info: PropertyInfo = {
        address: result.formatted_address,
        city: get("locality") || get("sublocality"),
        state: getShort("administrative_area_level_1"),
        zip: get("postal_code"),
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        squareFootage: 1500,
        stories: 1,
        exteriorMaterial: "Siding",
        propertyType: "Single Family",
      };
      onNext(info);
    } catch {
      setError("Could not find that address. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Hidden map to init Google Maps */}
      <div className="hidden">
        <MapView onMapReady={() => setMapReady(true)} />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exterior Experts</h1>
          <p className="text-gray-500 mt-1">Power Washing & Window Cleaning</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Pressure Washing Quote Tool</h2>
          <p className="text-gray-500 text-sm mb-6">Get your free estimate in just a few steps</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Property Address
              </Label>
              <Input
                id="address"
                ref={inputRef}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter property address"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Looking up property...</>
              ) : (
                <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Service Selection ────────────────────────────────────────────────
function ServiceSelectionStep({
  property,
  onNext,
  onBack,
}: {
  property: PropertyInfo;
  onNext: (services: SelectedService[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, SelectedService>>({});
  // Per-service state
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [fenceType, setFenceType] = useState<Record<string, string>>({ fence_cleaning: "Vinyl" });
  const [fenceLinearFt, setFenceLinearFt] = useState<Record<string, number>>({ fence_cleaning: 100 });
  const [fenceHeight, setFenceHeight] = useState<Record<string, number>>({ fence_cleaning: 6 });
  const [fenceSides, setFenceSides] = useState<Record<string, string>>({ fence_cleaning: "one" });
  const [deckMaterial, setDeckMaterial] = useState<Record<string, string>>({ deck_cleaning: "Wood" });
  const [deckSqft, setDeckSqft] = useState<Record<string, number>>({ deck_cleaning: 200 });
  const [windowCount, setWindowCount] = useState<Record<string, number>>({ window_cleaning: 10 });
  const [windowTypes, setWindowTypes] = useState<Record<string, string[]>>({
    window_cleaning: ["interior", "exterior"],
  });

  function calcFencePrice(svcId: string) {
    const ft = fenceLinearFt[svcId] || 100;
    const ht = fenceHeight[svcId] || 6;
    const sides = fenceSides[svcId] === "both" ? 2 : 1;
    const type = (fenceType[svcId] || "vinyl").toLowerCase() as "wood" | "vinyl";
    const svc = SERVICES.find((s) => s.id === "fence_cleaning") as typeof SERVICES[4];
    const rate = svc.pricePerLinearFt[type];
    return Math.max(79, Math.round(ft * ht * sides * rate));
  }

  function calcDeckPrice(svcId: string) {
    const sqft = deckSqft[svcId] || 200;
    const mat = (deckMaterial[svcId] || "wood").toLowerCase() as "wood" | "composite";
    const svc = SERVICES.find((s) => s.id === "deck_cleaning") as typeof SERVICES[7];
    return Math.max(svc.minPrice, Math.round(sqft * svc.pricePerSqft[mat]));
  }

  function calcWindowPrice(svcId: string) {
    const count = windowCount[svcId] || 10;
    const types = windowTypes[svcId] || ["interior", "exterior"];
    const svc = SERVICES.find((s) => s.id === "window_cleaning") as typeof SERVICES[8];
    let price = 0;
    if (types.includes("interior")) price += count * svc.prices.interior;
    if (types.includes("exterior")) price += count * svc.prices.exterior;
    if (types.includes("screen")) price += count * svc.prices.screen;
    return Math.max(49, Math.round(price));
  }

  function toggleService(svc: typeof SERVICES[number]) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[svc.id]) {
        delete next[svc.id];
      } else {
        next[svc.id] = buildSelection(svc);
      }
      return next;
    });
  }

  function buildSelection(svc: typeof SERVICES[number]): SelectedService {
    if (svc.id === "fence_cleaning") {
      const price = calcFencePrice(svc.id);
      return {
        serviceId: svc.id,
        serviceName: svc.name,
        sizeLabel: `${fenceLinearFt[svc.id] || 100} ft`,
        sizeValue: fenceLinearFt[svc.id] || 100,
        options: {
          type: fenceType[svc.id] || "Vinyl",
          height: String(fenceHeight[svc.id] || 6),
          sides: fenceSides[svc.id] || "one",
        },
        price,
      };
    }
    if (svc.id === "deck_cleaning") {
      const price = calcDeckPrice(svc.id);
      return {
        serviceId: svc.id,
        serviceName: svc.name,
        sizeLabel: `${deckSqft[svc.id] || 200} sq ft`,
        sizeValue: deckSqft[svc.id] || 200,
        options: { material: deckMaterial[svc.id] || "Wood" },
        price,
      };
    }
    if (svc.id === "window_cleaning") {
      const price = calcWindowPrice(svc.id);
      return {
        serviceId: svc.id,
        serviceName: svc.name,
        sizeLabel: `${windowCount[svc.id] || 10} windows`,
        sizeValue: windowCount[svc.id] || 10,
        options: { types: (windowTypes[svc.id] || []).join(",") },
        price,
      };
    }
    // Size-based service
    const svcWithSizes = svc as typeof SERVICES[0];
    const sizeKey = sizes[svc.id] || svcWithSizes.defaultSize;
    const sizeObj = svcWithSizes.sizes.find((s) => s.label === sizeKey) || svcWithSizes.sizes[1];
    return {
      serviceId: svc.id,
      serviceName: svc.name,
      sizeLabel: `${sizeObj.label} (${sizeObj.sqft} sq ft)`,
      sizeValue: sizeObj.sqft,
      options: {},
      price: sizeObj.price,
    };
  }

  // Sync selected services when options change
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const svc = SERVICES.find((s) => s.id === id);
        if (svc) next[id] = buildSelection(svc);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes, fenceType, fenceLinearFt, fenceHeight, fenceSides, deckMaterial, deckSqft, windowCount, windowTypes]);

  const selectedList = Object.values(selected);
  const subtotal = selectedList.reduce((s, sv) => s + sv.price, 0);
  const discountPct = getDiscount(selectedList.length);
  const discountAmt = Math.round(subtotal * discountPct) / 100;
  const total = subtotal - discountAmt;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 text-center">
        <h1 className="font-bold text-gray-900">Exterior Experts Power Washing & Window Cleaning</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6 items-start">
        {/* Left: Services */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Property header */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Professional Exterior Cleaning For</p>
              <p className="font-semibold text-gray-900">{property.city ? `${property.city}, ${property.state}` : "Your Property"}</p>
              <p className="text-sm text-gray-500">{property.address}</p>
            </div>
            <Home className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
          </div>

          <p className="text-sm font-semibold text-blue-600 px-1">• Select Services</p>

          {SERVICES.map((svc) => {
            const isSelected = !!selected[svc.id];
            const hasSizes = "sizes" in svc && svc.sizes;
            const isFence = svc.id === "fence_cleaning";
            const isDeck = svc.id === "deck_cleaning";
            const isWindow = svc.id === "window_cleaning";

            return (
              <div
                key={svc.id}
                className={cn(
                  "bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-colors",
                  isSelected ? "border-blue-500" : "border-transparent"
                )}
              >
                {/* Service header row */}
                <button
                  type="button"
                  onClick={() => toggleService(svc)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0", svc.color)}>
                    {svc.icon}
                  </span>
                  <span className="font-medium text-gray-900 flex-1">{svc.name}</span>
                  {isSelected && (
                    <span className="text-sm font-semibold text-blue-600">
                      ${selected[svc.id]?.price.toFixed(2)}
                    </span>
                  )}
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  )}>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                </button>

                {/* Expanded options when selected */}
                {isSelected && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {hasSizes && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Select Size:</p>
                        <div className="flex flex-wrap gap-2">
                          {(svc as typeof SERVICES[0]).sizes.map((sz) => (
                            <button
                              key={sz.label}
                              type="button"
                              onClick={() => setSizes((p) => ({ ...p, [svc.id]: sz.label }))}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                                (sizes[svc.id] || (svc as typeof SERVICES[0]).defaultSize) === sz.label
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                              )}
                            >
                              {sz.label} <span className="text-xs opacity-75">({sz.sqft} sq ft)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isFence && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Fence Type:</p>
                          <div className="flex gap-2">
                            {["Wood", "Vinyl"].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setFenceType((p) => ({ ...p, [svc.id]: t }))}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                                  (fenceType[svc.id] || "Vinyl") === t
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                                )}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Linear Feet:</p>
                            <Input
                              type="number"
                              value={fenceLinearFt[svc.id] || 100}
                              onChange={(e) => setFenceLinearFt((p) => ({ ...p, [svc.id]: Number(e.target.value) }))}
                              min={1}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Height (feet):</p>
                            <Input
                              type="number"
                              value={fenceHeight[svc.id] || 6}
                              onChange={(e) => setFenceHeight((p) => ({ ...p, [svc.id]: Number(e.target.value) }))}
                              min={1}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Number of Sides:</p>
                          <div className="flex gap-2">
                            {[{ label: "One Side", value: "one" }, { label: "Both Sides", value: "both" }].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFenceSides((p) => ({ ...p, [svc.id]: opt.value }))}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                                  (fenceSides[svc.id] || "one") === opt.value
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {isDeck && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Deck Material:</p>
                          <div className="flex gap-2">
                            {["Wood", "Composite"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setDeckMaterial((p) => ({ ...p, [svc.id]: m }))}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                                  (deckMaterial[svc.id] || "Wood") === m
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Enter square footage:</p>
                          <Input
                            type="number"
                            value={deckSqft[svc.id] || 200}
                            onChange={(e) => setDeckSqft((p) => ({ ...p, [svc.id]: Number(e.target.value) }))}
                            min={1}
                            className="h-9 max-w-[160px]"
                          />
                        </div>
                      </div>
                    )}

                    {isWindow && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Number of Windows:</p>
                          <Input
                            type="number"
                            value={windowCount[svc.id] || 10}
                            onChange={(e) => setWindowCount((p) => ({ ...p, [svc.id]: Number(e.target.value) }))}
                            min={1}
                            className="h-9 max-w-[160px]"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Cleaning Types:</p>
                          {[
                            { key: "interior", label: `Interior Cleaning ($${SERVICES[8].prices.interior}.00/window)` },
                            { key: "exterior", label: `Exterior Cleaning ($${SERVICES[8].prices.exterior}.00/window)` },
                            { key: "screen", label: `Screen Cleaning ($${SERVICES[8].prices.screen}.00/window)` },
                          ].map((opt) => {
                            const checked = (windowTypes[svc.id] || []).includes(opt.key);
                            return (
                              <label key={opt.key} className="flex items-center gap-2 cursor-pointer py-1">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    setWindowTypes((p) => {
                                      const cur = p[svc.id] || [];
                                      return {
                                        ...p,
                                        [svc.id]: v ? [...cur, opt.key] : cur.filter((k) => k !== opt.key),
                                      };
                                    });
                                  }}
                                />
                                <span className="text-sm text-gray-700">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom actions */}
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Looking for something not listed here?</p>
            <a href="mailto:randall@exteriorexperts.co" className="text-sm text-blue-600 hover:underline">
              Send a detailed request to our team
            </a>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
          >
            <RotateCcw className="h-3 w-3" /> Restart Quote Process
          </button>
        </div>

        {/* Right: Package Sidebar */}
        <div className="w-72 shrink-0 sticky top-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-emerald-600 text-white p-4 text-center">
              <p className="font-bold text-lg">Your Custom Package</p>
            </div>
            <div className="p-4">
              {selectedList.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  Select services to see your quote
                </p>
              ) : (
                <>
                  <div className="text-center mb-3">
                    <p className="text-2xl font-bold text-gray-900">{selectedList.length} Service{selectedList.length !== 1 ? "s" : ""}</p>
                    {selectedList.length > 1 && (
                      <p className="text-sm text-gray-500">
                        {selectedList[0].serviceName} + {selectedList.length - 1} additional
                      </p>
                    )}
                    {discountPct > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        <Tag className="h-3 w-3" />
                        {discountPct}% Package Discount
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {SERVICES.map((svc) => {
                      const sel = selected[svc.id];
                      return (
                        <div key={svc.id} className="flex items-center gap-2">
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                            sel ? "bg-emerald-500" : "bg-gray-200"
                          )}>
                            {sel && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className={cn("text-sm", sel ? "text-gray-900" : "text-gray-400")}>
                            {svc.name}
                          </span>
                          {sel && (
                            <span className="ml-auto text-xs text-gray-500">${sel.price}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {discountPct > 0 && (
                    <p className="text-center text-emerald-600 text-xs font-medium mb-3">
                      You are saving ${discountAmt.toFixed(2)} with this package!
                    </p>
                  )}

                  <div className="border-t pt-3 flex items-center justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>

                  <Button
                    onClick={() => onNext(selectedList)}
                    disabled={selectedList.length === 0}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Book This Package
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelected({})}
                    className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 py-1"
                  >
                    Decline Quote
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Customer Info ────────────────────────────────────────────────────
function CustomerInfoStep({
  property,
  services,
  onBack,
}: {
  property: PropertyInfo;
  services: SelectedService[];
  onBack: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    emailConsent: true,
    smsConsent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const subtotal = services.reduce((s, sv) => s + sv.price, 0);
  const discountPct = getDiscount(services.length);
  const discountAmt = Math.round(subtotal * discountPct) / 100;
  const total = subtotal - discountAmt;

  const submitMutation = trpc.instantQuotes.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() && !form.phone.trim()) {
      e.email = "Please provide at least one: email or phone number";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    submitMutation.mutate({
      ...form,
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      lat: property.lat,
      lng: property.lng,
      squareFootage: property.squareFootage,
      stories: property.stories,
      exteriorMaterial: property.exteriorMaterial,
      propertyType: property.propertyType,
      services,
      subtotal,
      discountPercent: discountPct,
      discountAmount: discountAmt,
      total,
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Submitted!</h2>
          <p className="text-gray-500 mb-4">
            Thank you, {form.firstName}! We've received your quote request for{" "}
            <span className="font-medium text-gray-700">{property.address}</span>.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-2">Your Quote Summary</p>
            {services.map((s) => (
              <div key={s.serviceId} className="flex justify-between text-sm py-0.5">
                <span className="text-gray-600">{s.serviceName}</span>
                <span className="text-gray-900">${s.price}</span>
              </div>
            ))}
            {discountPct > 0 && (
              <div className="flex justify-between text-sm py-0.5 text-emerald-600">
                <span>Package Discount ({discountPct}%)</span>
                <span>-${discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
              <span>Total</span>
              <span className="text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Our team will reach out to you shortly to confirm your appointment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Backdrop blur overlay style */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-gray-900">Your Quote is Almost Ready!</h2>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-5 text-center">
            <p className="text-xs text-blue-600 font-medium">Custom Quote For:</p>
            <p className="font-semibold text-blue-800">{property.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-sm font-medium">First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="First name"
                className={cn("mt-1", errors.firstName && "border-red-400")}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-0.5">{errors.firstName}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Last name"
                className={cn("mt-1", errors.lastName && "border-red-400")}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-0.5">{errors.lastName}</p>}
            </div>
          </div>

          {errors.email && (
            <p className="text-amber-600 text-xs mb-2">{errors.email}</p>
          )}

          <div className="mb-3">
            <Label className="text-sm font-medium">Email Address</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Enter your email"
              className="mt-1"
            />
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
              <Checkbox
                checked={form.emailConsent}
                onCheckedChange={(v) => setForm((p) => ({ ...p, emailConsent: !!v }))}
              />
              <span className="text-xs text-gray-500">I agree to receive promotional emails. You can unsubscribe at any time.</span>
            </label>
          </div>

          <div className="mb-4">
            <Label className="text-sm font-medium">Phone Number</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">
              By providing your phone number, you agree to receive service-related text messages (quote updates, appointment reminders, etc.). Reply STOP to opt out.
            </p>
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
              <Checkbox
                checked={form.smsConsent}
                onCheckedChange={(v) => setForm((p) => ({ ...p, smsConsent: !!v }))}
              />
              <span className="text-xs text-gray-500">I agree to receive promotional SMS messages. Message & data rates may apply. Reply STOP to unsubscribe.</span>
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              "Finish My Quote"
            )}
          </Button>

          {submitMutation.isError && (
            <p className="text-red-500 text-sm text-center mt-2">
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="button"
            onClick={onBack}
            className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 py-1"
          >
            ← Back to Services
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InstantQuote() {
  const params = useParams<{ token?: string }>();
  const token = params.token;
  const [step, setStep] = useState<"address" | "services" | "contact">("address");
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [services, setServices] = useState<SelectedService[]>([]);

  // Validate token and check if tool is active
  const { data: settings, isLoading: settingsLoading } = trpc.quoteToolSettings.getSettings.useQuery();

  // If accessed via token URL, validate the token
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Token-based access: validate token matches
  if (token && settings?.standaloneToken !== token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-lg font-semibold mb-1">Link not found</h1>
          <p className="text-sm text-muted-foreground">This quote tool link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // Check if tool is active (only enforce on token-based standalone access)
  if (token && !(settings as any)?.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-2">🚧</p>
          <h1 className="text-lg font-semibold mb-1">Quote Tool Unavailable</h1>
          <p className="text-sm text-muted-foreground">Our online quote tool is temporarily unavailable. Please contact us directly.</p>
        </div>
      </div>
    );
  }

  if (step === "address") {
    return (
      <AddressStep
        onNext={(info) => {
          setProperty(info);
          setStep("services");
        }}
      />
    );
  }

  if (step === "services" && property) {
    return (
      <ServiceSelectionStep
        property={property}
        onNext={(svcs) => {
          setServices(svcs);
          setStep("contact");
        }}
        onBack={() => setStep("address")}
      />
    );
  }

  if (step === "contact" && property) {
    return (
      <CustomerInfoStep
        property={property}
        services={services}
        onBack={() => setStep("services")}
      />
    );
  }

  return null;
}
