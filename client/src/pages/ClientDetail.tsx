import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Briefcase, DollarSign, Calendar, MessageSquare, Sparkles } from "lucide-react";

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { data: client, isLoading } = trpc.customers.get.useQuery({ id }, { enabled: !!id });

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>;
  if (!client) return <div className="p-6"><p className="text-muted-foreground">Client not found.</p></div>;

  const c = client as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Clients</Button></Link>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{c.firstName?.[0]}{c.lastName?.[0]}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold leading-tight truncate">{c.firstName} {c.lastName}</h1>
                {c.leadSource && <Badge variant="secondary">{c.leadSource}</Badge>}
              </div>
              {c.companyName && <p className="text-sm text-muted-foreground">{c.companyName}</p>}
              <div className="flex gap-3 text-sm text-muted-foreground flex-wrap mt-1">
                {c.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{c.email}</span>}
                {c.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{c.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/quotes/new?customerId=${c.id}`}><Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />Quote</Button></Link>
            <Link href={`/admin/jobs/new?customerId=${c.id}`}><Button variant="outline" className="gap-2"><Briefcase className="h-4 w-4" />Job</Button></Link>
            <Link href={`/admin/invoices/new?customerId=${c.id}`}><Button variant="outline" className="gap-2"><DollarSign className="h-4 w-4" />Invoice</Button></Link>
            <Button variant="default" className="gap-2"><MessageSquare className="h-4 w-4" />Message</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Lifetime value", value: c.ltv ? `$${Number(c.ltv).toFixed(2)}` : "$0", icon: DollarSign },
          { label: "Open quotes", value: c.openQuotes ?? 0, icon: FileText },
          { label: "Jobs completed", value: c.jobsCompleted ?? 0, icon: Sparkles },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border-border/70">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contact</CardTitle><CardDescription>Primary ways to reach this client</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {c.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></div>}
            {c.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a></div>}
            {c.phone2 && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone2}</div>}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/70 lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Properties</CardTitle><CardDescription>Service locations on file</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(c.properties as any[] ?? []).map((p: any) => (
              <div key={p.id} className="flex items-start gap-2 text-sm rounded-lg border p-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{p.address}</p>
                  {p.city && <p className="text-muted-foreground text-xs">{p.city}, {p.state} {p.zip}</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View</Button>
              </div>
            ))}
            {(c.properties as any[] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No properties on file</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/70">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle><CardDescription>Internal only</CardDescription></CardHeader>
        <CardContent>
          {c.notes ? (
            <p className="text-sm whitespace-pre-wrap">{c.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
