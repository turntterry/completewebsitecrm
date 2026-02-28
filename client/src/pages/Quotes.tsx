import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

export default function Quotes() {
  const [search, setSearch] = useState("");
  const { data: quotes = [], isLoading } = trpc.quotes.list.useQuery({});

  const filtered = (quotes as any[]).filter((q) =>
    !search || `${q.quoteNumber} ${q.customer?.firstName} ${q.customer?.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="bg-white/90 backdrop-blur border rounded-2xl p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4 justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline</p>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} quotes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search quotes..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Link href="/admin/quotes/new">
            <Button><Plus className="h-4 w-4 mr-1.5" /> New Quote</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No quotes found</p>
          <Link href="/admin/quotes/new"><Button className="mt-4"><Plus className="h-4 w-4 mr-1.5" />Create Quote</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((q) => (
            <Link key={q.id} href={`/admin/quotes/${q.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-border/70">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Quote #{q.quoteNumber}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[q.status] ?? ""}`}>{q.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {q.customer?.firstName} {q.customer?.lastName}
                      </p>
                      {q.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading font-bold">${parseFloat(String(q.total ?? 0)).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Last updated: {new Date(q.updatedAt || q.createdAt || Date.now()).toLocaleDateString()}</span>
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
