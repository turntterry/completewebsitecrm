import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Wrench } from "lucide-react";

type CatalogItem = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  unitPrice: string | null;
  taxable: boolean | null;
  active: boolean | null;
  sortOrder: number | null;
};

type FormState = {
  name: string;
  description: string;
  category: "Service" | "Product";
  unitPrice: string;
  taxable: boolean;
  active: boolean;
};

const defaultForm: FormState = {
  name: "",
  description: "",
  category: "Service",
  unitPrice: "0",
  taxable: false,
  active: true,
};

export default function ProductCatalog() {
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: items = [], isLoading } = trpc.productCatalog.list.useQuery({
    includeInactive: true,
  });

  const createMutation = trpc.productCatalog.create.useMutation({
    onSuccess: () => {
      utils.productCatalog.list.invalidate();
      toast.success("Product created");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.productCatalog.update.useMutation({
    onSuccess: () => {
      utils.productCatalog.list.invalidate();
      toast.success("Product updated");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.productCatalog.delete.useMutation({
    onSuccess: () => {
      utils.productCatalog.list.invalidate();
      toast.success("Product deleted");
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      category: (item.category as "Service" | "Product") ?? "Service",
      unitPrice: item.unitPrice ?? "0",
      taxable: item.taxable ?? false,
      active: item.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const price = parseFloat(form.unitPrice) || 0;
    if (editItem) {
      updateMutation.mutate({
        id: editItem.id,
        name: form.name,
        description: form.description,
        category: form.category,
        unitPrice: price,
        taxable: form.taxable,
        active: form.active,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        description: form.description,
        category: form.category,
        unitPrice: price,
        taxable: form.taxable,
      });
    }
  };

  const filtered = items.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  const services = filtered.filter((i) => i.category === "Service");
  const products = filtered.filter((i) => i.category === "Product");

  const fmt = (val: string | null) => {
    const n = parseFloat(val ?? "0");
    return n === 0 ? "—" : `$${n.toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products & Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} items in your catalog
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products & services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Service">Services</SelectItem>
            <SelectItem value="Product">Products</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No items found.{" "}
          <button className="text-primary underline" onClick={openCreate}>
            Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Services */}
          {services.length > 0 && (categoryFilter === "all" || categoryFilter === "Service") && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Services ({services.length})
                </h2>
              </div>
              <div className="border rounded-lg divide-y overflow-hidden bg-card">
                {services.map((item) => (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    fmt={fmt}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteConfirm(item.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Products */}
          {products.length > 0 && (categoryFilter === "all" || categoryFilter === "Product") && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Products ({products.length})
                </h2>
              </div>
              <div className="border rounded-lg divide-y overflow-hidden bg-card">
                {products.map((item) => (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    fmt={fmt}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteConfirm(item.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Product / Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. House Washing"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What's included / excluded..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as "Service" | "Product" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="taxable"
                  checked={form.taxable}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, taxable: v }))}
                />
                <Label htmlFor="taxable">Taxable</Label>
              </div>
              {editItem && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={form.active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the item from your catalog. Existing quotes and invoices
            won't be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogRow({
  item,
  fmt,
  onEdit,
  onDelete,
}: {
  item: CatalogItem;
  fmt: (v: string | null) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{item.name}</span>
          {!item.active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
          {item.taxable && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Taxable
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-foreground tabular-nums">
          {fmt(item.unitPrice)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
