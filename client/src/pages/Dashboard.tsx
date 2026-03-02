import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Users, Briefcase, FileText, TrendingUp, Clock, AlertCircle, Plus, ArrowRight, Star, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatCard({
  title, value, subtitle, icon: Icon, colorClass, href,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>; colorClass: string; href?: string;
}) {
  const inner = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${colorClass}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function GoogleReviewsWidget() {
  const { data: reviews } = trpc.company.getGoogleReviews.useQuery();
  const { data: company } = trpc.company.get.useQuery();
  if (!reviews) return null;
  const placeId = (company as any)?.googlePlaceId ?? "";
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Google Reviews</CardTitle>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-sm">{reviews.rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviews.userRatingsTotal?.toLocaleString()} reviews)</span>
            </div>
          </div>
          {placeId && (
            <a
              href={`https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              View on Google <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.reviews.map((r: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                {r.authorPhoto ? (
                  <img src={r.authorPhoto} alt={r.authorName} className="w-8 h-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{r.authorName?.[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.authorName}</p>
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={r.rating} />
                    <span className="text-xs text-muted-foreground">{r.relativeTime}</span>
                  </div>
                </div>
              </div>
              {r.text && <p className="text-xs text-muted-foreground line-clamp-3">{r.text}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const currentYear = new Date().getFullYear();
  const { data: revenueData } = trpc.dashboard.revenueByMonth.useQuery({ year: currentYear });
  const { data: projected } = trpc.dashboard.projectedIncome.useQuery();

  const chartData = MONTHS.map((month, i) => ({
    month,
    revenue: (revenueData as any[])?.find((r) => r.month === i + 1)?.total ?? 0,
  }));

  const fmt = (n: number | string | null | undefined) => { const v = parseFloat(String(n ?? 0)); return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`; };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  const s = stats as any;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/quotes">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> New Quote
            </Button>
          </Link>
          <Link href="/admin/jobs">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="This Month Revenue" value={fmt(s?.monthRevenue ?? 0)} subtitle="Payments collected" icon={DollarSign} colorClass="bg-green-500" href="/admin/invoices" />
        <StatCard title="Receivables" value={fmt(s?.unpaidInvoicesValue ?? 0)} subtitle={`${s?.unpaidInvoices ?? 0} outstanding`} icon={TrendingUp} colorClass="bg-blue-500" href="/admin/invoices" />
        <StatCard title="Active Jobs" value={s?.activeJobs ?? 0} subtitle={`${s?.upcomingVisits ?? 0} upcoming visits`} icon={Briefcase} colorClass="bg-indigo-500" href="/admin/jobs" />
        <StatCard title="Pending Quotes" value={s?.pendingQuotes ?? 0} subtitle={fmt(s?.pendingQuotesValue ?? 0) + " value"} icon={FileText} colorClass="bg-purple-500" href="/admin/quotes" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={s?.totalCustomers ?? 0} icon={Users} colorClass="bg-sky-500" href="/admin/clients" />
        <StatCard title="New Leads" value={s?.newLeads ?? 0} subtitle="Awaiting follow-up" icon={Clock} colorClass="bg-amber-500" href="/admin/leads" />
        {(s?.overdueInvoices ?? 0) > 0 && (
          <StatCard title="Overdue Invoices" value={s?.overdueInvoices ?? 0} subtitle={fmt(s?.overdueInvoicesValue ?? 0) + " past due"} icon={AlertCircle} colorClass="bg-red-500" href="/admin/invoices" />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue — {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Projected Income</CardTitle>
              <Link href="/admin/invoices">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!projected || (projected as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding invoices</p>
              </div>
            ) : (
              <div className="space-y-1">
                {(projected as any[]).slice(0, 6).map((inv) => (
                  <Link key={inv.id} href={`/admin/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/30 rounded px-1 transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-medium">#{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "No due date"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${parseFloat(String(inv.balance ?? 0)).toFixed(2)}</p>
                        <Badge variant="secondary" className={`text-xs ${inv.status === "past_due" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {String(inv.status).replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Google Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GoogleReviewsWidget />
      </div>
    </div>
  );
}
