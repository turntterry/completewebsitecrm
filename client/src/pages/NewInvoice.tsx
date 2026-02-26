import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type LineItem = { description: string; quantity: string; unitPrice: string; total: string };

const SERVICES = [
  "House Washing", "Roof Washing", "Driveway Cleaning", "Deck/Patio Cleaning",
  "Window Cleaning", "Gutter Cleaning", "Fence Washing", "Commercial Washing",
];

function newLineItem(): LineItem {
  return { description: "", quantity: "1", unitPrice: "0.00", total: "0.00" };
}

function calcTotal(qty: string, price: string) {
  return ((parseFloat(qty) || 0) * (parseFloat(price) || 0)).toFixed(2);
}

export default function NewInvoice() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const params = new URLSearchParams(window.location.search);
  const prefilledCustomerId = params.get("customerId") ? parseInt(params.get("customerId")!) : undefined;
  const prefilledJobId = params.get("jobId") ? parseInt(params.get("jobId")!) : undefined;

  const [customerId, setCustomerId] = useState<number | undefined>(prefilledCustomerId);
  const [jobId, setJobId] = useState<number | undefined>(prefilledJobId);
  const [message, setMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);

  const { data: customers = [] } = trpc.customers.list.useQuery({ search: "" });
  const { data: jobs = [] } = trpc.jobs.list.useQuery(
    { status: undefined },
    { enabled: !!customerId }
  );

  // Filter jobs to the selected customer
  const customerJobs = (jobs as any[]).filter((j) => j.customerId === customerId && j.status !== "invoiced");

  // Auto-set job when prefilled
  useEffect(() => {
    if (prefilledJobId) setJobId(prefilledJobId);
  }, [prefilledJobId]);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: (id) => {
      utils.invoices.list.invalidate();
      toast.success("Invoice created");
      navigate(`/admin/invoices/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateLineItem = (idx: number, field: keyof LineItem, value: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? value : next[idx].quantity;
        const price = field === "unitPrice" ? value : next[idx].unitPrice;
        next[idx].total = calcTotal(qty, price);
      }
      return next;
    });
  };

  const subtotal = lineItems.reduce((s, li) => s + parseFloat(li.total || "0"), 0);
  const tax = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error("Please select a client"); return; }
    if (lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item"); return;
    }
    createMutation.mutate({
      customerId,
      jobId: jobId || undefined,
      message: message || undefined,
      internalNotes: internalNotes || undefined,
      taxRate: taxRate || "0",
      dueDate: dueDate || undefined,
      lineItems: lineItems
        .filter((li) => li.description.trim())
        .map((li) => ({
          description: li.description,
          quantity: li.quantity || "1",
          unitPrice: li.unitPrice || "0",
          total: li.total || "0",
        })),
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/invoices">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Invoices</Button>
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Create an invoice for a client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Job */}
        <Card>
          <CardHeader><CardTitle className="text-base">Client & Job</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={customerId?.toString() ?? ""} onValueChange={(v) => { setCustomerId(parseInt(v)); setJobId(undefined); }}>
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
                <Label>Link to Job (optional)</Label>
                <Select
                  value={jobId?.toString() ?? "none"}
                  onValueChange={(v) => setJobId(v === "none" ? undefined : parseInt(v))}
                  disabled={!customerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No job linked</SelectItem>
                    {customerJobs.map((j: any) => (
                      <SelectItem key={j.id} value={j.id.toString()}>
                        #{j.jobNumber} — {j.title ?? "Untitled Job"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="max-w-xs" />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setLineItems((p) => [...p, newLineItem()])}>
              <Plus className="h-4 w-4 mr-1.5" />Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/40 rounded-lg">
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Select value={li.description} onValueChange={(v) => updateLineItem(idx, "description", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Custom description..."
                    value={li.description}
                    onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-1.5">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    className="h-9 text-sm"
                    type="number"
                    min="1"
                    step="1"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-1.5">
                  <Label className="text-xs">Unit Price</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="h-9 text-sm pl-6"
                      type="number"
                      min="0"
                      step="0.01"
                      value={li.unitPrice}
                      onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-span-3 md:col-span-1 space-y-1.5">
                  <Label className="text-xs">Total</Label>
                  <div className="h-9 flex items-center px-3 bg-background border rounded-md text-sm font-medium">
                    ${li.total}
                  </div>
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => setLineItems((p) => p.filter((_, i) => i !== idx))}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax</span>
                  <div className="relative w-20">
                    <Input
                      className="h-7 text-xs pr-5"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client Message</Label>
              <Textarea
                placeholder="Message that appears on the invoice sent to the client..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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

        <div className="flex gap-3 justify-end">
          <Link href="/admin/invoices"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
