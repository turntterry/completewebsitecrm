import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Briefcase, FileText, Receipt, Download } from "lucide-react";

const COLORS = ["#1e40af", "#3b82f6", "#93c5fd", "#dbeafe"];

function RevenueTab() {
  const currentYear = new Date().getFullYear();
  const { data: revenueData = [], isLoading } = trpc.dashboard.revenueByMonth.useQuery({ year: currentYear });
  const totalRevenue = (revenueData as any[]).reduce((s, d) => s + parseFloat(String(d.revenue ?? 0)), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total Revenue (12 mo)</p>
          <p className="text-3xl font-bold mt-1">${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Avg Monthly Revenue</p>
          <p className="text-3xl font-bold mt-1">${((revenueData as any[]).length > 0 ? totalRevenue / (revenueData as any[]).length : 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Best Month</p>
          <p className="text-3xl font-bold mt-1">
            {(revenueData as any[]).length > 0
              ? `$${Math.max(...(revenueData as any[]).map((d) => parseFloat(String(d.revenue ?? 0)))).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "$0"}
          </p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-64 bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData as any[]} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`$${parseFloat(String(v)).toFixed(2)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function JobsInsightsTab() {
  const { data: jobsData, isLoading } = trpc.dashboard.insightsJobs.useQuery();
  const d = jobsData as any;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">{d?.totalJobs ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Jobs</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{d?.completedJobs ?? 0}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{d?.scheduledJobs ?? 0}</p>
          <p className="text-sm text-muted-foreground">Scheduled</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">${parseFloat(String(d?.avgJobValue ?? 0)).toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Avg Job Value</p>
        </CardContent></Card>
      </div>
      {d?.byServiceType && d.byServiceType.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Jobs by Service Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={d.byServiceType} dataKey="count" nameKey="serviceType" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {d.byServiceType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeadConversionTab() {
  const { data: quotesData, isLoading } = trpc.dashboard.insightsQuotes.useQuery();
  const d = quotesData as any;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">{d?.totalQuotes ?? 0}</p>
          <p className="text-sm text-muted-foreground">Total Quotes</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{d?.acceptedQuotes ?? 0}</p>
          <p className="text-sm text-muted-foreground">Accepted</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{d?.conversionRate ?? "0"}%</p>
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">${parseFloat(String(d?.avgQuoteValue ?? 0)).toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Avg Quote Value</p>
        </CardContent></Card>
      </div>
    </div>
  );
}

function InvoicesInsightsTab() {
  const { data: invoicesData, isLoading } = trpc.dashboard.insightsInvoices.useQuery();
  const d = invoicesData as any;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">${parseFloat(String(d?.totalInvoiced ?? 0)).toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Total Invoiced</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-green-600">${parseFloat(String(d?.totalCollected ?? 0)).toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Collected</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-red-600">${parseFloat(String(d?.totalOutstanding ?? 0)).toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Outstanding</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">{d?.avgPaymentDays ?? 0} days</p>
          <p className="text-sm text-muted-foreground">Avg Payment Time</p>
        </CardContent></Card>
      </div>
      {d?.projectedIncome && (
        <Card>
          <CardHeader><CardTitle className="text-base">Projected Income</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm border-b border-border py-2">
              <span className="text-red-600">Late invoices</span>
              <span className="font-medium">${parseFloat(String(d.projectedIncome.late ?? 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-border py-2">
              <span className="text-yellow-600">Due today</span>
              <span className="font-medium">${parseFloat(String(d.projectedIncome.today ?? 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-border py-2">
              <span className="text-blue-600">Due in 7 days</span>
              <span className="font-medium">${parseFloat(String(d.projectedIncome.sevenDays ?? 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 font-bold">
              <span>Total Outstanding</span>
              <span>${parseFloat(String(d.projectedIncome.total ?? 0)).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Insights() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">Business performance analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-1.5" /> Export
        </Button>
      </div>
      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue" className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" />Revenue</TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />Jobs</TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-1.5"><FileText className="h-4 w-4" />Lead Conversion</TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1.5"><Receipt className="h-4 w-4" />Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-5"><RevenueTab /></TabsContent>
        <TabsContent value="jobs" className="mt-5"><JobsInsightsTab /></TabsContent>
        <TabsContent value="leads" className="mt-5"><LeadConversionTab /></TabsContent>
        <TabsContent value="invoices" className="mt-5"><InvoicesInsightsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
