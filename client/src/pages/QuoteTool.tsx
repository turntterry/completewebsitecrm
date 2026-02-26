import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { Link } from "wouter";

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

type TabId = "services" | "packages" | "appearance" | "form" | "deploy";

const TABS: { id: TabId; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "packages", label: "Packages" },
  { id: "appearance", label: "Appearance" },
  { id: "form", label: "Form" },
  { id: "deploy", label: "Deploy" },
];

export default function QuoteTool() {
  const [activeTab, setActiveTab] = useState<TabId>("services");

  // Queries
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.quoteToolSettings.getSettings.useQuery();
  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = trpc.quoteToolSettings.getServices.useQuery();

  // ── Pricing / Packages state ──────────────────────────────────────────────
  const [jobMinimum, setJobMinimum] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState<string>("");
  const [packageDiscountsEnabled, setPackageDiscountsEnabled] = useState(false);
  const [discounts, setDiscounts] = useState({ d2: "5", d3: "7", d4: "10", d5: "12" });

  // ── Appearance state ──────────────────────────────────────────────────────
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e293b");
  const [buttonText, setButtonText] = useState("Get My Free Quote");

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

  // ── Add service dialog state ──────────────────────────────────────────────
  const [newServiceName, setNewServiceName] = useState("");
  const [showAddService, setShowAddService] = useState(false);

  // Sync state from loaded settings (once)
  const [synced, setSynced] = useState(false);
  if (settings && !synced) {
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
    setHeaderSubtitle((settings as any).headerSubtitle ?? "Select your services and get a price in seconds");
    setPrimaryColor((settings as any).primaryColor ?? "#1e293b");
    setButtonText((settings as any).buttonText ?? "Get My Free Quote");
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
    setIsActive((settings as any).isActive ?? false);
    setSynced(true);
  }

  // Mutations
  const updatePricing = trpc.quoteToolSettings.updatePricing.useMutation({
    onSuccess: () => { toast.success("Pricing settings saved"); refetchSettings(); },
    onError: (e) => toast.error(e.message),
  });
  const updateDeploy = trpc.quoteToolSettings.updateDeploy.useMutation({
    onSuccess: () => { toast.success("Deploy settings saved"); refetchSettings(); },
    onError: (e) => toast.error(e.message),
  });
  const updateService = trpc.quoteToolSettings.updateService.useMutation({
    onSuccess: () => refetchServices(),
    onError: (e) => toast.error(e.message),
  });
  const createService = trpc.quoteToolSettings.createService.useMutation({
    onSuccess: () => { toast.success("Service added"); refetchServices(); setNewServiceName(""); setShowAddService(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteService = trpc.quoteToolSettings.deleteService.useMutation({
    onSuccess: () => { toast.success("Service removed"); refetchServices(); },
    onError: (e) => toast.error(e.message),
  });
  const updateAppearance = trpc.quoteToolSettings.updateAppearance.useMutation({
    onSuccess: () => { toast.success("Appearance saved"); refetchSettings(); },
    onError: (e) => toast.error(e.message),
  });
  const updateFormSettings = trpc.quoteToolSettings.updateFormSettings.useMutation({
    onSuccess: () => { toast.success("Form settings saved"); refetchSettings(); },
    onError: (e) => toast.error(e.message),
  });
  const setActiveMutation = trpc.quoteToolSettings.setActive.useMutation({
    onSuccess: () => { toast.success(isActive ? "Quote tool deactivated" : "Quote tool activated"); refetchSettings(); },
    onError: (e) => toast.error(e.message),
  });

  const standaloneUrl = settings?.standaloneToken
    ? `${window.location.origin}/quote/${settings.standaloneToken}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standaloneUrl);
    toast.success("Link copied to clipboard");
  };

  if (settingsLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
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
          <p className="text-sm text-muted-foreground">Configure your quote tool and service pricing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-border">
        {TABS.map((tab) => (
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
                  <CardTitle className="text-base">Available Services</CardTitle>
                  <CardDescription>Toggle and configure the services shown in your quote tool</CardDescription>
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
                    onChange={(e) => setNewServiceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newServiceName.trim()) {
                        createService.mutate({ name: newServiceName.trim() });
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    className="bg-slate-800 hover:bg-slate-700 text-white"
                    onClick={() => { if (newServiceName.trim()) createService.mutate({ name: newServiceName.trim() }); }}
                    disabled={createService.isPending || !newServiceName.trim()}
                  >
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddService(false); setNewServiceName(""); }}>
                    Cancel
                  </Button>
                </div>
              )}
              {services?.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: svc.iconColor ?? "#3b82f6" }}
                  >
                    {SERVICE_ICONS[svc.icon ?? "Droplets"] ?? <Droplets className="w-5 h-5" />}
                  </div>
                  <span className="flex-1 text-sm font-medium">{svc.name}</span>
                  <Switch
                    checked={svc.enabled ?? true}
                    onCheckedChange={(v) => updateService.mutate({ id: svc.id, enabled: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => toast.info(`Configure pricing for ${svc.name} — coming soon`)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove "${svc.name}" from your quote tool?`)) {
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
              <CardDescription>Set the minimum amount charged for any job, regardless of services selected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor="jobMin" className="text-xs text-muted-foreground mb-1 block">Minimum Job Price ($)</Label>
                  <Input
                    id="jobMin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={jobMinimum}
                    onChange={(e) => setJobMinimum(e.target.value)}
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
              <CardTitle className="text-base">Default Quote Expiration</CardTitle>
              <CardDescription>Set the default number of days before a quote expires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor="expDays" className="text-xs text-muted-foreground mb-1 block">Days Until Expiration</Label>
                  <Input
                    id="expDays"
                    type="number"
                    min="1"
                    max="365"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
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
              <CardDescription>Encourage customers to bundle services with automatic discounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Package Discounts</p>
                  <p className="text-xs text-muted-foreground">Automatically apply discounts when customers select multiple services</p>
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
                      onChange={(e) => setDiscounts((d) => ({ ...d, [key]: e.target.value }))}
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
              <CardDescription>Customize the headline and subheadline shown at the top of your quote tool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Headline</Label>
                <Input
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Get an Instant Quote"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Subheadline</Label>
                <Input
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="Select your services and get a price in seconds"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Colors &amp; Button</CardTitle>
              <CardDescription>Customize the primary color and call-to-action button text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-32 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Button Text</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Get My Free Quote"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() => updateAppearance.mutate({ headerTitle, headerSubtitle, primaryColor, buttonText })}
            disabled={updateAppearance.isPending}
          >
            Save Appearance
          </Button>
        </div>
      )}

      {/* ── Form Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "form" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Property Details</CardTitle>
              <CardDescription>Choose which property fields to show in the quote form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Square Footage", desc: "Ask for approximate property size", key: "showPropertySqft", value: showPropertySqft, set: setShowPropertySqft },
                { label: "Number of Stories", desc: "Ask how many stories the property has", key: "showStories", value: showStories, set: setShowStories },
                { label: "Property Condition", desc: "Ask about the current cleanliness level", key: "showCondition", value: showCondition, set: setShowCondition },
                { label: "Property Type", desc: "Ask if residential or commercial", key: "showPropertyType", value: showPropertyType, set: setShowPropertyType },
              ].map(({ label, desc, key, value, set }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {value ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <Switch checked={value} onCheckedChange={set} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Fields</CardTitle>
              <CardDescription>Choose which contact fields are required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Email Address", desc: "Required to send the quote", key: "requireEmail", value: requireEmail, set: setRequireEmail },
                { label: "Phone Number", desc: "Optional – collect for follow-up calls", key: "requirePhone", value: requirePhone, set: setRequirePhone },
              ].map(({ label, desc, key, value, set }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() => updateFormSettings.mutate({ showPropertySqft, showStories, showCondition, showPropertyType, requireEmail, requirePhone })}
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
              <CardDescription>Enable or disable the public-facing quote tool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Quote Tool Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When active, customers can access your standalone quote tool via the link below.
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(v) => {
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
              <CardDescription>Control whether customers can self-schedule during the quote flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Enable Online Booking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, customers can select a date and time during the quote flow.
                  </p>
                </div>
                <Switch
                  checked={onlineBooking}
                  onCheckedChange={(v) => {
                    setOnlineBooking(v);
                    updateDeploy.mutate({
                      onlineBookingEnabled: v,
                      requireAdvanceBooking: requireAdvance,
                      advanceBookingDays: advanceDays,
                      commercialRoutingEnabled: commercialRouting,
                    });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Require Advance Booking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Require customers to book a minimum number of business days in advance.
                  </p>
                </div>
                <Switch
                  checked={requireAdvance}
                  disabled={!onlineBooking}
                  onCheckedChange={(v) => {
                    setRequireAdvance(v);
                    updateDeploy.mutate({
                      onlineBookingEnabled: onlineBooking,
                      requireAdvanceBooking: v,
                      advanceBookingDays: advanceDays,
                      commercialRoutingEnabled: commercialRouting,
                    });
                  }}
                />
              </div>
              {requireAdvance && onlineBooking && (
                <div className="flex items-center gap-3 pl-1 pt-1">
                  <Label className="text-sm text-muted-foreground shrink-0">Minimum days in advance:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    className="w-20 h-8 text-sm"
                    value={advanceDays}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                      setAdvanceDays(v);
                      updateDeploy.mutate({
                        onlineBookingEnabled: onlineBooking,
                        requireAdvanceBooking: requireAdvance,
                        advanceBookingDays: v,
                        commercialRoutingEnabled: commercialRouting,
                      });
                    }}
                  />
                  <span className="text-sm text-muted-foreground">business days</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commercial Property Routing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Commercial Property Routing</CardTitle>
              <CardDescription>Automatically redirect commercial properties to a request form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Re-route commercial properties</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Commercial and industrial selections redirect to the chosen request form.
                  </p>
                </div>
                <Switch
                  checked={commercialRouting}
                  onCheckedChange={(v) => {
                    setCommercialRouting(v);
                    updateDeploy.mutate({
                      onlineBookingEnabled: onlineBooking,
                      requireAdvanceBooking: requireAdvance,
                      advanceBookingDays: advanceDays,
                      commercialRoutingEnabled: v,
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Standalone Quote Tool Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Standalone Quote Tool</CardTitle>
              <CardDescription>Share this direct link with customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Direct Link</Label>
                <div className="flex items-center gap-2">
                  <Input value={standaloneUrl} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
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
                  onClick={() => (window.location.href = "/admin/standalone-link")}
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
  );
}
