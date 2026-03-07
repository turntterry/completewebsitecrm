import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Users, Briefcase, FileText, Clock, AlertCircle, ArrowRight, Star, ExternalLink, TrendingUp, ArrowUpRight,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtShort(n: number | string | null | undefined) {
  const v = parseFloat(String(n ?? 0));
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function fmtFull(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(String(n ?? 0)));
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  href,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <Card className={cn("hover:shadow-md transition-all cursor-pointer group", accent && "border-primary/20")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1.5 text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        {href && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            View details <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
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
          className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function GoogleReviewsWidget() {
  const { data: reviews } = trpc.company.getGoogleReviews.useQuery();
  const { data: company } = trpc.company.get.useQuery();
  if (!reviews || !reviews.reviews?.length) return null;
  const placeId = (company as any)?.googlePlaceId ?? "";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Google Reviews</CardTitle>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-sm">{reviews.rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({reviews.userRatingsTotal?.toLocaleString()})
              </span>
            </div>
          </div>
          {placeId && (
            <a
              href={`https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            >
              View on Google <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reviews.reviews.map((r: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
              <div className="flex items-start gap-2">
                {r.authorPhoto ? (
                  <img src={r.authorPhoto} alt={r.authorName} className="w-7 h-7 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{r.authorName?.[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{r.authorName}</p>
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={r.rating} />
                    <span className="text-[10px] text-muted-foreground">{r.relativeTime}</span>
                  </div>
                </div>
              </div>
              {r.text && <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.text}</p>}
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

  const s = stats as any;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 bg-muted animate-pulse rounded-xl" />
          <div className="h-72 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="This Month"
          value={fmtShort(s?.monthRevenue ?? 0)}
          sub="Collected"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          href="/admin/invoices"
        />
        <KpiCard
          title="Receivables"
          value={fmtShort(s?.unpaidInvoicesValue ?? 0)}
          sub={`${s?.unpaidInvoices ?? 0} outstanding`}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          href="/admin/invoices"
        />
        <KpiCard
          title="Active Jobs"
          value={s?.activeJobs ?? 0}
          sub={`${s?.upcomingVisits ?? 0} upcoming`}
          icon={Briefcase}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          href="/admin/jobs"
        />
        <KpiCard
          title="Open Quotes"
          value={s?.pendingQuotes ?? 0}
          sub={`${fmtShort(s?.pendingQuotesValue ?? 0)} value`}
          icon={FileText}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          href="/admin/quotes"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={s?.totalCustomers ?? 0}
          icon={Users}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          href="/admin/clients"
        />
        <KpiCard
          title="New Leads"
          value={s?.newLeads ?? 0}
          sub="Awaiting follow-up"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          href="/admin/leads"
        />
        {(s?.overdueInvoices ?? 0) > 0 && (
          <KpiCard
            title="Overdue"
            value={s?.overdueInvoices ?? 0}
            sub={`${fmtShort(s?.overdueInvoicesValue ?? 0)} past due`}
            icon={AlertCircle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            href="/admin/invoices"
          />
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Revenue — {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [fmtFull(v), "Revenue"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px" }}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projected income */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Upcoming Invoices</CardTitle>
            <Link href="/admin/invoices">
              <Button variant="ghost" size="sm" className="h-7 text-xs -mr-1">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!projected || (projected as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding invoices</p>
              </div>
            ) : (
              <div className="space-y-0 -mx-2">
                {(projected as any[]).slice(0, 6).map((inv) => (
                  <Link key={inv.id} href={`/admin/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">#{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {inv.dueDate
                            ? `Due ${new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : "No due date"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-bold">{fmtFull(inv.balance ?? 0)}</p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${inv.status === "past_due" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {String(inv.status).replace(/_/g, " ")}
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
      <GoogleReviewsWidget />
    </div>
  );
}
