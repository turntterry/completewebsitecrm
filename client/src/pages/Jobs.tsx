import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Search, Building2, ChevronRight, MapPin, Calendar } from "lucide-react";
import { Link } from "wouter";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "needs_scheduling", label: "Needs Scheduling" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "invoiced", label: "Invoiced" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  needs_scheduling: "bg-amber-100 text-amber-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_ICON_BG: Record<string, string> = {
  needs_scheduling: "bg-amber-50",
  scheduled: "bg-blue-50",
  in_progress: "bg-indigo-50",
  completed: "bg-emerald-50",
  invoiced: "bg-purple-50",
  cancelled: "bg-red-50",
};

const STATUS_ICON_COLOR: Record<string, string> = {
  needs_scheduling: "text-amber-500",
  scheduled: "text-blue-500",
  in_progress: "text-indigo-500",
  completed: "text-emerald-500",
  invoiced: "text-purple-500",
  cancelled: "text-red-500",
};

function fmt(n: number | string | null | undefined) {
  const v = parseFloat(String(n ?? 0));
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtFull(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(String(n ?? 0)));
}

function groupByDate(jobs: any[]) {
  const groups: Record<string, any[]> = {};
  for (const j of jobs) {
    const d = j.scheduledDate ? new Date(j.scheduledDate) : new Date(j.createdAt || Date.now());
    const key = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(j);
  }
  return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const { data: jobs = [], isLoading } = trpc.jobs.list.useQuery({});

  const allJobs = jobs as any[];

  const tabStats = STATUS_TABS.map((tab) => {
    const items = tab.key === "all" ? allJobs : allJobs.filter((j) => j.status === tab.key);
    const total = items.reduce((sum, j) => sum + parseFloat(String(j.total ?? 0)), 0);
    return { key: tab.key, label: tab.label, count: items.length, total };
  });

  const filtered = allJobs.filter((j) => {
    const matchTab = activeTab === "all" || j.status === activeTab;
    const matchSearch =
      !search ||
      `${j.jobNumber} ${j.customer?.firstName} ${j.customer?.lastName} ${j.title ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const grouped = groupByDate(filtered);
  const activeStats = tabStats.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeStats.count} {activeStats.count === 1 ? "job" : "jobs"}
            {activeTab !== "all" && activeStats.total > 0 && ` · ${fmt(activeStats.total)}`}
          </p>
        </div>
        <Link href="/admin/jobs/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Job
          </Button>
        </Link>
      </div>

      {/* Card container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Status tabs */}
        <div className="flex items-stretch border-b border-border overflow-x-auto">
          {tabStats.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 min-w-[90px] flex flex-col items-center justify-center px-3 py-3 text-center transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span className="text-xs font-medium leading-tight">{tab.label}</span>
              <span
                className={cn(
                  "text-[11px] mt-0.5",
                  activeTab === tab.key ? "text-primary/70" : "text-muted-foreground/60"
                )}
              >
                {tab.count > 0 ? `${tab.count} · ${fmt(tab.total)}` : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search jobs…"
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
                <div className="h-9 w-9 bg-muted animate-pulse rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted animate-pulse rounded w-44" />
                  <div className="h-3 bg-muted animate-pulse rounded w-32" />
                </div>
                <div className="h-4 bg-muted animate-pulse rounded w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground">No jobs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try adjusting your search" : "Create your first job to get started"}
            </p>
            {!search && (
              <Link href="/admin/jobs/new">
                <Button size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-1.5" /> Create Job
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="px-5 py-2 bg-muted/30 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dateLabel}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {items.map((j) => (
                    <Link key={j.id} href={`/admin/jobs/${j.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                        {/* Icon */}
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            STATUS_ICON_BG[j.status] ?? "bg-gray-50"
                          )}
                        >
                          <Building2
                            className={cn(
                              "h-4 w-4",
                              STATUS_ICON_COLOR[j.status] ?? "text-gray-400"
                            )}
                          />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              Job #{j.jobNumber}
                              {j.title && (
                                <span className="font-normal text-muted-foreground"> — {j.title}</span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                                STATUS_BADGE[j.status] ?? "bg-gray-100 text-gray-600"
                              )}
                            >
                              {j.status?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {j.customer?.firstName} {j.customer?.lastName}
                            </span>
                            {j.property?.address && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[180px]">{j.property.address}</span>
                              </span>
                            )}
                            {j.scheduledDate && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {new Date(j.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        {j.total && parseFloat(String(j.total)) > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{fmtFull(j.total)}</p>
                          </div>
                        )}

                        {/* Quick schedule for unscheduled */}
                        {j.status === "needs_scheduling" && (
                          <Link
                            href={`/admin/schedule?job=${j.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Calendar className="h-3 w-3" />
                              Schedule
                            </Button>
                          </Link>
                        )}

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
