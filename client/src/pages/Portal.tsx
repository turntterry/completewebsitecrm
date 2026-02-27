import { useMemo, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  CreditCard,
  Home,
  AlertCircle,
  ExternalLink,
  Copy,
  Clock3,
  CalendarDays,
  Sparkles,
} from "lucide-react";

// ─── Session helpers (share key with ClientHub magic link) ───────────────────

interface ClientSession {
  customerId: number;
  companyId: number;
  quoteId: number | null;
  invoiceId: number | null;
  sessionToken: string;
  sessionExpires: string;
}

const SESSION_KEY = "exterior_client_hub_session";

function saveSession(session: ClientSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ClientSession;
    if (new Date(s.sessionExpires) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function parseIds() {
  const params = new URLSearchParams(window.location.search);
  const customerId = Number(params.get("customerId"));
  const companyId = Number(params.get("companyId"));
  return {
    customerId: Number.isFinite(customerId) ? customerId : null,
    companyId: Number.isFinite(companyId) ? companyId : null,
  };
}

function StatusPill({ tone, label }: { tone: "success" | "info" | "warn" | "muted"; label: string }) {
  const palette =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : tone === "info"
          ? "bg-blue-100 text-blue-700 border-blue-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${palette}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export default function Portal() {
  const { customerId: debugCustomerId, companyId: debugCompanyId } = useMemo(parseIds, []);

  const [session, setSession] = useState<ClientSession | null>(() => loadSession());
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), []);

  const snapshot = trpc.portal.getSnapshot.useQuery(
    {
      customerId: (session?.customerId ?? debugCustomerId) || 0,
      companyId: (session?.companyId ?? debugCompanyId) || 0,
      limit: 50,
    },
    {
      enabled:
        !!(session?.customerId && session.companyId) ||
        (!!debugCustomerId && !!debugCompanyId),
    }
  );

  const utils = trpc.useUtils();
  const approve = trpc.portal.approveQuote.useMutation({
    onSuccess: () => utils.portal.getSnapshot.invalidate(),
  });
  const pay = trpc.portal.payInvoice.useMutation({
    onSuccess: () => utils.portal.getSnapshot.invalidate(),
    onError: err => {
      setApiError(err.message || "Payment failed.");
      if (payingInvoiceId) {
        setPayNotices(n => ({
          ...n,
          [payingInvoiceId]: {
            type: "error",
            message: err.message || "Payment failed. Please try again.",
          },
        }));
        setPayingInvoiceId(null);
      }
    },
  });
  const requestWork = trpc.portal.requestWork.useMutation();

  const validateToken = trpc.clientHub.validateToken.useMutation({
    onSuccess: data => {
      const s: ClientSession = {
        customerId: data.customerId,
        companyId: data.companyId,
        quoteId: data.quoteId,
        invoiceId: data.invoiceId,
        sessionToken: data.sessionToken,
        sessionExpires: data.sessionExpires,
      };
      saveSession(s);
      setSession(s);
      // strip token from URL
      window.history.replaceState({}, "", "/portal");
    },
  });

  useEffect(() => {
    if (token) {
      validateToken.mutate({ token });
    }
  }, [token, validateToken]);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    window.history.replaceState({}, "", "/portal");
  }, []);

  const [requestMessage, setRequestMessage] = useState("");
  const [requestServices, setRequestServices] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [payAmounts, setPayAmounts] = useState<Record<number, string>>({});
  const [payNotices, setPayNotices] = useState<
    Record<number, { type: "success" | "error" | "action"; message: string; url?: string | null }>
  >({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (pay.data && payingInvoiceId) {
      if (pay.data.requiresAction && (pay.data.paymentUrl || pay.data.clientSecret)) {
        setPayNotices(n => ({
          ...n,
          [payingInvoiceId]: {
            type: "action",
            message: "Continue payment to complete checkout.",
            url: pay.data.paymentUrl ?? null,
          },
        }));
        if (pay.data.paymentUrl) window.open(pay.data.paymentUrl, "_blank");
      } else if (pay.data.remainingBalance !== undefined) {
        setPayNotices(n => ({
          ...n,
          [payingInvoiceId]: {
            type: "success",
            message: `Payment recorded. Remaining balance: $${pay.data.remainingBalance?.toFixed?.(2) ?? pay.data.remainingBalance}`,
          },
        }));
        setPayAmounts(a => ({
          ...a,
          [payingInvoiceId]: String(pay.data.remainingBalance ?? "0.00"),
        }));
      }
      setPayingInvoiceId(null);
    }
  }, [pay.data, payingInvoiceId]);

  const resolvedCustomerId = session?.customerId ?? debugCustomerId ?? 0;
  const resolvedCompanyId = session?.companyId ?? debugCompanyId ?? 0;

  const sortedQuotes = [...(snapshot.data?.quotes ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime()
  );
  const sortedInvoices = [...(snapshot.data?.invoices ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime()
  );
  const openInvoices = sortedInvoices.filter(inv => parseFloat(String(inv.balance ?? inv.total ?? 0)) > 0);
  const upcomingVisits = (snapshot.data?.visits ?? []).filter(v => v.status !== "completed");

  const quoteStatusTone = (status: string) => {
    if (status === "accepted") return "success";
    if (status === "sent" || status === "draft") return "info";
    if (status === "changes_requested" || status === "expired") return "warn";
    return "muted";
  };

  const invoiceStatusTone = (status: string) => {
    if (status === "paid") return "success";
    if (status === "past_due") return "warn";
    if (status === "sent" || status === "upcoming") return "info";
    return "muted";
  };

  // Magic-link validation in progress
  if (validateToken.isPending) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // No session, no debug IDs — prompt for link
  if (!session && (!debugCustomerId || !debugCompanyId)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Client Portal</h2>
          <p className="text-slate-500 text-sm mb-6">
            Open the secure link from your email to access your portal.
          </p>
          {validateToken.error && (
            <p className="text-sm text-red-500">{validateToken.error.message}</p>
          )}
        </div>
      </div>
    );
  }

  if (snapshot.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (snapshot.error || !snapshot.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-lg w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Unable to load portal</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {snapshot.error?.message ?? "Unknown error"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, quotes, invoices, jobs, visits, propertyIntel, preferredSlotLabel } =
    snapshot.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Client Portal
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-sm text-slate-500">
              {preferredSlotLabel
                ? `Preferred slot: ${preferredSlotLabel}`
                : propertyIntel
                  ? "We saved your property details for faster scheduling."
                  : "View quotes, pay invoices, and request work anytime."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Company #{session?.companyId ?? resolvedCompanyId}</Badge>
            {session && (
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Sign out
              </Button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 uppercase">Open invoices</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900">{openInvoices.length}</span>
                <span className="text-xs text-slate-500">awaiting payment</span>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 uppercase">Quotes</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900">{quotes.length}</span>
                <span className="text-xs text-slate-500">on file</span>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 uppercase">Upcoming visits</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900">{upcomingVisits.length}</span>
                <span className="text-xs text-slate-500">scheduled</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileIcon /> Quotes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotes.length === 0 && <p className="text-sm text-slate-500">No quotes yet.</p>}
              {sortedQuotes.map(q => (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-200 px-3 py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">Quote #{q.quoteNumber}</p>
                    <p className="text-sm text-slate-500">${q.total}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <StatusPill tone={quoteStatusTone(q.status)} label={q.status} />
                      {q.acceptedAt ? `Accepted ${new Date(q.acceptedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {q.status !== "accepted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate({
                          quoteId: q.id,
                          customerId: resolvedCustomerId,
                          companyId: resolvedCompanyId,
                        })
                      }
                    >
                      {approve.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span className="ml-1">Approve</span>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
              {sortedInvoices.map(inv => (
                <div key={inv.id} className="rounded-lg border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Invoice #{inv.invoiceNumber}</p>
                      <p className="text-sm text-slate-500">
                        Total ${inv.total} · Balance ${inv.balance}
                      </p>
                    </div>
                    <StatusPill tone={invoiceStatusTone(inv.status)} label={inv.status} />
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-slate-500">
                    Balance: ${inv.balance} | Paid: ${inv.amountPaid}
                  </p>
                  {parseFloat(String(inv.balance ?? 0)) > 0 && (
                    <div className="mt-2 space-y-2">
                      <label className="text-xs text-slate-500">
                        Amount to pay
                        <input
                          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                          type="number"
                          min={0}
                          step="0.01"
                          value={payAmounts[inv.id] ?? parseFloat(String(inv.balance ?? 0)).toFixed(2)}
                          onChange={e =>
                            setPayAmounts(a => ({ ...a, [inv.id]: e.target.value }))
                          }
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-0"
                          onClick={() =>
                            setPayAmounts(a => ({
                              ...a,
                              [inv.id]: parseFloat(String(inv.balance ?? 0)).toFixed(2),
                            }))
                          }
                        >
                          Pay full balance
                        </Button>
                        <Button
                          size="sm"
                          className="mt-0"
                          disabled={pay.isPending || payingInvoiceId === inv.id && pay.isPending}
                          onClick={() => {
                            const amt = parseFloat(
                              (payAmounts[inv.id] ?? parseFloat(String(inv.balance ?? 0)).toFixed(2)).trim()
                            );
                            if (isNaN(amt) || amt <= 0) {
                              setPayNotices(n => ({
                                ...n,
                                [inv.id]: {
                                  type: "error",
                                  message: "Enter a valid amount greater than 0.",
                                },
                              }));
                              return;
                            }
                            setPayingInvoiceId(inv.id);
                            pay.mutate({
                              invoiceId: inv.id,
                              customerId: resolvedCustomerId,
                              companyId: resolvedCompanyId,
                              amount: amt,
                            });
                          }}
                        >
                          {pay.isPending && payingInvoiceId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          <span className="ml-2">Pay now</span>
                        </Button>
                        {payNotices[inv.id]?.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(payNotices[inv.id]?.url ?? "", "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Open payment
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {payNotices[inv.id] && (
                    <div
                      className={`text-xs mt-2 space-y-1 ${
                        payNotices[inv.id].type === "error"
                          ? "text-red-600"
                          : payNotices[inv.id].type === "action"
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      <p>{payNotices[inv.id].message}</p>
                      {payNotices[inv.id].url && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(payNotices[inv.id].url || "", "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Open payment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigator.clipboard.writeText(payNotices[inv.id].url || "")}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy link
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Jobs & visits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 && (
              <p className="text-sm text-slate-500">No jobs scheduled yet.</p>
            )}
            {jobs.map(job => (
              <div key={job.id} className="border border-slate-200 rounded-lg px-3 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Job #{job.jobNumber}</p>
                    <p className="text-sm text-slate-500">Status: {job.status}</p>
                  </div>
                  <Badge variant="secondary">
                    {job.isRecurring ? "Recurring" : "One-time"}
                  </Badge>
                </div>
                {visits
                  .filter(v => v.jobId === job.id)
                  .map(v => (
                    <div
                      key={v.id}
                      className="mt-2 flex items-center gap-2 text-xs text-slate-500"
                    >
                      {v.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span>
                        Visit #{v.id} · {v.status}
                        {v.scheduledAt ? ` · ${new Date(v.scheduledAt).toLocaleString()}` : ""}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request work / rebook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Send className="w-4 h-4" />
              <p>Tell us what you need next. This creates a lead for the team to confirm.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-slate-600">
                Services (comma separated)
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="House wash, windows"
                  value={requestServices}
                  onChange={e => setRequestServices(e.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Preferred date
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="2026-03-15"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                />
              </label>
            </div>
            <label className="text-sm text-slate-600 block">
              Details
              <textarea
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[100px]"
                placeholder="Add driveway next visit…"
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
              />
            </label>
            <Button
              disabled={requestWork.isPending}
              onClick={() =>
                requestWork.mutate({
                  customerId: resolvedCustomerId,
                  companyId: resolvedCompanyId,
                  message: requestMessage || undefined,
                  services: requestServices
                    ? requestServices.split(",").map(s => s.trim()).filter(Boolean)
                    : undefined,
                  preferredDate: preferredDate || undefined,
                })
              }
            >
              {requestWork.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="ml-2">Send request</span>
            </Button>
            {requestWork.isSuccess && (
              <p className="text-sm text-emerald-600">
                Request sent! Lead #{requestWork.data.leadId}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
