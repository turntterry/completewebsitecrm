import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Briefcase, ChevronRight, MapPin, Calendar, Filter } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  needs_scheduling: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  invoiced: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: jobs = [], isLoading } = trpc.jobs.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter });

  const filtered = (jobs as any[]).filter((j) =>
    !search || `${j.jobNumber} ${j.customer?.firstName} ${j.customer?.lastName} ${j.title}`.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ["all", "needs_scheduling", "scheduled", "in_progress", "completed", "invoiced"];

  return (
    <div className="space-y-5">
      <div className="bg-white/90 backdrop-blur border rounded-2xl p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4 justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Operations</p>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} jobs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Link href="/admin/jobs/new">
            <Button><Plus className="h-4 w-4 mr-1.5" /> New Job</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {statuses.map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)} className="capitalize text-xs">
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No jobs found</p>
          <Link href="/admin/jobs/new"><Button className="mt-4"><Plus className="h-4 w-4 mr-1.5" />Create Job</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((j) => (
            <Link key={j.id} href={`/admin/jobs/${j.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-border/70 group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Job #{j.jobNumber}</p>
                        {j.title && <span className="text-sm text-muted-foreground">— {j.title}</span>}
                        <Badge className={`text-xs ${STATUS_COLORS[j.status] ?? ""}`}>{j.status?.replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{j.customer?.firstName} {j.customer?.lastName}</span>
                        {j.property?.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{j.property.address}
                          </span>
                        )}
                        {j.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{new Date(j.scheduledDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col gap-1">
                      {j.total && <p className="font-heading font-bold">${parseFloat(String(j.total)).toFixed(2)}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Updated {new Date(j.updatedAt || j.createdAt || Date.now()).toLocaleDateString()}</span>
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
