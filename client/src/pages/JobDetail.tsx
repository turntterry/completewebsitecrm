import { trpc } from "@/lib/trpc";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle, PlayCircle, Camera, X } from "lucide-react";
import { toast } from "sonner";
import JobCostingPanel from "@/components/JobCostingPanel";
// ARCHIVED: JobPhotosTab depends on ExpertCam
// import JobPhotosTab from "@/components/JobPhotosTab";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  needs_scheduling: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  invoiced: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<"details" | "photos">("details");
  const [, navigate] = useLocation();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const utils = trpc.useUtils();
  const { data: job, isLoading } = trpc.jobs.get.useQuery({ id }, { enabled: !!id && id > 0 });
  const { data: jobPhotos = [] } = trpc.attachments.list.useQuery(
    { attachableType: "job", attachableId: id }, { enabled: !!id && id > 0 }
  );
  const photoCount = (jobPhotos as any[]).filter(p => !p.mimeType || p.mimeType.startsWith("image/") || p.mimeType.startsWith("video/")).length;
  const updateMutation = trpc.jobs.update.useMutation({
    onSuccess: () => { utils.jobs.get.invalidate({ id }); toast.success("Job updated"); },
  });
  const checkInMutation = trpc.jobs.checkIn.useMutation({
    onSuccess: () => { utils.jobs.get.invalidate({ id }); toast.success("Checked in!"); },
  });
  const checkOutMutation = trpc.jobs.checkOut.useMutation({
    onSuccess: () => { utils.jobs.get.invalidate({ id }); toast.success("Checked out!"); },
  });
  const createInvoiceMutation = trpc.jobs.createInvoice.useMutation({
    onSuccess: (result) => {
      utils.jobs.get.invalidate({ id });
      toast.success(`Invoice #${result.invoiceNumber} created`);
      navigate(`/admin/invoices/${result.invoiceId}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const addVisitMutation = trpc.jobs.addVisit.useMutation({
    onSuccess: () => {
      utils.jobs.get.invalidate({ id });
      setShowScheduleModal(false);
      setScheduledAt("");
      setScheduledEndAt("");
      toast.success("Job scheduled!");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>;
  if (!job) return <div className="p-6"><p className="text-muted-foreground">Job not found.</p></div>;

  const j = job as any;
  const visits = j.visits as any[] ?? [];
  const lineItems = j.lineItems as any[] ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Jobs</Button></Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job #{j.jobNumber}</h1>
          {j.title && <p className="text-muted-foreground mt-0.5">{j.title}</p>}
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STATUS_COLORS[j.status] ?? ""}>{j.status?.replace(/_/g, " ")}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(j.status === "scheduled" || j.status === "in_progress") && visits.length > 0 && (
            <a href={`/field/${visits[0].id}`}>
              <Button size="sm" variant="outline">
                📍 Field Timer
              </Button>
            </a>
          )}
          {j.status === "scheduled" && visits.length > 0 && (
            <Button size="sm" onClick={() => checkInMutation.mutate({ visitId: visits[0].id })}>
              <PlayCircle className="h-4 w-4 mr-1.5" /> Check In
            </Button>
          )}
          {j.status === "in_progress" && visits.length > 0 && (
            <Button size="sm" onClick={() => checkOutMutation.mutate({ visitId: visits[0].id, jobId: id })}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> Complete Job
            </Button>
          )}
          {j.status === "draft" && (
            <Button size="sm" onClick={() => setShowScheduleModal(true)}>
              Schedule Job
            </Button>
          )}
          {(j.status === "completed" || j.status === "requires_invoicing") && (
            <Button size="sm" variant="outline" onClick={() => createInvoiceMutation.mutate({ jobId: id })} disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
        <button
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === "photos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("photos")}
        >
          <Camera className="h-3.5 w-3.5" />
          Photos
          {photoCount > 0 && (
            <span className="ml-1 text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
              {photoCount}
            </span>
          )}
        </button>
      </div>

      {/* ARCHIVED: Photos tab depends on ExpertCam */}
      {/* {activeTab === "photos" && (
        <JobPhotosTab jobId={id} jobTitle={j.title ?? `Job #${j.jobNumber}`} />
      )} */}

      {activeTab === "details" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Client</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p className="font-semibold text-foreground">
                  {j.customer?.firstName} {j.customer?.lastName}
                </p>
                {j.property && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Property Address</p>
                    <p className="text-muted-foreground">
                      {[j.property.address, j.property.city, j.property.state, j.property.zip].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
                {j.customer?.phone && (
                  <p className="text-muted-foreground">{j.customer.phone}</p>
                )}
                {j.customer?.email && (
                  <a href={`mailto:${j.customer.email}`} className="text-blue-600 hover:underline block">
                    {j.customer.email}
                  </a>
                )}
                <Link href={`/admin/clients/${j.customerId}`}>
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
                      <td className="py-1.5 text-muted-foreground">Job #</td>
                      <td className="py-1.5 text-right font-medium">{j.jobNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Created</td>
                      <td className="py-1.5 text-right">{new Date(j.createdAt).toLocaleDateString()}</td>
                    </tr>
                    {j.visits?.[0]?.scheduledAt && (
                      <tr>
                        <td className="py-1.5 text-muted-foreground">Scheduled</td>
                        <td className="py-1.5 text-right">{new Date(j.visits[0].scheduledAt).toLocaleDateString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {lineItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Services</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Price</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li: any) => (
                      <tr key={li.id} className="border-b border-border last:border-0">
                        <td className="py-3">{li.description}</td>
                        <td className="py-3 text-right">{li.quantity}</td>
                        <td className="py-3 text-right">${parseFloat(String(li.unitPrice)).toFixed(2)}</td>
                        <td className="py-3 text-right font-medium">${parseFloat(String(li.total)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={3} className="pt-2 text-right font-bold">Total</td>
                      <td className="pt-2 text-right font-bold">${parseFloat(String(j.total ?? 0)).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}

          {visits.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Visit History</CardTitle>
                  {visits.some((v: any) => v.status === "scheduled" || v.status === "in_progress") && (
                    <a
                      href={`/field/${visits.find((v: any) => v.status === "scheduled" || v.status === "in_progress")?.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      📍 Open Field Timer
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {visits.map((v: any) => (
                  <div key={v.id} className="flex items-start gap-3 text-sm border-b border-border last:border-0 py-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {v.scheduledAt ? new Date(v.scheduledAt).toLocaleDateString() : "Unscheduled"}
                      </p>
                      {v.checkInAt && (
                        <p className="text-xs text-muted-foreground">
                          In: {new Date(v.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {v.checkInAddress && <span className="ml-1">· {v.checkInAddress}</span>}
                        </p>
                      )}
                      {v.checkOutAt && (
                        <p className="text-xs text-muted-foreground">
                          Out: {new Date(v.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {v.checkOutAddress && v.checkOutAddress !== v.checkInAddress && (
                            <span className="ml-1">· {v.checkOutAddress}</span>
                          )}
                        </p>
                      )}
                      {v.durationMinutes && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          ⏱ {Math.floor(v.durationMinutes / 60) > 0 ? `${Math.floor(v.durationMinutes / 60)}h ` : ""}
                          {v.durationMinutes % 60}m on site
                        </p>
                      )}
                      {v.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{v.notes}"</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{v.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {j.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{j.notes}</p></CardContent>
            </Card>
          )}

          {/* ── Job Costing (Phase 2B) ── */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Cost Tracking & Profitability</h2>
            <JobCostingPanel jobId={id} />
          </div>
        </>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between pb-3">
              <CardTitle>Schedule First Visit</CardTitle>
              <button onClick={() => setShowScheduleModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time (optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledEndAt}
                  onChange={(e) => setScheduledEndAt(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!scheduledAt) {
                      toast.error("Please select a start date and time");
                      return;
                    }
                    updateMutation.mutate({ id, status: "scheduled" }, {
                      onSuccess: () => {
                        addVisitMutation.mutate({
                          jobId: id,
                          scheduledAt,
                          scheduledEndAt: scheduledEndAt || undefined,
                        });
                      },
                    });
                  }}
                  disabled={updateMutation.isPending || addVisitMutation.isPending}
                >
                  {updateMutation.isPending || addVisitMutation.isPending ? "Scheduling..." : "Schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
