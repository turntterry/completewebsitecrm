import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function InstantQuoteSettings() {
  // ── Global settings ──────────────────────────────────────────────────────
  const { data: globalSettings, isLoading: globalLoading, refetch: refetchGlobal } =
    trpc.instantQuoteConfig.getGlobalSettings.useQuery();

  const [jobMin, setJobMin] = useState("");
  const [expDays, setExpDays] = useState("7");
  const [baseAddress, setBaseAddress] = useState("");
  const [freeMiles, setFreeMiles] = useState("0");
  const [pricePerMile, setPricePerMile] = useState("0");
  const [synced, setSynced] = useState(false);

  if (globalSettings && !synced) {
    setJobMin(globalSettings.jobMinimum ?? "0.00");
    setExpDays(String(globalSettings.quoteExpirationDays ?? 7));
    setBaseAddress(globalSettings.baseAddress ?? "");
    setFreeMiles(globalSettings.freeMiles ?? "0.00");
    setPricePerMile(globalSettings.pricePerMile ?? "0.00");
    setSynced(true);
  }

  const saveGlobal = trpc.instantQuoteConfig.updateGlobalSettings.useMutation({
    onSuccess: () => { toast.success("Global settings saved"); refetchGlobal(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ── Discount tiers ────────────────────────────────────────────────────────
  const { data: tiers, isLoading: tiersLoading, refetch: refetchTiers } =
    trpc.instantQuoteConfig.getDiscountTiers.useQuery();

  // Local editable tiers
  const [localTiers, setLocalTiers] = useState<{ serviceCount: number; discountPercent: number; label: string }[]>([]);
  const [tiersSynced, setTiersSynced] = useState(false);

  if (tiers && !tiersSynced) {
    setLocalTiers(tiers.map((t) => ({
      serviceCount: t.serviceCount,
      discountPercent: parseFloat(t.discountPercent ?? "0"),
      label: t.label ?? "",
    })));
    setTiersSynced(true);
  }

  const replaceTiers = trpc.instantQuoteConfig.replaceDiscountTiers.useMutation({
    onSuccess: () => { toast.success("Discount tiers saved"); refetchTiers(); setTiersSynced(false); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const addTier = () => {
    setLocalTiers((prev) => [...prev, { serviceCount: (prev.length > 0 ? Math.max(...prev.map((t) => t.serviceCount)) + 1 : 2), discountPercent: 5, label: "" }]);
  };

  const removeTier = (idx: number) => {
    setLocalTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLocalTier = (idx: number, field: "serviceCount" | "discountPercent" | "label", value: string | number) => {
    setLocalTiers((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (globalLoading || tiersLoading) {
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
        <Link href="/admin/quote-tool">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Global Quote Settings</h1>
          <p className="text-sm text-muted-foreground">Configure job minimums, expiration, and bundle discounts</p>
        </div>
      </div>

      {/* Pricing Defaults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing Defaults</CardTitle>
          <CardDescription>Set the base pricing rules applied to all instant quotes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Job Minimum ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={jobMin}
                onChange={(e) => setJobMin(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quote Expiration (days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={expDays}
                onChange={(e) => setExpDays(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() =>
              saveGlobal.mutate({
                jobMinimum: parseFloat(jobMin) || 0,
                quoteExpirationDays: parseInt(expDays) || 7,
              })
            }
            disabled={saveGlobal.isPending}
          >
            Save Pricing Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Travel Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Travel / Distance Pricing</CardTitle>
          <CardDescription>Optionally add a travel surcharge for jobs beyond a free-miles radius</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Base Address</Label>
            <Input
              value={baseAddress}
              onChange={(e) => setBaseAddress(e.target.value)}
              placeholder="123 Main St, City, ST 00000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Free Miles</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={freeMiles}
                onChange={(e) => setFreeMiles(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Price Per Mile ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pricePerMile}
                onChange={(e) => setPricePerMile(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() =>
              saveGlobal.mutate({
                baseAddress,
                freeMiles: parseFloat(freeMiles) || 0,
                pricePerMile: parseFloat(pricePerMile) || 0,
              })
            }
            disabled={saveGlobal.isPending}
          >
            Save Travel Settings
          </Button>
        </CardContent>
      </Card>

      {/* Bundle Discount Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Bundle Discount Tiers</CardTitle>
              <CardDescription>
                Automatically apply discounts when customers select multiple services
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={addTier}
            >
              <Plus className="w-4 h-4" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {localTiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No discount tiers configured. Click "Add Tier" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1">
                <span className="text-xs text-muted-foreground font-medium">Min Services</span>
                <span className="text-xs text-muted-foreground font-medium">Discount %</span>
                <span className="text-xs text-muted-foreground font-medium">Label (optional)</span>
                <span />
              </div>
              {localTiers.map((tier, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center p-2 rounded-lg border border-border bg-card">
                  <Input
                    type="number"
                    min="2"
                    value={tier.serviceCount}
                    onChange={(e) => updateLocalTier(idx, "serviceCount", parseInt(e.target.value) || 2)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tier.discountPercent}
                    onChange={(e) => updateLocalTier(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={tier.label}
                    onChange={(e) => updateLocalTier(idx, "label", e.target.value)}
                    placeholder="e.g. Bundle Deal"
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTier(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {localTiers.length > 0 && (
            <>
              <Separator />
              <Button
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => replaceTiers.mutate(localTiers)}
                disabled={replaceTiers.isPending}
              >
                Save Discount Tiers
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
