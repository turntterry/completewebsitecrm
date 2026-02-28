import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Receipt, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  partial: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  past_due: "bg-red-100 text-red-800",
  bad_debt: "bg-red-200 text-red-900",
  void: "bg-gray-200 text-gray-500",
};

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: invoices = [], isLoading } = trpc.invoices.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter });

  const filtered = (invoices as any[]).filter((inv) =>
    !search || `${inv.invoiceNumber} ${inv.customer?.firstName} ${inv.customer?.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnpaid = filtered.filter((i) => ["sent", "partial", "past_due"].includes(i.status))
    .reduce((sum, i) => sum + parseFloat(String(i.balance ?? 0)), 0);

  const statuses = ["all", "draft", "sent", "partial", "paid", "past_due"];

  return (
    <div className="space-y-5">
      <div className="bg-white/90 backdrop-blur border rounded-2xl p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4 justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing</p>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} invoices · <span className="text-red-600 font-medium">${totalUnpaid.toFixed(2)} outstanding</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Link href="/admin/invoices/new">
            <Button><Plus className="h-4 w-4 mr-1.5" /> New Invoice</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {statuses.map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)} className="capitalize text-xs">
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No invoices found</p>
          <Link href="/admin/invoices/new"><Button className="mt-4"><Plus className="h-4 w-4 mr-1.5" />Create Invoice</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((inv) => (
            <Link key={inv.id} href={`/admin/invoices/${inv.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-border/70">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Invoice #{inv.invoiceNumber}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[inv.status] ?? ""}`}>{inv.status?.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inv.customer?.firstName} {inv.customer?.lastName}
                      </p>
                      {inv.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading font-bold">${parseFloat(String(inv.total ?? 0)).toFixed(2)}</p>
                      {parseFloat(String(inv.balance ?? 0)) > 0 && (
                        <p className="text-xs text-red-600">${parseFloat(String(inv.balance)).toFixed(2)} due</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Updated {new Date(inv.updatedAt || inv.createdAt || Date.now()).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-primary">
                      View <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
