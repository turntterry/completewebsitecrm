import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Eye, EyeOff, Percent, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type LineItem = { description: string; details: string; quantity: string; unitPrice: string; total: string };

type OptionItem = { name: string; description: string; quantity: string; unitPrice: string; total: string };
type OptionSet = { title: string; items: OptionItem[] };

function newLineItem(): LineItem {
  return { description: "", details: "", quantity: "1", unitPrice: "0.00", total: "0.00" };
}
function newOptionItem(): OptionItem {
  return { name: "", description: "", quantity: "1", unitPrice: "0.00", total: "0.00" };
}
function newOptionSet(): OptionSet {
  return { title: "", items: [newOptionItem()] };
}

function calcTotal(qty: string, price: string) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  return (q * p).toFixed(2);
}

export default function NewQuote() {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const params = new URLSearchParams(window.location.search);
  const prefilledCustomerId = params.get("customerId") ? parseInt(params.get("customerId")!) : undefined;

  const [customerId, setCustomerId] = useState<number | undefined>(prefilledCustomerId);
  const [propertyId, setPropertyId] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [depositValue, setDepositValue] = useState("0");
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);
  const [optionSets, setOptionSets] = useState<OptionSet[]>([]);
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set([0]));

  const { data: customers = [] } = trpc.customers.list.useQuery({ search: "" });
  const { data: customerDetail } = trpc.customers.get.useQuery(
    { id: customerId! },
    { enabled: !!customerId }
  );
  const { data: catalog = [] } = trpc.productCatalog.list.useQuery({ includeInactive: false });

  const properties = (customerDetail as any)?.properties ?? [];

  useEffect(() => {
    if (properties.length > 0) {
      const primary = properties.find((p: any) => p.isPrimary) ?? properties[0];
      setPropertyId(primary?.id);
    } else {
      setPropertyId(undefined);
    }
  }, [customerId, properties.length]);

  const saveOptionSetMutation = trpc.quotes.saveOptionSet.useMutation();

  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: async (quoteId) => {
      // Save option sets after quote is created
      for (const set of optionSets) {
        if (!set.title.trim() || set.items.every((i) => !i.name.trim())) continue;
        await saveOptionSetMutation.mutateAsync({
          quoteId: quoteId as number,
          title: set.title,
          items: set.items
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              description: i.description || undefined,
              quantity: i.quantity || "1",
              unitPrice: i.unitPrice || "0",
              total: i.total || "0",
            })),
        });
      }
      utils.quotes.list.invalidate();
      toast.success("Quote created");
      navigate(`/admin/quotes/${quoteId}`);
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

  const fillLineItemFromCatalog = (idx: number, catalogId: string) => {
    const item = (catalog as any[]).find((c) => c.id.toString() === catalogId);
    if (!item) return;
    setLineItems((prev) => {
      const next = [...prev];
      const price = parseFloat(item.unitPrice ?? "0").toFixed(2);
      next[idx] = {
        ...next[idx],
        description: item.name,
        details: item.description ?? "",
        unitPrice: price,
        total: calcTotal(next[idx].quantity, price),
      };
      return next;
    });
  };

  const updateOptionItem = (setIdx: number, itemIdx: number, field: keyof OptionItem, value: string) => {
    setOptionSets((prev) => {
      const next = prev.map((s, si) => {
        if (si !== setIdx) return s;
        const newItems = s.items.map((item, ii) => {
          if (ii !== itemIdx) return item;
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            const qty = field === "quantity" ? value : item.quantity;
            const price = field === "unitPrice" ? value : item.unitPrice;
            updated.total = calcTotal(qty, price);
          }
          return updated;
        });
        return { ...s, items: newItems };
      });
      return next;
    });
  };

  const fillOptionItemFromCatalog = (setIdx: number, itemIdx: number, catalogId: string) => {
    const item = (catalog as any[]).find((c) => c.id.toString() === catalogId);
    if (!item) return;
    setOptionSets((prev) => {
      const next = prev.map((s, si) => {
        if (si !== setIdx) return s;
        const newItems = s.items.map((oi, ii) => {
          if (ii !== itemIdx) return oi;
          const price = parseFloat(item.unitPrice ?? "0").toFixed(2);
          return {
            ...oi,
            name: item.name,
            description: item.description ?? "",
            unitPrice: price,
            total: calcTotal(oi.quantity, price),
          };
        });
        return { ...s, items: newItems };
      });
      return next;
    });
  };

  const subtotal = lineItems.reduce((s, li) => s + parseFloat(li.total || "0"), 0);
  const discount =
    discountType === "percent"
      ? subtotal * (parseFloat(discountValue) / 100 || 0)
      : parseFloat(discountValue) || 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = taxableBase * (parseFloat(taxRate) / 100);
  const total = Math.max(0, taxableBase + tax);
  const deposit = parseFloat(depositValue) || 0;
  const balanceDue = Math.max(0, total - deposit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error("Please select a client"); return; }
    if (lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item"); return;
    }
    const preparedLineItems = lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description,
        details: li.details || undefined,
        quantity: li.quantity || "1",
        unitPrice: li.unitPrice || "0",
        total: li.total || "0",
      }));
    if (discount > 0) {
      preparedLineItems.push({
        description: "Discount",
        details: discountType === "percent" ? `${discountValue}% off` : undefined,
        quantity: "1",
        unitPrice: (-discount).toFixed(2),
        total: (-discount).toFixed(2),
      });
    }
    createMutation.mutate({
      customerId,
      propertyId: propertyId || undefined,
      title: title || undefined,
      message: message || undefined,
      internalNotes: internalNotes || undefined,
      taxRate: taxRate || "0",
      depositAmount: depositValue || undefined,
      lineItems: preparedLineItems,
    });
  };

  const toggleSet = (idx: number) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const clientName = customers.find((c: any) => c.id === customerId);
  const propertyDisplay =
    properties.find((p: any) => p.id === propertyId)?.address ??
    properties[0]?.address;

  const previewLines = lineItems.filter(li => li.description.trim());
  if (discount > 0) {
    previewLines.push({
      description: "Discount",
      details: discountType === "percent" ? `${discountValue}%` : "",
      quantity: "1",
      unitPrice: (-discount).toFixed(2),
      total: (-discount).toFixed(2),
    });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotes">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Quotes</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">New Quote</h1>
            <p className="text-sm text-muted-foreground">Build and preview before sending</p>
          </div>
        </div>
        <div className="flex rounded-full border bg-muted/50 p-1 gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "edit" ? "default" : "ghost"}
            onClick={() => setMode("edit")}
            className="gap-1"
          >
            <EyeOff className="h-4 w-4" /> Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "preview" ? "default" : "ghost"}
            onClick={() => setMode("preview")}
            className="gap-1"
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
            <div className="space-y-1.5">
              <Label>Quote Title (optional)</Label>
              <Input placeholder="e.g. House Washing + Driveway Cleaning" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Products & Services</CardTitle>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setLineItems((p) => [...p, newLineItem()])}>
                <Plus className="h-4 w-4 mr-1.5" />Quick add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((li, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                {/* Service picker from catalog */}
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Select value="" onValueChange={(v) => fillLineItemFromCatalog(idx, v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pick from catalog..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(catalog as any[]).map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                            {parseFloat(c.unitPrice ?? "0") > 0 && ` — $${parseFloat(c.unitPrice).toFixed(2)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Or type a custom description..."
                      value={li.description}
                      onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
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
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
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
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-9 flex items-center px-2 bg-background border rounded-md text-sm font-medium">
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
                <div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Additional details / description (optional)..."
                    value={li.details}
                    onChange={(e) => updateLineItem(idx, "details", e.target.value)}
                  />
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 text-xs w-20"
                      type="number"
                      min="0"
                      step="0.5"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDiscountType(discountType === "percent" ? "amount" : "percent")}
                    >
                      {discountType === "percent" ? <Percent className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <span className="font-medium">-${discount.toFixed(2)}</span>
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
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Deposit</span>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      className="h-7 text-xs pl-5"
                      type="number"
                      min="0"
                      step="0.5"
                      value={depositValue}
                      onChange={(e) => setDepositValue(e.target.value)}
                    />
                  </div>
                </div>
                <span className="font-medium">-${deposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Balance due after deposit</span>
                <span className="font-semibold text-foreground">${balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Add-Ons / Upgrades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Optional Add-Ons / Upgrades</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Give clients upgrade options to choose from</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const newIdx = optionSets.length;
                setOptionSets((p) => [...p, newOptionSet()]);
                setExpandedSets((prev) => new Set([...Array.from(prev), newIdx]));
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />Add Option Set
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionSets.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                No add-ons yet.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setOptionSets([newOptionSet()]);
                    setExpandedSets(new Set([0]));
                  }}
                >
                  Add your first option set
                </button>
              </div>
            ) : (
              optionSets.map((set, setIdx) => (
                <div key={setIdx} className="border rounded-lg overflow-hidden">
                  {/* Option Set Header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      className="h-8 text-sm font-medium flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 px-0"
                      placeholder="Option set title (e.g. Add window cleaning)"
                      value={set.title}
                      onChange={(e) =>
                        setOptionSets((prev) =>
                          prev.map((s, i) => (i === setIdx ? { ...s, title: e.target.value } : s))
                        )
                      }
                    />
                    <Badge variant="secondary" className="text-xs shrink-0">Optional</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleSet(setIdx)}
                    >
                      {expandedSets.has(setIdx) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setOptionSets((p) => p.filter((_, i) => i !== setIdx));
                        setExpandedSets((prev) => {
                          const next = new Set<number>();
                          prev.forEach((v) => { if (v < setIdx) next.add(v); else if (v > setIdx) next.add(v - 1); });
                          return next;
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Option Items */}
                  {expandedSets.has(setIdx) && (
                    <div className="p-3 space-y-3">
                      {set.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="border rounded-md p-3 space-y-2 bg-background">
                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-12 md:col-span-6 space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Item Name</Label>
                              <Select value="" onValueChange={(v) => fillOptionItemFromCatalog(setIdx, itemIdx, v)}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Pick from catalog..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {(catalog as any[]).map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                      {c.name}
                                      {parseFloat(c.unitPrice ?? "0") > 0 && ` — $${parseFloat(c.unitPrice).toFixed(2)}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-8 text-sm"
                                placeholder="Or type a custom name..."
                                value={item.name}
                                onChange={(e) => updateOptionItem(setIdx, itemIdx, "name", e.target.value)}
                              />
                            </div>
                            <div className="col-span-4 md:col-span-2 space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Qty</Label>
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => updateOptionItem(setIdx, itemIdx, "quantity", e.target.value)}
                              />
                            </div>
                            <div className="col-span-4 md:col-span-2 space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Unit Price</Label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                <Input
                                  className="h-8 text-sm pl-6"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateOptionItem(setIdx, itemIdx, "unitPrice", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="col-span-3 md:col-span-1 space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Total</Label>
                              <div className="h-8 flex items-center px-2 bg-muted/40 border rounded-md text-sm font-medium">
                                ${item.total}
                              </div>
                            </div>
                            <div className="col-span-1 flex items-end pb-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  setOptionSets((prev) =>
                                    prev.map((s, si) =>
                                      si !== setIdx
                                        ? s
                                        : { ...s, items: s.items.filter((_, ii) => ii !== itemIdx) }
                                    )
                                  )
                                }
                                disabled={set.items.length === 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            className="text-xs resize-none"
                            placeholder="Item description (optional)..."
                            rows={2}
                            value={item.description}
                            onChange={(e) => updateOptionItem(setIdx, itemIdx, "description", e.target.value)}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full border border-dashed"
                        onClick={() =>
                          setOptionSets((prev) =>
                            prev.map((s, si) =>
                              si !== setIdx ? s : { ...s, items: [...s.items, newOptionItem()] }
                            )
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />Add Item to this Set
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client Message</Label>
              <Textarea
                placeholder="Message that appears on the quote sent to the client..."
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
          <Link href="/admin/quotes"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={createMutation.isPending || saveOptionSetMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Quote"}
          </Button>
        </div>
        </div>

        {/* Summary / Preview column */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount</span>
                  <span className="font-medium text-destructive">-${discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deposit</span>
                  <span className="font-medium">-${deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance due</span>
                  <span className="font-semibold text-primary">${balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {mode === "preview" ? "Preview" : "Next Steps"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === "preview" ? (
                <div className="space-y-3 text-sm">
                  <div className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</span>
                      <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="text-base font-semibold">
                      {clientName ? `${clientName.firstName} ${clientName.lastName}` : "Client"} {propertyDisplay ? `· ${propertyDisplay}` : ""}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 bg-white shadow-sm divide-y">
                    {previewLines.map((li, idx) => (
                      <div key={idx} className="flex justify-between py-2 first:pt-0 last:pb-0">
                        <div>
                          <div className="font-medium">{li.description}</div>
                          {li.details && <div className="text-xs text-muted-foreground">{li.details}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${li.total}</div>
                          <div className="text-[11px] text-muted-foreground">{li.quantity} × ${li.unitPrice}</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 text-sm font-semibold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Balance due after deposit</span>
                      <span className="font-semibold text-foreground">${balanceDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Switch to Preview to see the client-facing layout.</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                >
                  {mode === "edit" ? "Preview" : "Back to Edit"}
                </Button>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || saveOptionSetMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Quote"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
