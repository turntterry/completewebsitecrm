import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, XCircle, Send, CreditCard } from "lucide-react";
import { useState } from "react";

function parseIds() {
  const params = new URLSearchParams(window.location.search);
  const customerId = Number(params.get("customerId"));
  const companyId = Number(params.get("companyId"));
  return {
    customerId: Number.isFinite(customerId) ? customerId : null,
    companyId: Number.isFinite(companyId) ? companyId : null,
  };
}

export default function Portal() {
  const { customerId, companyId } = useMemo(parseIds, []);

  const snapshot = trpc.portal.getSnapshot.useQuery(
    { customerId: customerId ?? 0, companyId: companyId ?? 0, limit: 50 },
    { enabled: !!customerId && !!companyId }
  );

  const utils = trpc.useUtils();
  const approve = trpc.portal.approveQuote.useMutation({
    onSuccess: () => utils.portal.getSnapshot.invalidate(),
  });
  const pay = trpc.portal.payInvoice.useMutation({
    onSuccess: () => utils.portal.getSnapshot.invalidate(),
  });
  const requestWork = trpc.portal.requestWork.useMutation();

  const [requestMessage, setRequestMessage] = useState("");
  const [requestServices, setRequestServices] = useState("");
  const [preferredDate, setPreferredDate] = useState("");

  if (!customerId || !companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Portal preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-600 text-sm">
            <p>Add <code>?customerId=ID&companyId=ID</code> to the URL to load a client.</p>
            <p>This thin page calls the new <code>portal.getSnapshot</code> + <code>approveQuote</code> endpoints.</p>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Client portal preview</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {customer.firstName} {customer.lastName}
            </h1>
            {propertyIntel ? (
              <p className="text-sm text-slate-500">
                Property intel: {JSON.stringify(propertyIntel)}
              </p>
            ) : null}
            {preferredSlotLabel ? (
              <p className="text-sm text-slate-500">Preferred slot: {preferredSlotLabel}</p>
            ) : null}
          </div>
          <Badge variant="outline">Company #{companyId}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotes.length === 0 && <p className="text-sm text-slate-500">No quotes yet.</p>}
              {quotes.map(q => (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-200 px-3 py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">Quote #{q.quoteNumber}</p>
                    <p className="text-sm text-slate-500">${q.total}</p>
                    <p className="text-xs text-slate-400">
                      Status: {q.status} {q.acceptedAt ? `(accepted ${new Date(q.acceptedAt).toLocaleDateString()})` : ""}
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
                          customerId,
                          companyId,
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
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
              {invoices.map(inv => (
                <div key={inv.id} className="rounded-lg border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Invoice #{inv.invoiceNumber}</p>
                      <p className="text-sm text-slate-500">
                        Total ${inv.total} · Balance ${inv.balance}
                      </p>
                    </div>
                    <Badge variant="outline">{inv.status}</Badge>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-slate-500">
                    Balance: ${inv.balance} | Paid: ${inv.amountPaid}
                  </p>
                  {parseFloat(String(inv.balance ?? 0)) > 0 && (
                    <Button
                      size="sm"
                      className="mt-2"
                      disabled={pay.isPending}
                      onClick={() =>
                        pay.mutate({
                          invoiceId: inv.id,
                          customerId,
                          companyId,
                        })
                      }
                    >
                      {pay.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span className="ml-2">Pay now</span>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs & visits</CardTitle>
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
            <p className="text-sm text-slate-500">
              Tell us what you need next. This creates a lead for the team to confirm.
            </p>
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
                  customerId,
                  companyId,
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
