import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Calendar,
  Building2,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function BookingControls() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.quoteToolSettings.getSettings.useQuery();

  const [synced, setSynced] = useState(false);
  const [onlineBooking, setOnlineBooking] = useState(true);
  const [requireAdvance, setRequireAdvance] = useState(false);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [commercialRouting, setCommercialRouting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const maxServicesForInstantBooking = settings?.maxServicesForInstantBooking ?? 2;
  const blockedInstantServices = Array.isArray((settings as any)?.instantBookingBlockedServices)
    ? ((settings as any).instantBookingBlockedServices as string[])
    : [];

  if (settings && !synced) {
    setOnlineBooking(settings.onlineBookingEnabled ?? true);
    setRequireAdvance(settings.requireAdvanceBooking ?? false);
    setAdvanceDays(settings.advanceBookingDays ?? 1);
    setCommercialRouting(settings.commercialRoutingEnabled ?? false);
    setIsActive(!!(settings as any).isActive);
    setSynced(true);
  }

  const updateDeploy = trpc.quoteToolSettings.updateDeploy.useMutation({
    onSuccess: () => {
      utils.quoteToolSettings.getSettings.invalidate();
      toast.success("Booking settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const setActiveMutation = trpc.quoteToolSettings.setActive.useMutation({
    onSuccess: () => utils.quoteToolSettings.getSettings.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function saveAll(overrides?: Partial<{
    onlineBookingEnabled: boolean;
    requireAdvanceBooking: boolean;
    advanceBookingDays: number;
    commercialRoutingEnabled: boolean;
    maxServicesForInstantBooking: number;
    instantBookingBlockedServices: string[];
    maxSqftAuto: number;
    maxLinearFtAuto: number;
    maxStoriesAuto: number;
    maxWindowsAuto: number;
  }>) {
    updateDeploy.mutate({
      onlineBookingEnabled: overrides?.onlineBookingEnabled ?? onlineBooking,
      requireAdvanceBooking: overrides?.requireAdvanceBooking ?? requireAdvance,
      advanceBookingDays: overrides?.advanceBookingDays ?? advanceDays,
      commercialRoutingEnabled: overrides?.commercialRoutingEnabled ?? commercialRouting,
      maxServicesForInstantBooking:
        overrides?.maxServicesForInstantBooking ?? maxServicesForInstantBooking,
      instantBookingBlockedServices:
        overrides?.instantBookingBlockedServices ?? blockedInstantServices,
      maxSqftAuto: overrides?.maxSqftAuto ?? 5000,
      maxLinearFtAuto: overrides?.maxLinearFtAuto ?? 800,
      maxStoriesAuto: overrides?.maxStoriesAuto ?? 3,
      maxWindowsAuto: overrides?.maxWindowsAuto ?? 120,
    });
  }

  const standaloneUrl = settings?.standaloneToken
    ? `${window.location.origin}/quote/${settings.standaloneToken}`
    : null;

  function copyLink() {
    if (standaloneUrl) {
      navigator.clipboard.writeText(standaloneUrl);
      toast.success("Link copied!");
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Online Booking Controls
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your public quote tool and online booking settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quote Tool:</span>
          {isActive ? (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Live
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Quote Tool Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Quote Tool Status
          </CardTitle>
          <CardDescription>Enable or disable your public-facing instant quote tool</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Public Quote Tool Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When active, customers can get quotes via your standalone link
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

          {standaloneUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Your Quote Tool Link</Label>
                <div className="flex items-center gap-2">
                  <Input value={standaloneUrl} readOnly className="text-xs font-mono text-muted-foreground" />
                  <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(standaloneUrl, "_blank")}
                    title="Preview"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link on your website, social media, or in emails to let customers get instant quotes.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Online Booking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Online Booking
          </CardTitle>
          <CardDescription>
            Control whether customers can self-schedule during the quote flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Enable Online Booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers can pick a date and time during checkout
              </p>
            </div>
            <Switch
              checked={onlineBooking}
              onCheckedChange={(v) => {
                setOnlineBooking(v);
                saveAll({ onlineBookingEnabled: v });
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-medium ${!onlineBooking ? "text-muted-foreground" : ""}`}>
                Require Advance Notice
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prevent same-day or next-day bookings
              </p>
            </div>
            <Switch
              checked={requireAdvance}
              disabled={!onlineBooking}
              onCheckedChange={(v) => {
                setRequireAdvance(v);
                saveAll({ requireAdvanceBooking: v });
              }}
            />
          </div>

          {requireAdvance && onlineBooking && (
            <div className="ml-1 flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <Label className="text-sm shrink-0">Minimum notice:</Label>
              <Input
                type="number"
                min={1}
                max={30}
                className="w-20 h-8 text-sm"
                value={advanceDays}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                  setAdvanceDays(v);
                  saveAll({ advanceBookingDays: v });
                }}
              />
              <span className="text-sm text-muted-foreground">business days</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commercial Routing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Commercial Property Routing
          </CardTitle>
          <CardDescription>
            Automatically redirect commercial properties to a custom request flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Re-route commercial inquiries</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Commercial/industrial selections skip instant pricing and go to a request form instead
              </p>
            </div>
            <Switch
              checked={commercialRouting}
              onCheckedChange={(v) => {
                setCommercialRouting(v);
                saveAll({ commercialRoutingEnabled: v });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick link to full quote tool settings */}
      <div className="flex items-center gap-2 pt-2">
        <Link href="/admin/quote-tool">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1.5" /> Full Quote Tool Settings
          </Button>
        </Link>
        <Link href="/admin/quote-tool/service-config">
          <Button variant="outline" size="sm">
            <LinkIcon className="h-4 w-4 mr-1.5" /> Service Config
          </Button>
        </Link>
      </div>
    </div>
  );
}
