import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Send, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  partial: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  past_due: "bg-red-100 text-red-800",
};

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const utils = trpc.useUtils();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ach" | "check" | "cash" | "other">("check");

  const { data: invoice, isLoading } = trpc.invoices.get.useQuery({ id }, { enabled: !!id && id > 0 });
  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => { utils.invoices.get.invalidate({ id }); toast.success("Invoice updated"); },
    onError: (e) => toast.error(e.message),
  });
  const recordPayment = trpc.invoices.recordPayment.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ id });
      toast.success("Payment recorded");
      setPaymentOpen(false);
      setPaymentAmount("");
    },
    onError: (e) => toast.error(e.message),
  });
  const sendPortalLink = trpc.clientHub.sendMagicLink.useMutation({
    onSuccess: (data) => toast.success(`Portal link sent to ${data.email}`),
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>;
  if (!invoice) return <div className="p-6"><p className="text-muted-foreground">Invoice not found.</p></div>;

  const inv = invoice as any;
  const lineItems = inv.lineItems as any[] ?? [];
  const payments = inv.payments as any[] ?? [];
  const balance = parseFloat(String(inv.balance ?? 0));

  const openPaymentDialog = () => {
    setPaymentAmount(balance.toFixed(2));
    setPaymentOpen(true);
  };

  const handleRecordPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    recordPayment.mutate({ invoiceId: id, amount: paymentAmount, method: paymentMethod });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/invoices"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Invoices</Button></Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invoice #{inv.invoiceNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STATUS_COLORS[inv.status] ?? ""}>{inv.status?.replace(/_/g, " ")}</Badge>
            <span className="text-sm text-muted-foreground">{inv.customer?.firstName} {inv.customer?.lastName}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inv.status === "draft" && (
            <Button size="sm" onClick={() => updateMutation.mutate({ id, status: "sent" })} disabled={updateMutation.isPending}>
              <Send className="h-4 w-4 mr-1.5" /> Send Invoice
            </Button>
          )}
          {["sent", "partial", "past_due"].includes(inv.status) && balance > 0 && (
            <Button size="sm" onClick={openPaymentDialog}>
              <DollarSign className="h-4 w-4 mr-1.5" /> Record Payment
            </Button>
          )}
          {inv.customer?.email && (
            <Button
              size="sm"
              variant="outline"
              disabled={sendPortalLink.isPending}
              onClick={() => sendPortalLink.mutate({
                customerId: inv.customerId,
                invoiceId: id,
                origin: window.location.origin,
              })}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {sendPortalLink.isPending ? "Sending..." : "Send to Client Portal"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Bill To</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p className="font-semibold text-foreground">
              {inv.customer?.firstName} {inv.customer?.lastName}
            </p>
            {inv.customer?.phone && (
              <p className="text-muted-foreground">{inv.customer.phone}</p>
            )}
            {inv.customer?.email && (
              <a href={`mailto:${inv.customer.email}`} className="text-blue-600 hover:underline block">
                {inv.customer.email}
              </a>
            )}
            <Link href={`/admin/clients/${inv.customerId}`}>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1">View Client Profile &rarr;</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Details</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-1.5 text-muted-foreground">Invoice #</td>
                  <td className="py-1.5 text-right font-medium">{inv.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-muted-foreground">Created</td>
                  <td className="py-1.5 text-right">{new Date(inv.createdAt).toLocaleDateString()}</td>
                </tr>
                {inv.issuedAt && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Issued</td>
                    <td className="py-1.5 text-right">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  </tr>
                )}
                {inv.sentAt && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Sent</td>
                    <td className="py-1.5 text-right">{new Date(inv.sentAt).toLocaleDateString()}</td>
                  </tr>
                )}
                {inv.dueDate && (
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Due</td>
                    <td className={`py-1.5 text-right ${inv.status === "past_due" ? "text-red-600 font-medium" : ""}`}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-muted-foreground">Balance</td>
                  <td className={`py-1.5 text-right font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>${balance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Unit Price</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any) => (
                <tr key={li.id} className="border-b border-border last:border-0">
                  <td className="py-3">{li.description}</td>
                  <td className="py-3 text-right">{li.quantity}</td>
                  <td className="py-3 text-right">${parseFloat(String(li.unitPrice)).toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">${parseFloat(String(li.total)).toFixed(2)}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No line items</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="pt-3 text-right font-medium">Subtotal</td><td className="pt-3 text-right font-medium">${parseFloat(String(inv.subtotal ?? 0)).toFixed(2)}</td></tr>
              {parseFloat(String(inv.taxAmount ?? 0)) > 0 && (
                <tr><td colSpan={3} className="text-right text-muted-foreground">Tax</td><td className="text-right">${parseFloat(String(inv.taxAmount)).toFixed(2)}</td></tr>
              )}
              {parseFloat(String(inv.tipAmount ?? 0)) > 0 && (
                <tr><td colSpan={3} className="text-right text-muted-foreground">Tip</td><td className="text-right">${parseFloat(String(inv.tipAmount)).toFixed(2)}</td></tr>
              )}
              <tr className="border-t border-border"><td colSpan={3} className="pt-2 text-right text-lg font-bold">Total</td><td className="pt-2 text-right text-lg font-bold">${parseFloat(String(inv.total ?? 0)).toFixed(2)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                <div>
                  <p className="font-medium capitalize">{p.method?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold text-green-600">+${parseFloat(String(p.amount)).toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  className="pl-7"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={balance.toFixed(2)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Outstanding balance: ${balance.toFixed(2)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "ach" | "check" | "cash" | "other")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
