import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Wrench, Package, Users, Truck, MoreHorizontal } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  labor: "Labor",
  materials: "Materials",
  subcontractor: "Subcontractor",
  equipment: "Equipment",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  labor: "bg-blue-100 text-blue-800",
  materials: "bg-green-100 text-green-800",
  subcontractor: "bg-purple-100 text-purple-800",
  equipment: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-700",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  labor: <Users className="h-3.5 w-3.5" />,
  materials: <Package className="h-3.5 w-3.5" />,
  subcontractor: <Wrench className="h-3.5 w-3.5" />,
  equipment: <Truck className="h-3.5 w-3.5" />,
  other: <MoreHorizontal className="h-3.5 w-3.5" />,
};

type Category = "labor" | "materials" | "subcontractor" | "equipment" | "other";

interface CostFormState {
  category: Category;
  description: string;
  amount: string;
  notes: string;
  costDate: string;
}

const emptyForm = (): CostFormState => ({
  category: "labor",
  description: "",
  amount: "",
  notes: "",
  costDate: new Date().toISOString().split("T")[0],
});

export default function JobCostingPanel({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CostFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: costs = [], isLoading: costsLoading } = trpc.jobs.listCosts.useQuery({ jobId });
  const { data: profitability, isLoading: profLoading } = trpc.jobs.getProfitability.useQuery({ jobId });

  const invalidate = () => {
    utils.jobs.listCosts.invalidate({ jobId });
    utils.jobs.getProfitability.invalidate({ jobId });
  };

  const addCost = trpc.jobs.addCost.useMutation({
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Cost added"); },
    onError: (e) => toast.error(e.message),
  });

  const updateCost = trpc.jobs.updateCost.useMutation({
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Cost updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCost = trpc.jobs.deleteCost.useMutation({
    onSuccess: () => { invalidate(); toast.success("Cost removed"); setDeletingId(null); },
    onError: (e) => toast.error(e.message),
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(cost: any) {
    setEditingId(cost.id);
    setForm({
      category: cost.category as Category,
      description: cost.description,
      amount: String(parseFloat(String(cost.amount))),
      notes: cost.notes ?? "",
      costDate: new Date(cost.costDate).toISOString().split("T")[0],
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount) {
      toast.error("Description and amount are required");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    setSaving(true);
    try {
      if (editingId !== null) {
        await updateCost.mutateAsync({
          id: editingId,
          category: form.category,
          description: form.description,
          amount: amt,
          notes: form.notes || undefined,
          costDate: form.costDate,
        });
      } else {
        await addCost.mutateAsync({
          jobId,
          category: form.category,
          description: form.description,
          amount: amt,
          notes: form.notes || undefined,
          costDate: form.costDate,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const p = profitability;
  const marginGood = p && p.margin >= 30;

  return (
    <div className="space-y-4">
      {/* Profitability Summary */}
      {p && (
        <Card className="border-0 bg-muted/40">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Revenue</p>
                <p className="text-lg font-bold text-foreground">{fmt(p.revenue)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Costs</p>
                <p className="text-lg font-bold text-foreground">{fmt(p.totalCosts)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Profit</p>
                <p className={`text-lg font-bold flex items-center gap-1 ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {p.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {fmt(p.profit)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Margin</p>
                <p className={`text-lg font-bold ${marginGood ? "text-green-600" : p.margin > 0 ? "text-yellow-600" : "text-red-600"}`}>
                  {p.margin.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(p.byCategory).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(p.byCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs bg-background rounded-md px-2 py-1 border border-border">
                    <span className="text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}:</span>
                    <span className="font-semibold">{fmt(amt as number)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Costs List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <DollarSign className="inline h-4 w-4 mr-1 -mt-0.5" />
            Job Costs
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openAdd} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Cost
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {costsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : costs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No costs recorded yet.</p>
              <p className="text-xs mt-0.5">Track labor, materials, and expenses to see profitability.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {costs.map((cost: any) => (
                <div key={cost.id} className="flex items-center gap-3 py-2.5 text-sm group">
                  <Badge
                    variant="secondary"
                    className={`shrink-0 gap-1 text-xs ${CATEGORY_COLORS[cost.category] ?? ""}`}
                  >
                    {CATEGORY_ICONS[cost.category]}
                    {CATEGORY_LABELS[cost.category] ?? cost.category}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cost.description}</p>
                    {cost.notes && <p className="text-xs text-muted-foreground truncate">{cost.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{fmt(parseFloat(String(cost.amount)))}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cost.costDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(cost)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={deletingId === cost.id}
                      onClick={() => {
                        setDeletingId(cost.id);
                        deleteCost.mutate({ id: cost.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Cost" : "Add Cost"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.costDate}
                  onChange={(e) => setForm((f) => ({ ...f, costDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Crew labor – 4 hrs"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                rows={2}
                placeholder="Any additional details..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editingId !== null ? "Save Changes" : "Add Cost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
