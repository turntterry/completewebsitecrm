import { trpc } from "@/lib/trpc";
import { useParams, Link, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Send, CheckCircle, XCircle, Briefcase, Plus, Trash2, ChevronDown, ChevronUp, Check, Pencil, ExternalLink, Percent, DollarSign, Eye, EyeOff, Copy, Mail, Phone, Printer } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  changes_requested: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

type OptionItem = {
  id?: number;
  name: string;
  description: string;
  featureList: { label: string; included: boolean }[];
  quantity: string;
  unitPrice: string;
  total: string;
  isSelected?: boolean;
  sortOrder?: number;
};

type OptionSetForm = {
  id?: number;
  title: string;
  items: OptionItem[];
};

function newItem(): OptionItem {
  return { name: "", description: "", featureList: [], quantity: "1", unitPrice: "0.00", total: "0.00", isSelected: false };
}

function OptionSetEditor({
  quoteId,
  initial,
  onSave,
  onClose,
}: {
  quoteId: number;
  initial?: OptionSetForm;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<OptionSetForm>(
    initial ?? { title: "", items: [newItem()] }
  );
  const utils = trpc.useUtils();
  const saveMutation = trpc.quotes.saveOptionSet.useMutation({
    onSuccess: () => {
      utils.quotes.listOptionSets.invalidate({ quoteId });
      toast.success("Option set saved");
      onSave();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItem = (idx: number, patch: Partial<OptionItem>) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], ...patch };
      // Recalculate total
      const qty = parseFloat(items[idx].quantity || "1") || 0;
      const up = parseFloat(items[idx].unitPrice || "0") || 0;
      items[idx].total = (qty * up).toFixed(2);
      return { ...f, items };
    });
  };

  const addFeature = (idx: number) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], featureList: [...items[idx].featureList, { label: "", included: true }] };
      return { ...f, items };
    });
  };

  const updateFeature = (itemIdx: number, featIdx: number, patch: Partial<{ label: string; included: boolean }>) => {
    setForm((f) => {
      const items = [...f.items];
      const fl = [...items[itemIdx].featureList];
      fl[featIdx] = { ...fl[featIdx], ...patch };
      items[itemIdx] = { ...items[itemIdx], featureList: fl };
      return { ...f, items };
    });
  };

  const removeFeature = (itemIdx: number, featIdx: number) => {
    setForm((f) => {
      const items = [...f.items];
      items[itemIdx] = { ...items[itemIdx], featureList: items[itemIdx].featureList.filter((_, i) => i !== featIdx) };
      return { ...f, items };
    });
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Option set title is required"); return; }
    if (form.items.some((i) => !i.name.trim())) { toast.error("All option items need a name"); return; }
    saveMutation.mutate({
      quoteId,
      id: form.id,
      title: form.title,
      items: form.items.map((item, idx) => ({ ...item, sortOrder: idx })),
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{form.id ? "Edit Option Set" : "Add Option Set"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Option set title</label>
          <Input
            className="mt-1"
            placeholder='e.g. "Upgrade your window cleaning for only"'
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        {form.items.map((item, idx) => (
          <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Option {idx + 1}</span>
              {form.items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input className="mt-0.5 h-8 text-sm" placeholder="e.g. Window Cleaning (Platinum Perfection)" value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Unit Price ($)</label>
                <Input className="mt-0.5 h-8 text-sm" type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input className="mt-0.5 h-8 text-sm" type="number" step="1" min="1" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Description (optional)</label>
                <Textarea className="mt-0.5 text-sm min-h-[60px]" placeholder="Brief description..." value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
              </div>
            </div>
            {/* Feature list */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Included / Not Included Features</label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addFeature(idx)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Feature
                </Button>
              </div>
              {item.featureList.map((feat, fi) => (
                <div key={fi} className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => updateFeature(idx, fi, { included: !feat.included })}
                    className={`flex-shrink-0 w-5 h-5 rounded-sm border flex items-center justify-center text-xs ${feat.included ? "bg-green-500 border-green-500 text-white" : "bg-red-100 border-red-300 text-red-500"}`}
                  >
                    {feat.included ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  </button>
                  <Input
                    className="h-7 text-xs flex-1"
                    placeholder="Feature label"
                    value={feat.label}
                    onChange={(e) => updateFeature(idx, fi, { label: e.target.value })}
                  />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeFeature(idx, fi)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-right text-muted-foreground">Total: <span className="font-semibold text-foreground">${parseFloat(item.total).toFixed(2)}</span></p>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setForm((f) => ({ ...f, items: [...f.items, newItem()] }))}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Another Option
        </Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Option Set"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function OptionSetCard({ set, quoteId }: { set: any; quoteId: number }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.quotes.deleteOptionSet.useMutation({
    onSuccess: () => { utils.quotes.listOptionSets.invalidate({ quoteId }); toast.success("Option set removed"); },
    onError: (e) => toast.error(e.message),
  });
  const selectMutation = trpc.quotes.selectOptionItem.useMutation({
    onSuccess: () => utils.quotes.listOptionSets.invalidate({ quoteId }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      {editing && (
        <Dialog open onOpenChange={() => setEditing(false)}>
          <OptionSetEditor
            quoteId={quoteId}
            initial={{ id: set.id, title: set.title, items: set.items.map((i: any) => ({ ...i, quantity: String(i.quantity), unitPrice: String(i.unitPrice), total: String(i.total) })) }}
            onSave={() => setEditing(false)}
            onClose={() => setEditing(false)}
          />
        </Dialog>
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Option Set</p>
            <p className="font-medium text-sm">{set.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); if (confirm("Remove this option set?")) deleteMutation.mutate({ quoteId, id: set.id }); }}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {expanded && (
          <div className="divide-y divide-border">
            {set.items.map((item: any) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${item.isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/30"}`}
                onClick={() => selectMutation.mutate({ quoteId, optionSetId: set.id, itemId: item.id })}
              >
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {item.isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="font-semibold text-sm ml-4">${parseFloat(String(item.total)).toFixed(2)}</p>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  {item.featureList && item.featureList.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {item.featureList.map((f: any, fi: number) => (
                        <li key={fi} className="flex items-center gap-1.5 text-xs">
                          {f.included
                            ? <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                            : <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />}
                          <span className={f.included ? "" : "text-muted-foreground line-through"}>{f.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function QuoteDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [showOptionSetEditor, setShowOptionSetEditor] = useState(false);
  const [mode, setMode] = useState<"preview" | "view">("preview");
  const [depositValue, setDepositValue] = useState<string>("0");
  const utils = trpc.useUtils();
  const { data: quote, isLoading } = trpc.quotes.get.useQuery({ id }, { enabled: !!id && id > 0 });
  const { data: optionSets = [] } = trpc.quotes.listOptionSets.useQuery({ quoteId: id }, { enabled: !!id && id > 0 });
  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: () => { utils.quotes.get.invalidate({ id }); toast.success("Quote updated"); },
    onError: (e) => toast.error(e.message),
  });
  const acceptMutation = trpc.quotes.accept.useMutation({
    onSuccess: () => { utils.quotes.get.invalidate({ id }); toast.success("Quote accepted"); },
    onError: (e) => toast.error(e.message),
  });
  const sendPortalLink = trpc.clientHub.sendMagicLink.useMutation({
    onSuccess: (data) => toast.success(`Portal link sent to ${data.email}`),
    onError: (e) => toast.error(e.message),
  });
  const smsSend = trpc.sms.send.useMutation({
    onSuccess: () => toast.success("Text sent"),
    onError: (e) => toast.error(e.message),
  });
  const saveTotals = () => {
    updateMutation.mutate({
      id,
      depositAmount: depositValue || "0",
      taxRate: q.taxRate ?? "0",
    });
  };

  const shareLink = `${window.location.origin}/quote/${(quote as any).publicToken}`;



  useEffect(() => {
    if (quote) {
      setDepositValue(String((quote as any).depositAmount ?? "0"));
    }
  }, [quote]);

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>;
  if (!quote) return <div className="p-6"><p className="text-muted-foreground">Quote not found.</p></div>;

  const q = quote as any;
  const lineItems = q.lineItems as any[] ?? [];
  const propertyIntel = (q as any).propertyIntel ?? {};

  const totals = useMemo(() => {
    const subtotal = parseFloat(String(q.subtotal ?? 0)) || 0;
    const taxAmount = parseFloat(String(q.taxAmount ?? 0)) || 0;
    const total = parseFloat(String(q.total ?? subtotal + taxAmount)) || 0;
    const deposit = parseFloat(depositValue) || 0;
    const balance = Math.max(0, total - deposit);
    return { subtotal, taxAmount, total, deposit, balance };
  }, [q.subtotal, q.taxAmount, q.total, depositValue]);

  return (
    <div className="p-6 space-y-6">
      {showOptionSetEditor && (
        <Dialog open onOpenChange={() => setShowOptionSetEditor(false)}>
          <OptionSetEditor
            quoteId={id}
            onSave={() => setShowOptionSetEditor(false)}
            onClose={() => setShowOptionSetEditor(false)}
          />
        </Dialog>
      )}

      <div className="flex items-center gap-3">
        <Link href="/admin/quotes"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Quotes</Button></Link>
      </div>

      {/* Top bar actions & summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Quote #{q.quoteNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${STATUS_COLORS[q.status] ?? ""}`}>{q.status?.replace(/_/g, " ")}</Badge>
                <span className="text-sm text-muted-foreground">
                  {q.customer?.firstName} {q.customer?.lastName}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {q.preferredSlotLabel && (
                <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                  Preferred Slot: {q.preferredSlotLabel}
                </Badge>
              )}
              <div className="flex rounded-full border bg-muted/50 p-1">
                <Button size="sm" variant={mode === "preview" ? "default" : "ghost"} className="gap-1" onClick={() => setMode("preview")}>
                  <Eye className="h-4 w-4" /> Preview
                </Button>
                <Button size="sm" variant={mode === "view" ? "default" : "ghost"} className="gap-1" onClick={() => setMode("view")}>
                  <EyeOff className="h-4 w-4" /> Details
                </Button>
              </div>
              {q.status === "draft" && (
                <Button size="sm" onClick={() => updateMutation.mutate({ id, status: "sent" })} disabled={updateMutation.isPending}>
                  <Send className="h-4 w-4 mr-1.5" /> Send Quote
                </Button>
              )}
              {q.status === "sent" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id, status: "changes_requested" })} disabled={updateMutation.isPending}>
                    <XCircle className="h-4 w-4 mr-1.5" /> Changes Requested
                  </Button>
                  <Button size="sm" onClick={() => acceptMutation.mutate({ id })} disabled={acceptMutation.isPending}>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Mark Accepted
                  </Button>
                </>
              )}
              {q.status === "changes_requested" && (
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id, status: "sent" })} disabled={updateMutation.isPending}>
                  <Send className="h-4 w-4 mr-1.5" /> Resend
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => navigate(`/quote/${q.publicToken}`)}>
                <ExternalLink className="h-4 w-4 mr-1.5" /> Client View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  sendPortalLink.mutate({
                    quoteId: id,
                    customerId: q.customerId,
                    origin: "quote_detail",
                  })
                }
                disabled={sendPortalLink.isPending}
              >
                {sendPortalLink.isPending ? "Sending..." : "Send Portal Link"}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary / balances */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({q.taxRate ?? 0}%)</span>
              <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dashed">
              <span className="text-muted-foreground">Deposit</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  className="h-8 w-28 text-sm"
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Balance after deposit</span>
              <span className="font-semibold text-foreground">${totals.balance.toFixed(2)}</span>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={saveTotals} disabled={updateMutation.isPending}>
                Save totals
              </Button>
            </div>
            <div className="pt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast.success("Client link copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </Button>
              {q.customer?.email && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  asChild
                >
                  <a href={`mailto:${q.customer.email}?subject=Your Quote ${q.quoteNumber}&body=${encodeURIComponent(`Hi ${q.customer.firstName ?? ""},\\n\\nYou can view your quote here: ${shareLink}\\n\\nThanks!`)}`}>
                    <Mail className="h-3.5 w-3.5" /> Email Link
                  </a>
                </Button>
              )}
              {q.customer?.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() =>
                    smsSend.mutate({
                      toPhone: q.customer.phone,
                      body: `Hi ${q.customer.firstName ?? ""}, view your quote here: ${shareLink}`,
                    })
                  }
                  disabled={smsSend.isPending}
                >
                  <Phone className="h-3.5 w-3.5" /> Text Link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {mode === "preview" && (
        <Card className="shadow-sm print:border print:shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Client Preview</p>
                <h2 className="text-lg font-semibold">Exterior Experts Estimate</h2>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Quote #{q.quoteNumber}</div>
                <div>{new Date(q.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase">To</p>
                <p className="font-semibold text-foreground">
                  {q.customer?.firstName} {q.customer?.lastName}
                </p>
                {q.customer?.email && <p className="text-muted-foreground">{q.customer.email}</p>}
                {q.customer?.phone && <p className="text-muted-foreground">{q.customer.phone}</p>}
              </div>
              <div className="md:text-right">
                <p className="text-xs text-muted-foreground uppercase">Project</p>
                <p className="font-semibold text-foreground">
                  {q.property?.address ?? "Property"}{q.property?.city ? `, ${q.property.city}` : ""}
                </p>
                {q.preferredSlotLabel && (
                  <p className="text-xs text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">
                    {q.preferredSlotLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="border rounded-lg divide-y">
              {lineItems.map((li: any) => (
                <div key={li.id} className="flex justify-between p-3">
                  <div>
                    <p className="font-medium">{li.description}</p>
                    {li.details && <p className="text-xs text-muted-foreground">{li.details}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${parseFloat(String(li.total)).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">{li.quantity} × ${parseFloat(String(li.unitPrice)).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({q.taxRate ?? 0}%)</span>
                <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit</span>
                <span className="font-medium">-${totals.deposit.toFixed(2)}</span>
              </div>
              <div className="p-3 flex justify-between text-base font-bold">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              <div className="p-3 flex justify-between text-sm text-muted-foreground">
                <span>Balance after deposit</span>
                <span className="font-semibold text-foreground">${totals.balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Exterior Experts</p>
                <p>177 Webb Ave, Cookeville, TN</p>
                <p>(931) 284-2291</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print / PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quote #{q.quoteNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${STATUS_COLORS[q.status] ?? ""}`}>{q.status?.replace(/_/g, " ")}</Badge>
            <span className="text-sm text-muted-foreground">
              {q.customer?.firstName} {q.customer?.lastName}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {q.preferredSlotLabel && (
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              Preferred Slot: {q.preferredSlotLabel}
            </Badge>
          )}
          <div className="flex rounded-full border bg-muted/50 p-1">
            <Button size="sm" variant={mode === "preview" ? "default" : "ghost"} className="gap-1" onClick={() => setMode("preview")}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button size="sm" variant={mode === "view" ? "default" : "ghost"} className="gap-1" onClick={() => setMode("view")}>
              <EyeOff className="h-4 w-4" /> Details
            </Button>
          </div>
          {q.status === "draft" && (
            <Button size="sm" onClick={() => updateMutation.mutate({ id, status: "sent" })} disabled={updateMutation.isPending}>
              <Send className="h-4 w-4 mr-1.5" /> Send Quote
            </Button>
          )}
          {q.status === "sent" && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id, status: "changes_requested" })} disabled={updateMutation.isPending}>
                <XCircle className="h-4 w-4 mr-1.5" /> Changes Requested
              </Button>
              <Button size="sm" onClick={() => acceptMutation.mutate({ id })} disabled={acceptMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-1.5" /> Mark Accepted
              </Button>
            </>
          )}
          {q.status === "accepted" && (
            <Button
              size="sm"
              onClick={() =>
                navigate(
                  `/admin/jobs/new?quoteId=${id}&customerId=${q.customerId}${
                    q.preferredSlotLabel
                      ? `&preferredSlotLabel=${encodeURIComponent(q.preferredSlotLabel)}`
                      : ""
                  }`
                )
              }
            >
              <Briefcase className="h-4 w-4 mr-1.5" /> Convert to Job
            </Button>
          )}
          {!["archived", "accepted"].includes(q.status) && (
            <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id, status: "archived" })} disabled={updateMutation.isPending}>
              Archive
            </Button>
          )}
          {q.customer?.email && (
            <Button
              size="sm"
              variant="outline"
              disabled={sendPortalLink.isPending}
              onClick={() => sendPortalLink.mutate({
                customerId: q.customerId,
                quoteId: id,
                origin: window.location.origin,
              })}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {sendPortalLink.isPending ? "Sending..." : "Send to Client Portal"}
            </Button>
          )}
        </div>     </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Client</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p className="font-semibold text-foreground">
              {q.customer?.firstName} {q.customer?.lastName}
            </p>
            {q.property && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Property Address</p>
                <p className="text-muted-foreground">
                  {[q.property.address, q.property.city, q.property.state, q.property.zip].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {(propertyIntel.livingAreaSqft ||
              propertyIntel.squareFootage ||
              propertyIntel.stories ||
              propertyIntel.yearBuilt) && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Property Intel
                </p>
                <div className="text-xs space-y-0.5 text-muted-foreground">
                  {propertyIntel.livingAreaSqft || propertyIntel.squareFootage ? (
                    <div className="flex justify-between">
                      <span>Living area</span>
                      <span className="font-medium text-foreground">
                        {Math.round(
                          propertyIntel.livingAreaSqft ??
                            propertyIntel.squareFootage
                        ).toLocaleString()}{" "}
                        sqft
                      </span>
                    </div>
                  ) : null}
                  {propertyIntel.stories && (
                    <div className="flex justify-between">
                      <span>Stories</span>
                      <span className="font-medium text-foreground">
                        {propertyIntel.stories}
                      </span>
                    </div>
                  )}
                  {propertyIntel.yearBuilt && (
                    <div className="flex justify-between">
                      <span>Year built</span>
                      <span className="font-medium text-foreground">
                        {propertyIntel.yearBuilt}
                      </span>
                    </div>
                  )}
                  {(propertyIntel.roofAreaSqft || propertyIntel.drivewaySqft) && (
                    <div className="flex justify-between">
                      <span>Roof / Drive</span>
                      <span className="font-medium text-foreground">
                        {propertyIntel.roofAreaSqft
                          ? `${Math.round(
                              propertyIntel.roofAreaSqft
                            ).toLocaleString()} roof`
                          : ""}
                        {propertyIntel.roofAreaSqft && propertyIntel.drivewaySqft
                          ? " · "
                          : ""}
                        {propertyIntel.drivewaySqft
                          ? `${Math.round(
                              propertyIntel.drivewaySqft
                            ).toLocaleString()} drive`
                          : ""}
                      </span>
                    </div>
                  )}
                  {propertyIntel.source && (
                    <div className="flex justify-between">
                      <span>Source</span>
                      <span className="text-foreground">
                        {propertyIntel.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {q.customer?.phone && (
              <p className="text-muted-foreground">{q.customer.phone}</p>
            )}
            {q.customer?.email && (
              <a href={`mailto:${q.customer.email}`} className="text-blue-600 hover:underline block">
                {q.customer.email}
              </a>
            )}
            <Link href={`/admin/clients/${q.customerId}`}>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1">View Client Profile &rarr;</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Details</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-1.5 text-muted-foreground">Quote #</td>
                  <td className="py-1.5 text-right font-medium">{q.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-muted-foreground">Created</td>
                  <td className="py-1.5 text-right">{new Date(q.createdAt).toLocaleDateString()}</td>
                </tr>
                {q.sentAt && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Sent</td>
                    <td className="py-1.5 text-right">{new Date(q.sentAt).toLocaleDateString()}</td>
                  </tr>
                )}
                {q.acceptedAt && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Approved</td>
                    <td className="py-1.5 text-right">{new Date(q.acceptedAt).toLocaleDateString()}</td>
                  </tr>
                )}
                {q.expiresAt && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Expires</td>
                    <td className="py-1.5 text-right">{new Date(q.expiresAt).toLocaleDateString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Unit Price</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any) => (
                <tr key={li.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <p className="font-medium">{li.description}</p>
                    {li.details && <p className="text-xs text-muted-foreground">{li.details}</p>}
                  </td>
                  <td className="py-3 text-right">{li.quantity}</td>
                  <td className="py-3 text-right">${parseFloat(String(li.unitPrice)).toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">${parseFloat(String(li.total)).toFixed(2)}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No line items</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="pt-3 text-right font-medium">Subtotal</td><td className="pt-3 text-right font-medium">${parseFloat(String(q.subtotal ?? 0)).toFixed(2)}</td></tr>
              {parseFloat(String(q.taxAmount ?? 0)) > 0 && (
                <tr><td colSpan={3} className="text-right text-muted-foreground">Tax ({q.taxRate}%)</td><td className="text-right text-muted-foreground">${parseFloat(String(q.taxAmount)).toFixed(2)}</td></tr>
              )}
              <tr className="border-t border-border"><td colSpan={3} className="pt-2 text-right text-lg font-bold">Total</td><td className="pt-2 text-right text-lg font-bold">${parseFloat(String(q.total ?? 0)).toFixed(2)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Option Sets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Optional Add-ons / Upgrades</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Give clients upgrade options to choose from</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowOptionSetEditor(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Option Set
          </Button>
        </div>
        {(optionSets as any[]).length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">No option sets yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add upgrade options like "Platinum vs Essential window cleaning" for clients to choose from.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowOptionSetEditor(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add First Option Set
            </Button>
          </div>
        ) : (
          (optionSets as any[]).map((set) => (
            <OptionSetCard key={set.id} set={set} quoteId={id} />
          ))
        )}
      </div>

      {q.message && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Message to Client</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{q.message}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
