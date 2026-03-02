import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Phone, Mail, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  follow_up: "bg-orange-100 text-orange-800",
  quoted: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

type LeadForm = {
  firstName: string; lastName: string; email: string; phone: string;
  source: string; notes: string; status: string;
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const { data: leads = [], isLoading } = trpc.leads.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter });
  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); setShowCreate(false); toast.success("Lead created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); toast.success("Lead updated"); },
  });

  const { register, handleSubmit, reset, setValue } = useForm<LeadForm>();
  const onSubmit = (data: LeadForm) => createMutation.mutate({
    firstName: data.firstName, lastName: data.lastName || undefined,
    email: data.email || undefined, phone: data.phone || undefined,
    source: data.source || undefined, notes: data.notes || undefined,
  });

  const statuses = ["all", "new", "contacted", "follow_up", "quoted", "won", "lost"];

  return (
    <div className="space-y-5">
      <div className="bg-white/90 backdrop-blur border rounded-2xl p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4 justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline</p>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{(leads as any[]).length} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => { reset(); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Lead
          </Button>
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
      ) : (leads as any[]).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium">No leads found</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" />Add Lead</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(leads as any[]).map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-all border-border/70">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {lead.firstName?.[0]}{lead.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold leading-tight truncate">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <Badge className={`text-xs ${STATUS_COLORS[lead.status] ?? ""}`}>
                        {lead.status?.replace("_", " ")}
                      </Badge>
                      {lead.source && <Badge variant="secondary" className="text-xs">{lead.source}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    </div>
                    {lead.notes && <p className="text-xs text-muted-foreground line-clamp-2">{lead.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Select value={lead.status} onValueChange={(v) => updateMutation.mutate({ id: lead.id, status: v as any })}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["new", "contacted", "follow_up", "quoted", "won", "lost"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Last updated: {new Date(lead.updatedAt || lead.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span
                    className="flex items-center gap-1 text-primary cursor-pointer text-xs hover:underline"
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                  >
                    View <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>First Name *</Label><Input {...register("firstName", { required: true })} placeholder="Jane" /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input {...register("lastName")} placeholder="Smith" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} type="email" placeholder="name@email.com" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone")} placeholder="(931) 555-0100" /></div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select onValueChange={(v) => setValue("source", v)}>
                  <SelectTrigger><SelectValue placeholder="Lead source" /></SelectTrigger>
                  <SelectContent>
                    {["Google", "Facebook", "Referral", "Door Hanger", "Yard Sign", "Word of Mouth", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea {...register("notes")} rows={4} placeholder="Context, pain points, promises, next steps" /></div>
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Lead"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
