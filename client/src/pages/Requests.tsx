import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Phone, Mail, Zap, MapPin, DollarSign, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  follow_up: "bg-orange-100 text-orange-800",
  quoted: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-600",
};

const IQ_STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
  converted: "bg-purple-100 text-purple-800",
};

type RequestForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  source: string;
};

function InstantQuoteCard({ quote }: { quote: any }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const updateStatus = trpc.instantQuotes.updateStatus.useMutation({
    onSuccess: () => {
      utils.instantQuotes.list.invalidate();
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const services: any[] = Array.isArray(quote.services)
    ? quote.services
    : typeof quote.services === "string"
    ? JSON.parse(quote.services)
    : [];

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{quote.firstName} {quote.lastName}</p>
              <Badge className={`text-xs ${IQ_STATUS_COLORS[quote.status] ?? "bg-gray-100 text-gray-700"}`}>
                {quote.status}
              </Badge>
              <Badge variant="outline" className="text-xs">Instant Quote</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {quote.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{quote.email}</span>}
              {quote.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{quote.phone}</span>}
              {quote.address && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{quote.address}</span>}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
                <DollarSign className="h-4 w-4" />{parseFloat(quote.total || "0").toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">{services.length} service{services.length !== 1 ? "s" : ""}</span>
              {parseFloat(quote.discountPercent || "0") > 0 && (
                <span className="text-xs text-emerald-600">{quote.discountPercent}% discount applied</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="text-xs text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString()}</p>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />Details</>}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Services breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services Requested</p>
              <div className="space-y-1">
                {services.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{s.serviceName} <span className="text-gray-400">({s.sizeLabel})</span></span>
                    <span className="font-medium">${s.price}</span>
                  </div>
                ))}
                {parseFloat(quote.discountAmount || "0") > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Package Discount ({quote.discountPercent}%)</span>
                    <span>-${parseFloat(quote.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">${parseFloat(quote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Property info */}
            {(quote.squareFootage || quote.exteriorMaterial || quote.propertyType) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Property Info</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {quote.squareFootage && <span>Sq Ft: {quote.squareFootage}</span>}
                  {quote.stories && <span>Stories: {quote.stories}</span>}
                  {quote.exteriorMaterial && <span>Material: {quote.exteriorMaterial}</span>}
                  {quote.propertyType && <span>Type: {quote.propertyType}</span>}
                </div>
              </div>
            )}

            {/* Status actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(["pending", "booked", "declined", "converted"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus.mutate({ id: quote.id, status: s })}
                  disabled={quote.status === s || updateStatus.isPending}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    quote.status === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Requests() {
  const [tab, setTab] = useState<"instant" | "manual">("instant");
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();

  const { data: leads = [], isLoading: leadsLoading } = trpc.leads.list.useQuery({});
  const { data: instantQuotesList = [], isLoading: iqLoading } = trpc.instantQuotes.list.useQuery({ status: "all" });

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Request created");
    },
    onError: (e) => toast.error(e.message),
  });
  const { register, handleSubmit, reset, setValue } = useForm<RequestForm>();

  const onSubmit = (data: RequestForm) => {
    if (!data.firstName.trim()) { toast.error("First name is required"); return; }
    createMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: [data.address ? `Address: ${data.address}` : "", data.notes].filter(Boolean).join("\n\n") || undefined,
      source: data.source || "website",
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requests</h1>
          <p className="text-sm text-muted-foreground">Assessment and service requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/quote" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4" /> Customer Quote Link
            </a>
          </Button>
          <Button onClick={() => { reset(); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Request
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab("instant")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "instant" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3.5 w-3.5 inline mr-1.5" />
          Instant Quotes
          {(instantQuotesList as any[]).length > 0 && (
            <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
              {(instantQuotesList as any[]).length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "manual" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" />
          Manual Requests
          {(leads as any[]).length > 0 && (
            <span className="ml-1.5 bg-gray-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {(leads as any[]).length}
            </span>
          )}
        </button>
      </div>

      {/* Instant Quotes Tab */}
      {tab === "instant" && (
        <div className="space-y-2">
          {iqLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : (instantQuotesList as any[]).length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No instant quotes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Share your quote link with customers to start receiving instant quote requests</p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/quote" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Open Quote Tool
                </a>
              </Button>
            </CardContent></Card>
          ) : (
            (instantQuotesList as any[]).map((q) => <InstantQuoteCard key={q.id} quote={q} />)
          )}
        </div>
      )}

      {/* Manual Requests Tab */}
      {tab === "manual" && (
        <div className="space-y-2">
          {leadsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : (leads as any[]).length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No manual requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add requests from phone calls, emails, or walk-ins</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" />New Request</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {(leads as any[]).map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{r.firstName} {r.lastName}</p>
                          <Badge className={`text-xs ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-700"}`}>{r.status?.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          {r.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{r.email}</span>}
                          {r.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{r.phone}</span>}
                        </div>
                        {r.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{r.notes}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Manual Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input {...register("firstName", { required: true })} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input {...register("lastName")} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register("email")} type="email" placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="(931) 555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label>Property Address</Label>
              <Input {...register("address")} placeholder="123 Main St, Cookeville, TN" />
            </div>
            <div className="space-y-1.5">
              <Label>Lead Source</Label>
              <Select onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                <SelectContent>
                  {[
                    { value: "website", label: "Website" },
                    { value: "google", label: "Google" },
                    { value: "facebook", label: "Facebook" },
                    { value: "referral", label: "Referral" },
                    { value: "door_hanger", label: "Door Hanger" },
                    { value: "yard_sign", label: "Yard Sign" },
                    { value: "word_of_mouth", label: "Word of Mouth" },
                    { value: "other", label: "Other" },
                  ].map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} placeholder="What services are they interested in?" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
