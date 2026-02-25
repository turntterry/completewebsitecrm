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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} quotes</p>
        </div>
        <Link href="/admin/quotes/new">
          <Button><Plus className="h-4 w-4 mr-1.5" /> New Quote</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quotes..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <div className="space-y-2">
          {filtered.map((q) => (
            <Link key={q.id} href={`/admin/quotes/${q.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Quote #{q.quoteNumber}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[q.status] ?? ""}`}>{q.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {q.customer?.firstName} {q.customer?.lastName}
                        {q.createdAt && ` · ${new Date(q.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">${parseFloat(String(q.total ?? 0)).toFixed(2)}</p>
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
