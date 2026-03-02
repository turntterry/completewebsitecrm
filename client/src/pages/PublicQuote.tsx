import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "wouter";
import { CheckCircle, Clock, FileText, Building2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:             { label: "Draft",              color: "bg-gray-100 text-gray-700" },
  sent:              { label: "Awaiting Review",    color: "bg-blue-100 text-blue-800" },
  accepted:          { label: "Accepted",           color: "bg-green-100 text-green-800" },
  changes_requested: { label: "Changes Requested",  color: "bg-yellow-100 text-yellow-800" },
  expired:           { label: "Expired",            color: "bg-red-100 text-red-800" },
  archived:          { label: "Archived",           color: "bg-gray-100 text-gray-700" },
};

export default function PublicQuote() {
  const params = useParams<{ token: string }>();
  const { data: quote, isLoading, isError } = trpc.quotes.getByToken.useQuery(
    { token: params.token ?? "" },
    { enabled: !!params.token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading your quote…</p>
        </div>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <FileText className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="text-xl font-bold text-gray-800">Quote Not Found</h1>
          <p className="text-sm text-gray-500">
            This quote link may have expired or been removed. Please contact us for a new quote.
          </p>
        </div>
      </div>
    );
  }

  const q = quote as any;
  const company = q.company;
  const customer = q.customer;
  const lineItems: any[] = q.lineItems ?? [];
  const status = STATUS_LABELS[q.status] ?? { label: q.status, color: "bg-gray-100 text-gray-700" };

  const subtotal = parseFloat(String(q.subtotal ?? 0));
  const taxAmount = parseFloat(String(q.taxAmount ?? 0));
  const total = parseFloat(String(q.total ?? 0));
  const deposit = parseFloat(String(q.depositAmount ?? 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="h-12 w-12 rounded-lg object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <p className="font-bold text-lg text-gray-900">{company?.name ?? "Your Service Provider"}</p>
                {company?.phone && <p className="text-sm text-gray-500">{company.phone}</p>}
              </div>
            </div>
            <Badge className={`text-sm px-3 py-1 ${status.color}`}>{status.label}</Badge>
          </div>
        </div>

        {/* Quote info */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Quote #{q.quoteNumber}{q.title ? ` — ${q.title}` : ""}
              </h1>
            </div>

            {customer && (
              <p className="text-sm text-gray-600">
                Prepared for: <span className="font-medium">{customer.firstName} {customer.lastName}</span>
              </p>
            )}

            {q.expiresAt && (
              <div className="flex items-center gap-1.5 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                Expires {new Date(q.expiresAt).toLocaleDateString()}
              </div>
            )}

            {q.message && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line">
                {q.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Services &amp; Items</h2>
            <div className="divide-y">
              {lineItems.map((li: any, i: number) => (
                <div key={i} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{li.description}</p>
                    {li.details && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{li.details}</p>}
                    {li.featureList && (li.featureList as any[]).length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {(li.featureList as any[]).map((f: any, fi: number) => (
                          <li key={fi} className={`text-xs flex items-center gap-1.5 ${f.included ? "text-green-700" : "text-gray-400 line-through"}`}>
                            <CheckCircle className={`h-3 w-3 shrink-0 ${f.included ? "text-green-500" : "text-gray-300"}`} />
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">${parseFloat(String(li.total ?? 0)).toFixed(2)}</p>
                    {parseFloat(li.quantity) !== 1 && (
                      <p className="text-xs text-gray-400">{li.quantity} × ${parseFloat(String(li.unitPrice ?? 0)).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 mt-2 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({parseFloat(String(q.taxRate ?? 0)).toFixed(2)}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">
                  <span>Deposit Required</span>
                  <span className="font-semibold">${deposit.toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {company?.name}{company?.phone ? ` · ${company.phone}` : ""}{company?.email ? ` · ${company.email}` : ""}
        </p>
      </div>
    </div>
  );
}
