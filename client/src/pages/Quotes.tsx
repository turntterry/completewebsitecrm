import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

function fmt(n: number | string | null | undefined) {
  const v = parseFloat(String(n ?? 0));
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtFull(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(String(n ?? 0)));
}

function groupByDate(quotes: any[]) {
  const groups: Record<string, any[]> = {};
  for (const q of quotes) {
    const d = new Date(q.createdAt || Date.now());
    const key = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }
  return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const { data: quotes = [], isLoading } = trpc.quotes.list.useQuery({});

  const allQuotes = quotes as any[];

  const tabStats = STATUS_TABS.map((tab) => {
    const items = tab.key === "all" ? allQuotes : allQuotes.filter((q) => q.status === tab.key);
    const total = items.reduce((sum, q) => sum + parseFloat(String(q.total ?? 0)), 0);
    return { key: tab.key, label: tab.label, count: items.length, total };
  });

  const filtered = allQuotes.filter((q) => {
    const matchTab = activeTab === "all" || q.status === activeTab;
    const matchSearch = !search || `${q.quoteNumber} ${q.customer?.firstName} ${q.customer?.lastName}`.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const grouped = groupByDate(filtered);
  const activeStats = tabStats.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeStats.count} {activeStats.count === 1 ? "quote" : "quotes"}
            {activeTab !== "all" && ` · ${fmt(activeStats.total)}`}
          </p>
        </div>
        <Link href="/admin/quotes/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Quote
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-stretch border-b border-border overflow-x-auto">
          {tabStats.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 min-w-[80px] flex flex-col items-center justify-center px-3 py-3 text-center transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span className="text-xs font-medium">{tab.label}</span>
              <span className={cn("text-[11px] mt-0.5", activeTab === tab.key ? "text-primary/70" : "text-muted-foreground/60")}>
                {tab.count > 0 ? `${tab.count} · ${fmt(tab.total)}` : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search quotes…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted animate-pulse rounded w-40" />
                  <div className="h-3 bg-muted animate-pulse rounded w-24" />
                </div>
                <div className="h-4 bg-muted animate-pulse rounded w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground">No quotes found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try adjusting your search" : "Create your first quote to get started"}
            </p>
            {!search && (
              <Link href="/admin/quotes/new">
                <Button size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-1.5" /> Create Quote
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="px-5 py-2 bg-muted/30 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dateLabel}</p>
                </div>
                <div className="divide-y divide-border">
                  {items.map((q) => (
                    <Link key={q.id} href={`/admin/quotes/${q.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                        {/* Icon */}
                        <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-purple-500" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              Quote #{q.quoteNumber}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                                STATUS_BADGE[q.status] ?? "bg-gray-100 text-gray-600"
                              )}
                            >
                              {q.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {q.customer?.firstName} {q.customer?.lastName}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{fmtFull(q.total)}</p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
