import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X } from "lucide-react";

interface Service {
  id: number;
  name: string;
  icon?: string | null;
  iconColor?: string | null;
  enabled?: boolean | null;
}

interface QuotePreviewPanelProps {
  services: Service[];
  settings: {
    headerTitle?: string | null;
    headerSubtitle?: string | null;
    primaryColor?: string | null;
    buttonText?: string | null;
    packageDiscountsEnabled?: boolean | null;
    discount2Services?: string | null;
    discount3Services?: string | null;
    discount4Services?: string | null;
    discount5PlusServices?: string | null;
  } | null;
  onClose?: () => void;
}

const SERVICE_EMOJIS: Record<string, string> = {
  Home: "🏠",
  Car: "🚗",
  Triangle: "🔺",
  Building2: "🏢",
  Fence: "🪟",
  LayoutGrid: "🪟",
  Footprints: "👣",
  Layers: "📐",
  Square: "⬜",
  Droplets: "💧",
};

export function QuotePreviewPanel({ services, settings, onClose }: QuotePreviewPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"services" | "details" | "result">("services");
  const [sqft, setSqft] = useState("");
  const [stories, setStories] = useState("1");
  const [email, setEmail] = useState("");

  const primaryColor = settings?.primaryColor ?? "#1e293b";
  const buttonText = settings?.buttonText ?? "Get My Free Quote";
  const headerTitle = settings?.headerTitle ?? "Get an Instant Quote";
  const headerSubtitle = settings?.headerSubtitle ?? "Select your services and get a price in seconds";

  const enabledServices = services.filter((s) => s.enabled !== false);

  const toggleService = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  // Calculate a rough preview discount
  const getDiscountPct = () => {
    if (!settings?.packageDiscountsEnabled) return 0;
    if (selectedCount >= 5) return parseFloat(settings?.discount5PlusServices ?? "12");
    if (selectedCount >= 4) return parseFloat(settings?.discount4Services ?? "10");
    if (selectedCount >= 3) return parseFloat(settings?.discount3Services ?? "7");
    if (selectedCount >= 2) return parseFloat(settings?.discount2Services ?? "5");
    return 0;
  };

  const discountPct = getDiscountPct();

  return (
    <div className="relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      )}

      {/* Header */}
      <div
        className="px-5 pt-6 pb-5 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <h2 className="text-lg font-bold leading-tight">{headerTitle}</h2>
        <p className="text-sm opacity-80 mt-1">{headerSubtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-slate-100">
        {(["services", "details", "result"] as const).map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              step === s ? "text-slate-900 border-b-2" : "text-slate-400"
            }`}
            style={step === s ? { borderBottomColor: primaryColor } : {}}
          >
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {/* Step: Services */}
      {step === "services" && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Select services</p>
          <div className="space-y-2">
            {enabledServices.map((svc) => {
              const isSelected = selectedIds.has(svc.id);
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-2 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  style={isSelected ? { borderColor: primaryColor } : {}}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
                    style={{ backgroundColor: svc.iconColor ?? "#3b82f6" }}
                  >
                    {SERVICE_EMOJIS[svc.icon ?? "Droplets"] ?? "💧"}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{svc.name}</span>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 ml-auto shrink-0" style={{ color: primaryColor }} />
                  )}
                </button>
              );
            })}
          </div>

          {discountPct > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
              <Badge className="bg-green-600 text-white text-xs">{discountPct}% off</Badge>
              <span className="text-xs text-green-700">Bundle discount applied!</span>
            </div>
          )}

          <Button
            className="w-full text-white font-semibold"
            style={{ backgroundColor: primaryColor }}
            disabled={selectedCount === 0}
            onClick={() => setStep("details")}
          >
            Continue →
          </Button>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Property details</p>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Approx. Square Footage</Label>
            <Input
              type="number"
              placeholder="e.g. 2000"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Stories</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={stories}
              onChange={(e) => setStories(e.target.value)}
            >
              <option value="1">1 Story</option>
              <option value="2">2 Stories</option>
              <option value="3">3+ Stories</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Email Address</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("services")}>
              ← Back
            </Button>
            <Button
              className="flex-1 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setStep("result")}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="p-4 space-y-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: primaryColor }} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Quote Sent!</p>
            <p className="text-sm text-slate-500 mt-1">
              Your instant quote has been sent to {email || "your email"}.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Services selected</p>
            {enabledServices
              .filter((s) => selectedIds.has(s.id))
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {s.name}
                </div>
              ))}
            {discountPct > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <Badge className="bg-green-600 text-white text-xs">{discountPct}% off</Badge>
                Bundle discount applied
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setStep("services"); setSelectedIds(new Set()); setSqft(""); setEmail(""); }}
          >
            Start Over
          </Button>
        </div>
      )}

      {/* Preview watermark */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">Preview — not functional</p>
      </div>
    </div>
  );
}
