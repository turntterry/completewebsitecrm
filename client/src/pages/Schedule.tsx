import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Plus } from "lucide-react";
import { Link } from "wouter";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  needs_scheduling: "bg-yellow-100 text-yellow-800 border-yellow-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
};

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = addDays(weekStart, 6);

  const { data: visits = [], isLoading } = trpc.jobs.listVisits.useQuery({
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
  });

  const totalVisits = (visits as any[]).length;
  const scheduledVisits = (visits as any[]).filter((v) => v.status !== "needs_scheduling").length;
  const needsScheduling = totalVisits - scheduledVisits;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const visitsOnDay = (day: Date) =>
    (visits as any[]).filter((v) => v.scheduledStart && isSameDay(new Date(v.scheduledStart), day));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Operations</p>
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" asChild>
            <a href="/admin/jobs/new" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Job
            </a>
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 via-white to-white border-blue-100">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
            <p className="text-2xl font-bold">{scheduledVisits}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 via-white to-white border-amber-100">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Needs scheduling</p>
            <p className="text-2xl font-bold">{needsScheduling}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 via-white to-white border-slate-100">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total this week</p>
            <p className="text-2xl font-bold">{totalVisits}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {days.map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((day) => {
            const dayVisits = visitsOnDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`rounded-xl border shadow-sm ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"} p-3 min-h-32`}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {isToday && <Badge variant="outline" className="text-[11px]">Today</Badge>}
                </div>
                <div className="space-y-1.5">
                  {dayVisits.map((v: any) => (
                    <Link key={v.id} href={`/admin/jobs/${v.jobId}`}>
                      <div className={`rounded-lg border p-2 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[v.status] ?? "bg-gray-100 border-gray-200"}`}>
                        <p className="text-xs font-semibold truncate">{v.job?.customer?.firstName} {v.job?.customer?.lastName}</p>
                        {v.scheduledStart && (
                          <p className="text-xs flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(v.scheduledStart), "h:mm a")}
                          </p>
                        )}
                        {v.job?.property?.address && (
                          <p className="text-xs flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {v.job.property.address}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                  {dayVisits.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-2">No jobs</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" /> This Week's Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(visits as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No jobs scheduled this week</p>
          ) : (
            <div className="space-y-2">
              {(visits as any[]).map((v) => (
                <Link key={v.id} href={`/admin/jobs/${v.jobId}`}>
                  <div className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/30 rounded px-2 cursor-pointer transition-colors">
                    <div className="text-center w-12 shrink-0">
                      <p className="text-xs text-muted-foreground">{format(new Date(v.scheduledStart), "EEE")}</p>
                      <p className="text-sm font-bold">{format(new Date(v.scheduledStart), "d")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{v.job?.customer?.firstName} {v.job?.customer?.lastName}</p>
                      {v.job?.property?.address && (
                        <p className="text-xs text-muted-foreground truncate">{v.job.property.address}</p>
                      )}
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[v.status] ?? ""}`}>{v.status?.replace(/_/g, " ")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
