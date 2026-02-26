import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronLeft, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

const PRICING_MODES = [
  { value: "smartscale", label: "SmartScale (tiered by size)" },
  { value: "flat", label: "Flat Rate" },
  { value: "per_sqft", label: "Per Sq Ft" },
  { value: "per_unit", label: "Per Unit" },
];

interface ServiceConfigCardProps {
  config: {
    id: number;
    serviceKey: string;
    displayName: string;
    pricingMode: string;
    pricingConfig: unknown;
    multipliers: unknown;
    taxable: boolean;
    active: boolean;
    sortOrder: number;
  };
  onSaved: () => void;
}

function ServiceConfigCard({ config, onSaved }: ServiceConfigCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [displayName, setDisplayName] = useState(config.displayName);
  const [pricingMode, setPricingMode] = useState(config.pricingMode);
  const [active, setActive] = useState(config.active);

  // Extract pricing config values
  const pc = (config.pricingConfig as Record<string, number> | null) ?? {};
  const [basePrice, setBasePrice] = useState(String(pc.basePrice ?? "0"));
  const [pricePerUnit, setPricePerUnit] = useState(String(pc.pricePerUnit ?? "0"));
  const [minimumCharge, setMinimumCharge] = useState(String(pc.minimumCharge ?? "0"));

  // Extract multipliers
  const mx = (config.multipliers as Record<string, Record<string, number>> | null) ?? {};
  const stories = mx.stories ?? { one_story: 1, two_story: 1.2, three_story: 1.4 };
  const [s1, setS1] = useState(String(stories.one_story ?? 1));
  const [s2, setS2] = useState(String(stories.two_story ?? 1.2));
  const [s3, setS3] = useState(String(stories.three_story ?? 1.4));

  const upsert = trpc.serviceConfig.upsert.useMutation({
    onSuccess: () => { toast.success(`${displayName} saved`); onSaved(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggle = trpc.serviceConfig.toggleActive.useMutation({
    onSuccess: () => onSaved(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSave = () => {
    upsert.mutate({
      serviceKey: config.serviceKey,
      displayName,
      pricingMode,
      pricingConfig: {
        mode: pricingMode,
        basePrice: parseFloat(basePrice) || 0,
        pricePerUnit: parseFloat(pricePerUnit) || 0,
        minimumCharge: parseFloat(minimumCharge) || 0,
      },
      multipliers: {
        stories: {
          one_story: parseFloat(s1) || 1,
          two_story: parseFloat(s2) || 1.2,
          three_story: parseFloat(s3) || 1.4,
        },
      },
      active,
    });
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={active}
            onCheckedChange={(v) => {
              setActive(v);
              toggle.mutate({ serviceKey: config.serviceKey, active: v });
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-sm font-medium">{config.displayName}</span>
          <span className="text-xs text-muted-foreground font-mono">{config.serviceKey}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{config.pricingMode}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Pricing Mode</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value)}
              >
                {PRICING_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Base Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Price Per Unit ($)</Label>
              <Input type="number" min="0" step="0.001" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Minimum Charge ($)</Label>
              <Input type="number" min="0" step="0.01" value={minimumCharge} onChange={(e) => setMinimumCharge(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Story Multipliers</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "1 Story", value: s1, set: setS1 },
                { label: "2 Stories", value: s2, set: setS2 },
                { label: "3 Stories", value: s3, set: setS3 },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                  <Input type="number" min="0.5" max="5" step="0.05" value={value} onChange={(e) => set(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <Button
            className="bg-slate-800 hover:bg-slate-700 text-white"
            size="sm"
            onClick={handleSave}
            disabled={upsert.isPending}
          >
            Save Config
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function ServiceConfigSettings() {
  const { data: configs, isLoading, refetch } = trpc.serviceConfig.list.useQuery();

  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  const upsert = trpc.serviceConfig.upsert.useMutation({
    onSuccess: () => {
      toast.success("Service config created");
      refetch();
      setShowAdd(false);
      setNewKey("");
      setNewName("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (isLoading) {
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
        <div className="flex-1">
          <h1 className="text-xl font-bold">Service Pricing Config</h1>
          <p className="text-sm text-muted-foreground">Configure per-service pricing rules for the instant quote engine</p>
        </div>
        <Button
          size="sm"
          className="bg-slate-800 hover:bg-slate-700 text-white gap-1.5"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      {/* Add new service config */}
      {showAdd && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Service Config</CardTitle>
            <CardDescription>Create a pricing config for a new service type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Service Key (unique ID)</Label>
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  placeholder="e.g. window_cleaning"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Display Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Window Cleaning"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-slate-800 hover:bg-slate-700 text-white"
                size="sm"
                onClick={() => {
                  if (!newKey || !newName) return;
                  upsert.mutate({
                    serviceKey: newKey,
                    displayName: newName,
                    pricingMode: "smartscale",
                    pricingConfig: { mode: "smartscale", basePrice: 0, minimumCharge: 0 },
                    multipliers: { stories: { one_story: 1, two_story: 1.2, three_story: 1.4 } },
                  });
                }}
                disabled={upsert.isPending || !newKey || !newName}
              >
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewKey(""); setNewName(""); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing configs */}
      {configs && configs.length > 0 ? (
        <div className="space-y-3">
          {configs.map((config) => (
            <ServiceConfigCard
              key={config.id}
              config={config}
              onSaved={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No service configs yet. Click "Add Service" to create one.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
