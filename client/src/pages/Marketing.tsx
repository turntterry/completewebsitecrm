import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Star, MessageSquare, Megaphone, Users, Plus, Send, Gift, Settings, ExternalLink, CheckCircle, Mail, Copy } from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  clicked: "bg-purple-100 text-purple-800",
  reviewed: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-700",
  converted: "bg-green-100 text-green-800",
  rewarded: "bg-purple-100 text-purple-800",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.marketing.listReviewRequests.useQuery();
  const { data: settings } = trpc.marketing.getSettings.useQuery();
  const [showSend, setShowSend] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [platform, setPlatform] = useState<"google" | "facebook">("google");
  const [method, setMethod] = useState<"sms" | "email">("sms");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const { data: customers = [] } = trpc.marketing.listCustomers.useQuery({ search: "" });

  const sendMutation = trpc.marketing.sendReviewRequest.useMutation({
    onSuccess: (data) => {
      utils.marketing.listReviewRequests.invalidate();
      setShowSend(false);
      toast.success(data.smsSent ? "Review request sent via SMS!" : "Review request logged");
    },
    onError: (e) => toast.error(e.message),
  });

  const settingsMutation = trpc.marketing.updateSettings.useMutation({
    onSuccess: () => {
      utils.marketing.getSettings.invalidate();
      setShowSettings(false);
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const markMutation = trpc.marketing.markReviewRequestStatus.useMutation({
    onSuccess: () => utils.marketing.listReviewRequests.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function openSettings() {
    setGooglePlaceId(settings?.googlePlaceId ?? "");
    setGoogleEnabled(settings?.googleReviewsEnabled ?? false);
    setShowSettings(true);
  }

  const sentCount = (requests as any[]).filter((r) => r.status !== "pending").length;
  const reviewedCount = (requests as any[]).filter((r) => r.status === "reviewed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3">
          <Button onClick={() => setShowSend(true)}>
            <Send className="h-4 w-4 mr-1.5" /> Send Review Request
          </Button>
          <Button variant="outline" onClick={openSettings}>
            <Settings className="h-4 w-4 mr-1.5" /> Configure
          </Button>
        </div>
        {settings?.googleReviewLink && (
          <a href={settings.googleReviewLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Your Google Review Link
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{(requests as any[]).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Requests Sent</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{reviewedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Reviews Received</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {(requests as any[]).length > 0 ? Math.round((reviewedCount / (requests as any[]).length) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Conversion Rate</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (requests as any[]).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Star className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No review requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Send your first request to start collecting reviews</p>
          <Button className="mt-4" onClick={() => setShowSend(true)}><Send className="h-4 w-4 mr-1.5" /> Send Request</Button>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {(requests as any[]).map((r: any, i: number) => (
            <div key={r.id} className={`flex items-center gap-3 p-3 text-sm ${i < (requests as any[]).length - 1 ? "border-b" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.customerName ?? `Customer #${r.customerId}`}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.platform} · {r.method} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge className={`text-xs ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
              {r.status === "sent" && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markMutation.mutate({ id: r.id, status: "reviewed" })}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Mark Reviewed
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Send Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Send Review Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {(customers as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName} {c.phone ? `· ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Send Via</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {platform === "google" && !settings?.googlePlaceId && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">⚠ Set your Google Place ID in Configure to include a review link.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button
              disabled={!customerId || sendMutation.isPending}
              onClick={() => sendMutation.mutate({ customerId: parseInt(customerId), platform, method })}
            >
              {sendMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Review Settings</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Google Reviews</p>
                <p className="text-xs text-muted-foreground">Enable Google review requests</p>
              </div>
              <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
            </div>
            <div className="space-y-1.5">
              <Label>Google Place ID</Label>
              <Input
                placeholder="ChIJ..."
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your Place ID at{" "}
                <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google Place ID Finder ↗
                </a>
              </p>
            </div>
            {googlePlaceId && (
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Preview review link:</p>
                <p className="break-all text-blue-600">{`https://search.google.com/local/writereview?placeid=${googlePlaceId}`}</p>
                <Button size="sm" variant="ghost" className="h-6 text-xs p-0" onClick={() => {
                  navigator.clipboard.writeText(`https://search.google.com/local/writereview?placeid=${googlePlaceId}`);
                  toast.success("Copied!");
                }}>
                  <Copy className="h-3 w-3 mr-1" /> Copy Link
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={() => settingsMutation.mutate({ googlePlaceId, googleReviewsEnabled: googleEnabled })}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────
function CampaignsTab() {
  const utils = trpc.useUtils();
  const { data: campaigns = [], isLoading } = trpc.marketing.listCampaigns.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [sendConfirmId, setSendConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "sms" as "sms" | "email", subject: "", body: "" });

  const createMutation = trpc.dashboard.createCampaign.useMutation({
    onSuccess: () => {
      utils.marketing.listCampaigns.invalidate();
      utils.dashboard.campaigns.invalidate();
      setShowCreate(false);
      setForm({ name: "", type: "sms", subject: "", body: "" });
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendMutation = trpc.marketing.sendCampaign.useMutation({
    onSuccess: (data) => {
      utils.marketing.listCampaigns.invalidate();
      setSendConfirmId(null);
      toast.success(`Campaign sent to ${data.sentCount} customer${data.sentCount !== 1 ? "s" : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const SMS_VARS = ["{{firstName}}", "{{customerName}}"];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (campaigns as any[]).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No campaigns yet</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" />Create Campaign</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(campaigns as any[]).map((c: any) => (
            <div key={c.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.name}</p>
                    <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</Badge>
                    <Badge variant="outline" className="text-xs uppercase">{c.type}</Badge>
                  </div>
                  {c.subject && <p className="text-sm text-muted-foreground mt-0.5">{c.subject}</p>}
                  {c.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.body}</p>}
                  {c.sentCount > 0 && (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{c.sentCount} sent</span>
                      {c.openCount > 0 && <span>{c.openCount} opened</span>}
                      {c.clickCount > 0 && <span>{c.clickCount} clicked</span>}
                      {c.sentAt && <span>{new Date(c.sentAt).toLocaleDateString()}</span>}
                    </div>
                  )}
                </div>
                {c.status !== "sent" && (
                  <Button size="sm" onClick={() => setSendConfirmId(c.id)} disabled={!c.body}>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Send Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input placeholder="Spring Cleaning Promo" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "email" && (
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input placeholder="Email subject line" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                placeholder={form.type === "sms" ? "Hi {{firstName}}, we're offering a spring special..." : "Email body..."}
                rows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
              {form.type === "sms" && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {SMS_VARS.map((v) => (
                    <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, body: f.body + v }))}
                      className="text-xs px-2 py-0.5 rounded border border-dashed hover:border-primary hover:text-primary transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: form.name, type: form.type, subject: form.subject || undefined, body: form.body || undefined })}>
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirm */}
      <AlertDialog open={!!sendConfirmId} onOpenChange={(o) => { if (!o) setSendConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the campaign to all customers in your CRM. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendConfirmId && sendMutation.mutate({ id: sendConfirmId })} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending..." : "Send Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Referrals Tab ────────────────────────────────────────────────────────────
function ReferralsTab() {
  const utils = trpc.useUtils();
  const { data: referrals = [], isLoading } = trpc.marketing.listReferrals.useQuery();
  const { data: customers = [] } = trpc.marketing.listCustomers.useQuery({ search: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ referrerId: "", referredName: "", referredEmail: "", creditAmount: "50.00" });

  const createMutation = trpc.marketing.createReferral.useMutation({
    onSuccess: () => {
      utils.marketing.listReferrals.invalidate();
      setShowCreate(false);
      setForm({ referrerId: "", referredName: "", referredEmail: "", creditAmount: "50.00" });
      toast.success("Referral logged");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.marketing.updateReferralStatus.useMutation({
    onSuccess: () => utils.marketing.listReferrals.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const totalEarned = (referrals as any[]).filter((r) => r.status === "rewarded").reduce((s, r) => s + parseFloat(String(r.creditAmount ?? 0)), 0);
  const convertedCount = (referrals as any[]).filter((r) => r.status === "converted" || r.status === "rewarded").length;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Log Referral
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{(referrals as any[]).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Referrals</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{convertedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Converted</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{fmt(totalEarned)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Credits Rewarded</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (referrals as any[]).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Gift className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No referrals yet</p>
          <p className="text-sm text-muted-foreground mt-1">Log referrals when customers send you new business</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" />Log First Referral</Button>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {(referrals as any[]).map((r: any, i: number) => (
            <div key={r.id} className={`flex items-center gap-3 p-3 text-sm ${i < (referrals as any[]).length - 1 ? "border-b" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{r.referrerFirstName ?? `Customer #${r.referrerId}`} referred {r.referredName ?? "someone"}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  {r.creditAmount && <span>· {fmt(parseFloat(String(r.creditAmount)))} credit</span>}
                </div>
              </div>
              <Badge className={`text-xs shrink-0 ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
              <div className="flex gap-1 shrink-0">
                {r.status === "pending" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateMutation.mutate({ id: r.id, status: "converted" })}>
                    Convert
                  </Button>
                )}
                {r.status === "converted" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-600" onClick={() => updateMutation.mutate({ id: r.id, status: "rewarded" })}>
                    <Gift className="h-3 w-3 mr-1" /> Reward
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Referral</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Referring Customer</Label>
              <Select value={form.referrerId} onValueChange={(v) => setForm((f) => ({ ...f, referrerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Who referred..." /></SelectTrigger>
                <SelectContent>
                  {(customers as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Referred Person's Name</Label>
              <Input placeholder="John Smith" value={form.referredName} onChange={(e) => setForm((f) => ({ ...f, referredName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Referred Person's Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="email@example.com" value={form.referredEmail} onChange={(e) => setForm((f) => ({ ...f, referredEmail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Credit Amount ($)</Label>
              <Input type="number" min="0" step="5" value={form.creditAmount} onChange={(e) => setForm((f) => ({ ...f, creditAmount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.referrerId || createMutation.isPending}
              onClick={() => createMutation.mutate({
                referrerId: parseInt(form.referrerId),
                referredName: form.referredName || undefined,
                referredEmail: form.referredEmail || undefined,
                creditAmount: form.creditAmount,
              })}
            >
              Log Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Marketing() {
  const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
  const validTabs = ["reviews", "campaigns", "referrals"];
  const initialTab = validTabs.includes(tabFromUrl ?? "") ? (tabFromUrl as string) : "reviews";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-sm text-muted-foreground">Reviews, campaigns, and referrals</p>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="reviews" className="flex items-center gap-1.5">
            <Star className="h-4 w-4" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Referrals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-5"><ReviewsTab /></TabsContent>
        <TabsContent value="campaigns" className="mt-5"><CampaignsTab /></TabsContent>
        <TabsContent value="referrals" className="mt-5"><ReferralsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
