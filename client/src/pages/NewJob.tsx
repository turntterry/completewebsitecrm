import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const SERVICES = [
  "House Washing", "Roof Washing", "Driveway Cleaning", "Deck/Patio Cleaning",
  "Window Cleaning", "Gutter Cleaning", "Fence Washing", "Commercial Washing",
];

export default function NewJob() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const params = new URLSearchParams(window.location.search);
  const prefilledCustomerId = params.get("customerId") ? parseInt(params.get("customerId")!) : undefined;
  const preferredSlotLabel = params.get("preferredSlotLabel") || "";
  const quoteId = params.get("quoteId") ? parseInt(params.get("quoteId")!) : undefined;

  const [customerId, setCustomerId] = useState<number | undefined>(prefilledCustomerId);
  const [propertyId, setPropertyId] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [scheduleNow, setScheduleNow] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const [quoteLineItems, setQuoteLineItems] = useState<any[]>([]);

  const { data: customers = [] } = trpc.customers.list.useQuery({ search: "" });
  const { data: customerDetail } = trpc.customers.get.useQuery(
    { id: customerId! },
    { enabled: !!customerId }
  );
  const { data: quoteData } = trpc.quotes.get.useQuery(
    { id: quoteId! },
    { enabled: !!quoteId }
  );

  const properties = (customerDetail as any)?.properties ?? [];

  useEffect(() => {
    if (properties.length > 0) {
      const primary = properties.find((p: any) => p.isPrimary) ?? properties[0];
      setPropertyId(primary?.id);
    } else {
      setPropertyId(undefined);
    }
  }, [customerId, properties.length]);

  // Load quote line items and auto-generate title
  useEffect(() => {
    if (quoteData && (quoteData as any).lineItems) {
      const items = (quoteData as any).lineItems || [];
      setQuoteLineItems(items);

      // Auto-generate job title from line items if not already set
      if (!title && items.length > 0) {
        const serviceNames = items.map((item: any) => item.description).join(", ");
        setTitle(serviceNames);
      }
    }
  }, [quoteData, title]);

  // Prefill from preferred slot if provided
  useEffect(() => {
    if (preferredSlotLabel && !instructions) {
      setInstructions(`Customer preferred slot: ${preferredSlotLabel}`);
    }
    if (preferredSlotLabel && !scheduledAt) {
      const [datePart, windowPart] = preferredSlotLabel.split(" · ");
      if (datePart && windowPart && windowPart.includes("-")) {
        const [start, end] = windowPart.split("-");
        const parsedDate = new Date(datePart);
        if (!isNaN(parsedDate.getTime())) {
          const isoDate = parsedDate.toISOString().split("T")[0];
          setScheduledAt(`${isoDate}T${start}`);
          setScheduledEndAt(`${isoDate}T${end}`);
          setScheduleNow(true);
        }
      }
    }
  }, [preferredSlotLabel, instructions, scheduledAt]);

  const createMutation = trpc.jobs.create.useMutation({
    onSuccess: (id) => {
      utils.jobs.list.invalidate();
      toast.success("Job created");
      navigate(`/admin/jobs/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error("Please select a client"); return; }
    createMutation.mutate({
      customerId,
      propertyId: propertyId || undefined,
      title: title || undefined,
      instructions: instructions || undefined,
      internalNotes: internalNotes || undefined,
      scheduledAt: scheduleNow && scheduledAt ? scheduledAt : undefined,
      scheduledEndAt: scheduleNow && scheduledEndAt ? scheduledEndAt : undefined,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/jobs">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Jobs</Button>
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">New Job</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a job for a client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Property */}
        <Card>
          <CardHeader><CardTitle className="text-base">Client & Property</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={customerId?.toString() ?? ""} onValueChange={(v) => { setCustomerId(parseInt(v)); setPropertyId(undefined); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers as any[]).map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                        {c.phone && ` · ${c.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Property</Label>
                <Select
                  value={propertyId?.toString() ?? ""}
                  onValueChange={(v) => setPropertyId(parseInt(v))}
                  disabled={!customerId || properties.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={properties.length === 0 ? "No properties on file" : "Select property..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.address}{p.city ? `, ${p.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Services (if converting from quote) */}
        {quoteLineItems.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader><CardTitle className="text-base text-blue-900">Services from Quote</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quoteLineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start p-2 bg-white rounded border border-blue-100">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.description}</p>
                      {item.details && <p className="text-xs text-gray-600 mt-1">{item.details}</p>}
                    </div>
                    <p className="font-medium text-sm ml-4">${item.total}</p>
                  </div>
                ))}
                <p className="text-xs text-blue-700 mt-3 pt-2 border-t border-blue-200">
                  Services have been auto-populated from the quote. Edit the job title below if needed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Or type a custom title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client Instructions</Label>
              <Textarea
                placeholder="Instructions visible to the technician and client..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Private notes — not visible to the client..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Schedule First Visit</CardTitle>
              <Switch checked={scheduleNow} onCheckedChange={setScheduleNow} />
            </div>
          </CardHeader>
          {scheduleNow && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledEndAt}
                    onChange={(e) => setScheduledEndAt(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/jobs"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}
