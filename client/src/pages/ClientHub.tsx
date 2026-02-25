import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  FileText,
  Briefcase,
  Receipt,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Home,
  Plus,
  Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | null | undefined) {
  if (!val) return "$0.00";
  return `$${parseFloat(val).toFixed(2)}`;
}

function statusColor(status: string) {
  switch (status) {
    case "draft": return "secondary";
    case "sent": return "default";
    case "accepted": return "default";
    case "paid": return "default";
    case "overdue": return "destructive";
    case "archived": return "secondary";
    case "changes_requested": return "destructive";
    case "expired": return "secondary";
    case "completed": return "default";
    case "in_progress": return "default";
    default: return "secondary";
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Components ───────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-600 text-sm">{message}</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Quote Detail View ────────────────────────────────────────────────────────

function QuoteDetailView({
  quoteId,
  session,
  onBack,
}: {
  quoteId: number;
  session: ClientSession;
  onBack: () => void;
}) {
  const { data, isLoading, error } = trpc.clientHub.getQuoteDetail.useQuery({
    quoteId,
    customerId: session.customerId,
    companyId: session.companyId,
  });

  const utils = trpc.useUtils();
  const respond = trpc.clientHub.respondToQuote.useMutation({
    onSuccess: () => {
      utils.clientHub.getQuoteDetail.invalidate();
      utils.clientHub.getClientData.invalidate();
    },
  });

  if (isLoading) return <LoadingScreen message="Loading quote…" />;
  if (error || !data) return <ErrorScreen message={error?.message ?? "Quote not found"} onRetry={onBack} />;

  const { quote, lineItems, optionSets, optionItems, customer, property } = data;
  const canRespond = quote.status === "sent" || quote.status === "draft";

  // Track which add-on items the client has selected
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<number>>(new Set());
  const toggleAddOn = (id: number) =>
    setSelectedAddOnIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const selectedAddOnsTotal = optionItems
    .filter((i) => selectedAddOnIds.has(i.id))
    .reduce((sum, i) => sum + parseFloat(i.total ?? "0"), 0);
  const grandTotal = parseFloat(quote.total ?? "0") + selectedAddOnsTotal;

  const customerName = customer
    ? `${customer.firstName}${customer.lastName ? " " + customer.lastName : ""}`
    : "Client";
  const propertyAddress = property
    ? [property.address, property.city, property.state, property.zip].filter(Boolean).join(", ")
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal header with logo */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/dKqGhiVvDbWjCuzb.png"
            alt="Exterior Experts"
            className="h-10 w-10 object-contain shrink-0"
          />
          <span className="text-sm font-bold text-slate-900">Client Portal</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to portal
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Quote title + status */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-slate-900">Quote for {customerName}</h1>
              <Badge variant={statusColor(quote.status) as "default" | "secondary" | "destructive"}>
                {statusLabel(quote.status)}
              </Badge>
            </div>
          </div>

          {/* Client info + Quote meta — two-column like Jobber */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-slate-100">
            {/* Left: client info */}
            <div className="px-6 py-5 border-b sm:border-b-0 sm:border-r border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-1">{customerName}</p>
              {propertyAddress && (
                <div className="mb-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Property Address</p>
                  <p className="text-sm text-slate-700">{propertyAddress}</p>
                </div>
              )}
              {customer?.phone && (
                <p className="text-sm text-slate-700 mt-1">{customer.phone}</p>
              )}
              {customer?.email && (
                <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline mt-0.5 block">
                  {customer.email}
                </a>
              )}
            </div>
            {/* Right: quote meta */}
            <div className="px-6 py-5">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 text-slate-500 pr-4">Quote #</td>
                    <td className="py-1.5 text-slate-900 font-medium text-right">{quote.quoteNumber}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-500 pr-4">Created</td>
                    <td className="py-1.5 text-slate-900 text-right">{new Date(quote.createdAt).toLocaleDateString()}</td>
                  </tr>
                  {quote.sentAt && (
                    <tr>
                      <td className="py-1.5 text-slate-500 pr-4">Sent</td>
                      <td className="py-1.5 text-slate-900 text-right">{new Date(quote.sentAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                  {quote.acceptedAt && (
                    <tr>
                      <td className="py-1.5 text-slate-500 pr-4">Approved</td>
                      <td className="py-1.5 text-slate-900 text-right">{new Date(quote.acceptedAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                  {quote.expiresAt && (
                    <tr>
                      <td className="py-1.5 text-slate-500 pr-4">Expires</td>
                      <td className="py-1.5 text-slate-900 text-right">{new Date(quote.expiresAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items table — Jobber style */}
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Product / Service</p>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-2 border-b border-slate-200 text-xs text-slate-500 font-medium uppercase tracking-wide">
              <span>Line Item</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {lineItems.map((item) => (
                <div key={item.id} className="py-4 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-start">
                  <div>
                    <p className="text-slate-900 font-medium text-sm">{item.description}</p>
                    {item.details && (
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.details}</p>
                    )}
                    {Array.isArray(item.featureList) && item.featureList.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {(item.featureList as { label: string; included: boolean }[]).map((f, fi) => (
                          <li key={fi} className="flex items-center gap-1.5 text-xs">
                            {f.included ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                            <span className={f.included ? "text-slate-700" : "text-slate-400"}>{f.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="text-sm text-slate-700 text-right pt-0.5">{parseFloat(item.quantity ?? "1").toString()}</span>
                  <span className="text-sm text-slate-700 text-right pt-0.5">{fmt(item.unitPrice)}</span>
                  <span className="text-sm text-slate-900 font-semibold text-right pt-0.5">{fmt(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Optional Add-Ons */}
            {optionSets.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Optional Add-Ons</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Optional</span>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                  Enhance your service with any of the optional upgrades below. Let us know which ones interest you.
                </p>
                <div className="space-y-4">
                  {optionSets.map((set) => {
                    const items = optionItems.filter((i) => i.optionSetId === set.id);
                    return (
                      <div key={set.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                          <p className="text-sm font-semibold text-slate-800">{set.title}</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {items.map((item) => {
                            const isSelected = selectedAddOnIds.has(item.id);
                            return (
                              <div key={item.id} className={`p-4 transition-colors ${isSelected ? "bg-green-50" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                                    {item.description && (
                                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
                                    )}
                                    {Array.isArray(item.featureList) && item.featureList.length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {(item.featureList as { label: string; included: boolean }[]).map((f, fi) => (
                                          <li key={fi} className="flex items-center gap-1.5 text-xs">
                                            {f.included ? (
                                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                            ) : (
                                              <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                            )}
                                            <span className={f.included ? "text-slate-700" : "text-slate-400"}>{f.label}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    {parseFloat(item.unitPrice ?? "0") > 0 && (
                                      <p className={`font-semibold text-sm ${isSelected ? "text-green-700" : "text-slate-900"}`}>+{fmt(item.total)}</p>
                                    )}
                                    {canRespond && (
                                      <button
                                        onClick={() => toggleAddOn(item.id)}
                                        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                          isSelected
                                            ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                            : "bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                                        }`}
                                      >
                                        {isSelected ? (
                                          <><Minus className="w-3 h-3" /> Remove</>
                                        ) : (
                                          <><Plus className="w-3 h-3" /> Add</>  
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Subtotal</span>
                <span>{fmt(quote.subtotal)}</span>
              </div>
              {parseFloat(quote.taxAmount ?? "0") > 0 && (
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Tax ({quote.taxRate}%)</span>
                  <span>{fmt(quote.taxAmount)}</span>
                </div>
              )}
              {selectedAddOnsTotal > 0 && (
                <div className="flex justify-between text-green-700 text-sm font-medium">
                  <span>Selected Add-Ons</span>
                  <span>+{fmt(selectedAddOnsTotal.toFixed(2))}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-lg pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>{selectedAddOnsTotal > 0 ? fmt(grandTotal.toFixed(2)) : fmt(quote.total)}</span>
              </div>
            </div>

            {/* Message */}
            {quote.message && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <p className="text-blue-800 text-sm">{quote.message}</p>
              </div>
            )}

            {/* Actions */}
            {canRespond && (
              <div className="mt-6 flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      quoteId: quote.id,
                      customerId: session.customerId,
                      companyId: session.companyId,
                      action: "approve",
                      selectedAddOnIds: Array.from(selectedAddOnIds),
                    })
                  }
                >
                  {respond.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve Quote
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      quoteId: quote.id,
                      customerId: session.customerId,
                      companyId: session.companyId,
                      action: "decline",
                    })
                  }
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}

            {quote.status === "accepted" && (
              <div className="mt-6 flex items-center gap-3 bg-green-50 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-green-800 text-sm font-medium">
                  You've approved this quote. We'll be in touch shortly to schedule your service.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Detail View ──────────────────────────────────────────────────────

function InvoiceDetailView({
  invoiceId,
  session,
  onBack,
}: {
  invoiceId: number;
  session: ClientSession;
  onBack: () => void;
}) {
  const { data, isLoading, error } = trpc.clientHub.getInvoiceDetail.useQuery({
    invoiceId,
    customerId: session.customerId,
    companyId: session.companyId,
  });

  if (isLoading) return <LoadingScreen message="Loading invoice…" />;
  if (error || !data) return <ErrorScreen message={error?.message ?? "Invoice not found"} onRetry={onBack} />;

  const { invoice, lineItems } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal header with logo */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/dKqGhiVvDbWjCuzb.png"
            alt="Exterior Experts"
            className="h-10 w-10 object-contain shrink-0"
          />
          <span className="text-sm font-bold text-slate-900">Client Portal</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to portal
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">
                  Invoice #{invoice.invoiceNumber}
                </p>
                <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
              </div>
              <Badge variant={statusColor(invoice.status) as "default" | "secondary" | "destructive"}>
                {statusLabel(invoice.status)}
              </Badge>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Services</h3>
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">{item.description}</p>
                    {item.details && (
                      <p className="text-slate-500 text-sm mt-0.5">{item.details}</p>
                    )}
                    {item.quantity !== "1" && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        {item.quantity} × {fmt(item.unitPrice)}
                      </p>
                    )}
                  </div>
                  <p className="text-slate-900 font-semibold whitespace-nowrap">{fmt(item.total)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.taxAmount ?? "0") > 0 && (
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Tax</span>
                  <span>{fmt(invoice.taxAmount)}</span>
                </div>
              )}
              {parseFloat(invoice.amountPaid ?? "0") > 0 && (
                <div className="flex justify-between text-green-700 text-sm">
                  <span>Amount Paid</span>
                  <span>-{fmt(invoice.amountPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-lg pt-2 border-t border-slate-100">
                <span>Balance Due</span>
                <span>{fmt(invoice.balance)}</span>
              </div>
            </div>

            {invoice.message && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <p className="text-blue-800 text-sm">{invoice.message}</p>
              </div>
            )}

            {(invoice.status as string) === "paid" && (
              <div className="mt-6 flex items-center gap-3 bg-green-50 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-green-800 text-sm font-medium">This invoice has been paid. Thank you!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard View ──────────────────────────────────────────────────────

function ClientDashboard({
  session,
  onLogout,
}: {
  session: ClientSession;
  onLogout: () => void;
}) {
  const [view, setView] = useState<
    | { type: "dashboard" }
    | { type: "quote"; id: number }
    | { type: "invoice"; id: number }
  >({ type: "dashboard" });

  const { data, isLoading, error } = trpc.clientHub.getClientData.useQuery({
    customerId: session.customerId,
    companyId: session.companyId,
  });

  // Auto-navigate to pinned quote/invoice from magic link
  useEffect(() => {
    if (data && session.quoteId && view.type === "dashboard") {
      setView({ type: "quote", id: session.quoteId });
    } else if (data && session.invoiceId && view.type === "dashboard") {
      setView({ type: "invoice", id: session.invoiceId });
    }
    // Only run once when data first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (view.type === "quote") {
    return (
      <QuoteDetailView
        quoteId={view.id}
        session={session}
        onBack={() => setView({ type: "dashboard" })}
      />
    );
  }

  if (view.type === "invoice") {
    return (
      <InvoiceDetailView
        invoiceId={view.id}
        session={session}
        onBack={() => setView({ type: "dashboard" })}
      />
    );
  }

  if (isLoading) return <LoadingScreen message="Loading your portal…" />;
  if (error || !data) return <ErrorScreen message={error?.message ?? "Failed to load your data"} />;

  const { customer, quotes: customerQuotes, invoices: customerInvoices, jobs: customerJobs } = data;
  const customerName = `${customer.firstName}${customer.lastName ? " " + customer.lastName : ""}`;

  const pendingQuotes = customerQuotes.filter((q) => q.status === "sent" || q.status === "draft");
  const unpaidInvoices = customerInvoices.filter(
    (i) => i.status === "sent" || i.status === "past_due"
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/dKqGhiVvDbWjCuzb.png"
              alt="Exterior Experts"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Client Portal</h1>
              <p className="text-xs text-slate-500">Welcome back, {customerName}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Action Required Banner */}
        {(pendingQuotes.length > 0 || unpaidInvoices.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 font-semibold text-sm mb-1">Action required</p>
            <p className="text-amber-700 text-sm">
              {pendingQuotes.length > 0 && `${pendingQuotes.length} quote${pendingQuotes.length > 1 ? "s" : ""} awaiting your approval`}
              {pendingQuotes.length > 0 && unpaidInvoices.length > 0 && " · "}
              {unpaidInvoices.length > 0 && `${unpaidInvoices.length} unpaid invoice${unpaidInvoices.length > 1 ? "s" : ""}`}
            </p>
          </div>
        )}

        {/* Quotes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Quotes</h2>
          </div>
          {customerQuotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
              No quotes yet
            </div>
          ) : (
            <div className="space-y-2">
              {customerQuotes.map((quote) => (
                <button
                  key={quote.id}
                  onClick={() => setView({ type: "quote", id: quote.id })}
                  className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <div>
                    <p className="font-medium text-slate-900">{quote.title || `Quote #${quote.quoteNumber}`}</p>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {fmt(quote.total)} ·{" "}
                      <span className="capitalize">{statusLabel(quote.status)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusColor(quote.status) as "default" | "secondary" | "destructive"}
                      className="text-xs"
                    >
                      {statusLabel(quote.status)}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Invoices */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Invoices</h2>
          </div>
          {customerInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
              No invoices yet
            </div>
          ) : (
            <div className="space-y-2">
              {customerInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => setView({ type: "invoice", id: invoice.id })}
                  className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      Invoice #{invoice.invoiceNumber}
                    </p>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {fmt(invoice.total)} ·{" "}                      <span className="capitalize">{statusLabel(invoice.status ?? "draft")}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusColor(invoice.status) as "default" | "secondary" | "destructive"}
                      className="text-xs"
                    >
                      {statusLabel(invoice.status)}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Jobs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Jobs</h2>
          </div>
          {customerJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
              No jobs yet
            </div>
          ) : (
            <div className="space-y-2">
              {customerJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{job.title || `Job #${job.jobNumber}`}</p>
                    <p className="text-slate-500 text-sm mt-0.5">
                      <span className="capitalize">{statusLabel(job.status)}</span>
                    </p>
                  </div>
                  <Badge
                    variant={statusColor(job.status) as "default" | "secondary" | "destructive"}
                    className="text-xs"
                  >
                    {statusLabel(job.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-4">
          Powered by Exterior Experts CRM
        </div>
      </div>
    </div>
  );
}

// ─── Token Validation Screen ──────────────────────────────────────────────────

function TokenValidationScreen({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: (session: ClientSession) => void;
}) {
  const validate = trpc.clientHub.validateToken.useMutation({
    onSuccess: (data) => {
      const session: ClientSession = {
        customerId: data.customerId,
        companyId: data.companyId,
        quoteId: data.quoteId,
        invoiceId: data.invoiceId,
        sessionToken: data.sessionToken,
        sessionExpires: data.sessionExpires,
      };
      saveSession(session);
      onSuccess(session);
    },
  });

  useEffect(() => {
    validate.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (validate.isPending) return <LoadingScreen message="Verifying your link…" />;

  if (validate.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Link expired</h2>
          <p className="text-slate-500 text-sm">
            {validate.error.message}
          </p>
          <p className="text-slate-400 text-xs mt-4">
            Please contact us to receive a new portal link.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ClientHub() {
  const [session, setSession] = useState<ClientSession | null>(() => loadSession());

  // Read token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    // Remove token from URL without reload
    window.history.replaceState({}, "", "/client");
  }, []);

  // If we have a token in the URL, validate it (even if we already have a session)
  if (token && !session) {
    return (
      <TokenValidationScreen
        token={token}
        onSuccess={(s) => {
          setSession(s);
          // Remove token from URL
          window.history.replaceState({}, "", "/client");
        }}
      />
    );
  }

  // If we have a valid session, show the dashboard
  if (session) {
    return <ClientDashboard session={session} onLogout={handleLogout} />;
  }

  // No session, no token — show a friendly "request link" page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Home className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Client Portal</h2>
        <p className="text-slate-500 text-sm mb-6">
          To access your portal, please use the secure link sent to your email address.
        </p>
        <p className="text-slate-400 text-xs">
          Don't have a link? Contact us and we'll send one to you.
        </p>
      </div>
    </div>
  );
}
