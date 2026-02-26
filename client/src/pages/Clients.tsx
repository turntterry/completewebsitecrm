import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Mail, MapPin, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type NewClientForm = {
  firstName: string; lastName: string; email: string; phone: string;
  propertyAddress: string; propertyCity: string; propertyState: string; propertyZip: string;
  leadSource: string;
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();
  const { data: clients = [], isLoading } = trpc.customers.list.useQuery({ search });
  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); setShowCreate(false); toast.success("Client created"); },
    onError: (e) => toast.error(e.message),
  });
  const { register, handleSubmit, reset, setValue } = useForm<NewClientForm>();
  const onSubmit = (data: NewClientForm) => createMutation.mutate({
    firstName: data.firstName, lastName: data.lastName,
    email: data.email || undefined, phone: data.phone || undefined,
    propertyAddress: data.propertyAddress || undefined, propertyCity: data.propertyCity || undefined,
    propertyState: data.propertyState || undefined, propertyZip: data.propertyZip || undefined,
    leadSource: data.leadSource || undefined,
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{(clients as any[]).length} total clients</p>
        </div>
        <Button onClick={() => { reset(); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Client
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (clients as any[]).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium">{search ? "No clients found" : "No clients yet"}</p>
          {!search && <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Client</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(clients as any[]).map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{c.firstName?.[0]}{c.lastName?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{c.firstName} {c.lastName}</p>
                        {c.leadSource && <Badge variant="secondary" className="text-xs">{c.leadSource}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {c.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.billingCity && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{c.billingCity}, {c.billingState}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First Name *</Label><Input {...register("firstName", { required: true })} placeholder="Jane" /></div>
              <div className="space-y-1.5"><Label>Last Name *</Label><Input {...register("lastName", { required: true })} placeholder="Smith" /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} type="email" placeholder="jane@example.com" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone")} placeholder="(931) 555-0100" /></div>
            <div className="space-y-1.5"><Label>Property Address</Label><Input {...register("propertyAddress")} placeholder="123 Main St" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5"><Label>City</Label><Input {...register("propertyCity")} placeholder="Cookeville" /></div>
              <div className="space-y-1.5"><Label>State</Label><Input {...register("propertyState")} placeholder="TN" /></div>
              <div className="space-y-1.5"><Label>ZIP</Label><Input {...register("propertyZip")} placeholder="38501" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Lead Source</Label>
              <Select onValueChange={(v) => setValue("leadSource", v)}>
                <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                <SelectContent>
                  {["Google", "Facebook", "Referral", "Door Hanger", "Yard Sign", "Word of Mouth", "Other"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Client"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
