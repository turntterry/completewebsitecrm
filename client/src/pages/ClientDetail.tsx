import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Briefcase, DollarSign } from "lucide-react";

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { data: client, isLoading } = trpc.customers.get.useQuery({ id }, { enabled: !!id });

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>;
  if (!client) return <div className="p-6"><p className="text-muted-foreground">Client not found.</p></div>;

  const c = client as any;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Clients</Button></Link>
      </div>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{c.firstName?.[0]}{c.lastName?.[0]}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{c.firstName} {c.lastName}</h1>
          {c.companyName && <p className="text-muted-foreground">{c.companyName}</p>}
          {c.leadSource && <Badge variant="secondary" className="mt-1">{c.leadSource}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {c.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></div>}
            {c.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a></div>}
            {c.phone2 && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone2}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Properties</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(c.properties as any[] ?? []).map((p: any) => (
              <div key={p.id} className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p>{p.address}</p>
                  {p.city && <p className="text-muted-foreground">{p.city}, {p.state} {p.zip}</p>}
                </div>
              </div>
            ))}
            {(c.properties as any[] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No properties on file</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/admin/quotes/new?customerId=${c.id}`}><Button variant="outline" size="sm" className="w-full justify-start"><FileText className="h-4 w-4 mr-2" />New Quote</Button></Link>
            <Link href={`/admin/jobs/new?customerId=${c.id}`}><Button variant="outline" size="sm" className="w-full justify-start"><Briefcase className="h-4 w-4 mr-2" />New Job</Button></Link>
            <Link href={`/admin/invoices/new?customerId=${c.id}`}><Button variant="outline" size="sm" className="w-full justify-start"><DollarSign className="h-4 w-4 mr-2" />New Invoice</Button></Link>
          </CardContent>
        </Card>
      </div>

      {c.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{c.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
