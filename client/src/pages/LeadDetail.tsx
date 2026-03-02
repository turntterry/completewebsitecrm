import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, Mail, FilePlus2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  new:        "bg-blue-100 text-blue-800",
  contacted:  "bg-yellow-100 text-yellow-800",
  follow_up:  "bg-orange-100 text-orange-800",
  quoted:     "bg-purple-100 text-purple-800",
  won:        "bg-green-100 text-green-800",
  lost:       "bg-red-100 text-red-800",
};

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState<string | null>(null);

  const { data: lead, isLoading } = trpc.leads.get.useQuery({ id }, {
    enabled: !!id,
    onSuccess: (data: any) => { if (notes === null) setNotes(data.notes ?? ""); },
  } as any);

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); utils.leads.get.invalidate({ id }); toast.success("Lead updated"); },
    onError: (e) => toast.error(e.message),
  });

  const saveNotes = () => {
    if (notes === null) return;
    updateMutation.mutate({ id, notes });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Lead not found.{" "}
        <Link href="/admin/leads"><span className="text-primary underline cursor-pointer">Back to Leads</span></Link>
      </div>
    );
  }

  const l = lead as any;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{l.firstName} {l.lastName}</h1>
          <p className="text-sm text-muted-foreground">Lead</p>
        </div>
        <Select
          value={l.status}
          onValueChange={(v) => updateMutation.mutate({ id, status: v as any })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["new", "contacted", "follow_up", "quoted", "won", "lost"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge className={STATUS_COLORS[l.status] ?? ""}>{l.status?.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {l.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${l.email}`} className="text-blue-600 hover:underline">{l.email}</a>
              </div>
            )}
            {l.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${l.phone}`} className="text-blue-600 hover:underline">{l.phone}</a>
              </div>
            )}
            {l.source && (
              <div className="text-sm">
                <span className="text-muted-foreground">Source: </span>
                <span className="font-medium capitalize">{l.source.replace(/_/g, " ")}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Created: </span>
              <span>{new Date(l.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {l.phone && (
              <Button className="w-full justify-start gap-2" variant="secondary" asChild>
                <a href={`tel:${l.phone}`}><Phone className="h-4 w-4" /> Call {l.firstName}</a>
              </Button>
            )}
            {l.phone && (
              <Button className="w-full justify-start gap-2" variant="outline" asChild>
                <a href={`sms:${l.phone}`}><MessageSquare className="h-4 w-4" /> Text {l.firstName}</a>
              </Button>
            )}
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => navigate(`/admin/quotes/new?firstName=${encodeURIComponent(l.firstName ?? "")}&lastName=${encodeURIComponent(l.lastName ?? "")}&phone=${encodeURIComponent(l.phone ?? "")}&email=${encodeURIComponent(l.email ?? "")}`)}
            >
              <FilePlus2 className="h-4 w-4" /> Create Quote
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes ?? l.notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Add notes about this lead…"
          />
          <div className="flex justify-end">
            <Button onClick={saveNotes} disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving…" : "Save Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
