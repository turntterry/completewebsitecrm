import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Briefcase, ChevronRight, MapPin, Calendar } from "lucide-react";
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} jobs</p>
        </div>
        <Link href="/admin/jobs/new">
          <Button><Plus className="h-4 w-4 mr-1.5" /> New Job</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)} className="capitalize text-xs">
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
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
        <div className="space-y-2">
          {filtered.map((j) => (
            <Link key={j.id} href={`/admin/jobs/${j.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Job #{j.jobNumber}</p>
                        {j.title && <span className="text-sm text-muted-foreground">— {j.title}</span>}
                        <Badge className={`text-xs ${STATUS_COLORS[j.status] ?? ""}`}>{j.status?.replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground">{j.customer?.firstName} {j.customer?.lastName}</span>
                        {j.property?.address && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{j.property.address}
                          </span>
                        )}
                        {j.scheduledDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />{new Date(j.scheduledDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {j.total && <p className="font-semibold">${parseFloat(String(j.total)).toFixed(2)}</p>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
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
