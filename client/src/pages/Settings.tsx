import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Building2, Bell, Users, Save, Star, ExternalLink, Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

function CompanyTab() {
  const { data: company, isLoading } = trpc.company.get.useQuery();
  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e: any) => toast.error(e.message),
  });
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  useEffect(() => {
    if (company) reset(company);
  }, [company]);

  const onSubmit = (data: any) => updateMutation.mutate(data);

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Company Name *</Label><Input {...register("name", { required: true })} placeholder="Exterior Experts" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone")} placeholder="(931) 555-0100" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} type="email" placeholder="info@exteriorexperts.com" /></div>
          <div className="space-y-1.5"><Label>Website</Label><Input {...register("website")} placeholder="https://exteriorexperts.com" /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Input {...register("address")} placeholder="123 Main St, Cookeville, TN 38501" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoice & Quote Defaults</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Invoice Terms</Label>
            <Select onValueChange={(v) => setValue("invoiceTerms", v)} defaultValue={company?.invoiceTerms ?? "due_on_receipt"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Tax Rate (%)</Label>
            <Input {...register("defaultTaxRate")} type="number" step="0.01" placeholder="9.75" />
          </div>
          <div className="space-y-1.5">
            <Label>Quote Expiry (days)</Label>
            <Input {...register("quoteExpiryDays")} type="number" placeholder="30" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Invoice Footer / Notes</Label>
            <Textarea {...register("invoiceFooter")} rows={3} placeholder="Thank you for your business!" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

function NotificationsTab() {
  const [notifs, setNotifs] = useState({
    newQuoteEmail: true, newQuoteSms: true,
    quoteApprovedEmail: true, quoteApprovedSms: true,
    paymentEmail: true, paymentSms: true,
    jobCompletedEmail: true, jobCompletedSms: false,
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "newQuote", label: "New quote request submitted" },
            { key: "quoteApproved", label: "Client approves a quote" },
            { key: "payment", label: "Payment received" },
            { key: "jobCompleted", label: "Job completed" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="font-medium text-sm">{label}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={(notifs as any)[`${key}Email`]}
                    onCheckedChange={(v) => setNotifs((n) => ({ ...n, [`${key}Email`]: v }))}
                  />
                  <Label className="text-xs text-muted-foreground">Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={(notifs as any)[`${key}Sms`]}
                    onCheckedChange={(v) => setNotifs((n) => ({ ...n, [`${key}Sms`]: v }))}
                  />
                  <Label className="text-xs text-muted-foreground">SMS</Label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => toast.success("Notification preferences saved")}>
          <Save className="h-4 w-4 mr-1.5" /> Save Preferences
        </Button>
      </div>
    </div>
  );
}

function GoogleReviewsTab() {
  const { data: company, isLoading } = trpc.company.get.useQuery();
  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => toast.success("Google Reviews settings saved"),
    onError: (e: any) => toast.error(e.message),
  });
  const [placeId, setPlaceId] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (company) {
      setPlaceId((company as any).googlePlaceId ?? "");
      setEnabled((company as any).googleReviewsEnabled ?? false);
    }
  }, [company]);

  const handleSave = () => {
    updateMutation.mutate({ googlePlaceId: placeId, googleReviewsEnabled: enabled } as any);
  };

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> Google Reviews Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            Connect your Google Business Profile to display up to 5 recent reviews on your dashboard. This uses the Google Places API and provides read-only access.
          </div>
          <div className="space-y-1.5">
            <Label>Google Place ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. ChIJN1t_tDeuEhURRGCoGv2ousQ"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
              />
              <Button variant="outline" size="sm" asChild>
                <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Find ID
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Find your Place ID using the Google Place ID Finder tool linked above. Search for your business name.</p>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="font-medium text-sm">Enable Google Reviews on Dashboard</p>
              <p className="text-xs text-muted-foreground">Show your latest reviews on the main dashboard</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">About Google Places API</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><span className="font-medium text-foreground">What you'll see:</span> Average rating, total review count, and up to 5 most recent/helpful reviews</p>
          <p><span className="font-medium text-foreground">Limitations:</span> Google Places API only provides access to a selection of reviews (typically 5), not all reviews</p>
          <p><span className="font-medium text-foreground">Privacy:</span> Only publicly available review data is displayed</p>
          <p><span className="font-medium text-foreground">Updates:</span> Reviews are cached and refreshed when you view the dashboard</p>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">Team Management</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You are currently the only user. Team member management will be available when you are ready to add technicians or dispatchers.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => toast.info("Team management coming soon")}>
            Invite Team Member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company settings and preferences</p>
      </div>
      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />Company</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5"><Users className="h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="google-reviews" className="flex items-center gap-1.5"><Star className="h-4 w-4" />Google Reviews</TabsTrigger>
          <TabsTrigger value="instant-quotes" className="flex items-center gap-1.5"><Zap className="h-4 w-4" />Instant Quotes</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-5"><CompanyTab /></TabsContent>
        <TabsContent value="notifications" className="mt-5"><NotificationsTab /></TabsContent>
        <TabsContent value="users" className="mt-5"><UsersTab /></TabsContent>
        <TabsContent value="google-reviews" className="mt-5"><GoogleReviewsTab /></TabsContent>
        <TabsContent value="instant-quotes" className="mt-5">
          <div className="space-y-3 max-w-lg">
            <p className="text-sm text-muted-foreground">Configure the instant quote engine that powers your public quote widget.</p>
            <div className="grid gap-3">
              <Link href="/admin/quote-tool/global-settings">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Global Quote Settings</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Job minimums, expiration days, travel pricing, bundle discounts</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/admin/quote-tool/service-config">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Service Pricing Config</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Per-service base prices, sq ft rates, story multipliers</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/admin/quote-tool">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Quote Tool Builder</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure services, appearance, form fields, and deployment</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
