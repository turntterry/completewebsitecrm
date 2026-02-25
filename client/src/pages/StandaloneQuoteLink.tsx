import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  ExternalLink,
  QrCode,
  Code,
  Link as LinkIcon,
  RefreshCw,
  Download,
  CheckCircle,
  Globe,
  MousePointerClick,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

// ─── QR Code Generator (pure canvas, no dependencies) ────────────────────────
// Uses the Google Charts API for QR generation (public/free, no API key needed)
function QrCodeCanvas({ url, size = 200 }: { url: string; size?: number }) {
  const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border rounded-xl p-3 bg-white shadow-sm">
        <img
          src={imgSrc}
          width={size}
          height={size}
          alt="QR code"
          className="block"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
      {copied ? (
        <>
          <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}

// ─── Code Block ──────────────────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} label="Copy code" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StandaloneQuoteLink() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.quoteToolSettings.getSettings.useQuery();
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [btnColor, setBtnColor] = useState("#1e293b");
  const [btnText, setBtnText] = useState("Get a Free Quote");

  const regenMutation = trpc.quoteToolSettings.regenerateToken.useMutation({
    onSuccess: () => {
      utils.quoteToolSettings.getSettings.invalidate();
      setShowRegenConfirm(false);
      toast.success("New link generated — old link is now invalid");
    },
    onError: (e) => toast.error(e.message),
  });

  const standaloneUrl = `${window.location.origin}/instant-quote`;

  const isActive = !!(settings as any)?.isActive;

  // Embed snippets
  const iframeCode = standaloneUrl
    ? `<iframe
  src="${standaloneUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px;"
  title="Get an Instant Quote"
></iframe>`
    : "";

  const buttonHtml = standaloneUrl
    ? `<a
  href="${standaloneUrl}"
  target="_blank"
  rel="noopener noreferrer"
  style="
    display: inline-block;
    background-color: ${btnColor};
    color: #ffffff;
    padding: 14px 28px;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  "
>${btnText}</a>`
    : "";

  const popupJs = standaloneUrl
    ? `<!-- Add this button wherever you want it -->
<button onclick="openQuoteModal()" style="
  background: ${btnColor};
  color: #fff;
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
">${btnText}</button>

<!-- Add this script + overlay once, at the bottom of your <body> -->
<div id="quote-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;">
  <div style="background:#fff; border-radius:16px; width:min(600px,95vw); height:85vh; overflow:hidden; position:relative;">
    <button onclick="closeQuoteModal()" style="position:absolute; top:12px; right:16px; background:none; border:none; font-size:24px; cursor:pointer; z-index:1;">✕</button>
    <iframe src="${standaloneUrl}" style="width:100%; height:100%; border:none;" title="Get a Quote"></iframe>
  </div>
</div>

<script>
  function openQuoteModal() {
    var m = document.getElementById('quote-modal');
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeQuoteModal() {
    var m = document.getElementById('quote-modal');
    m.style.display = 'none';
    document.body.style.overflow = '';
  }
</script>`
    : "";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-primary" /> Standalone Quote Link
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share your quote tool as a link, QR code, embed, or popup
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }
          >
            <Globe className="h-3 w-3 mr-1" />
            {isActive ? "Live" : "Inactive"}
          </Badge>
        </div>
      </div>

      {!isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠ Your quote tool is currently inactive. Customers who visit the link will see an unavailable message.
          Enable it in{" "}
          <a href="/admin/booking-controls" className="underline font-medium">
            Booking Controls
          </a>
          .
        </div>
      )}

      {!standaloneUrl ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No standalone link yet. Set up your Quote Tool first.</p>
            <Button className="mt-4" onClick={() => (window.location.href = "/admin/quote-tool")}>
              Go to Quote Tool Settings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Direct Link Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> Direct Link
              </CardTitle>
              <CardDescription>
                Share this URL on your website, in emails, or on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={standaloneUrl}
                  readOnly
                  className="font-mono text-sm text-muted-foreground"
                />
                <CopyButton text={standaloneUrl} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(standaloneUrl, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Need to invalidate the old link? Regenerate a new unique URL.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setShowRegenConfirm(true)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sharing Options Tabs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add to Your Website</CardTitle>
              <CardDescription>
                Choose how to embed the quote tool on your site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="button">
                <TabsList className="mb-4">
                  <TabsTrigger value="button" className="flex items-center gap-1.5">
                    <MousePointerClick className="h-3.5 w-3.5" /> Button Link
                  </TabsTrigger>
                  <TabsTrigger value="popup" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Popup Modal
                  </TabsTrigger>
                  <TabsTrigger value="iframe" className="flex items-center gap-1.5">
                    <Code className="h-3.5 w-3.5" /> iFrame Embed
                  </TabsTrigger>
                </TabsList>

                {/* Button Tab */}
                <TabsContent value="button" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input
                        value={btnText}
                        onChange={(e) => setBtnText(e.target.value)}
                        placeholder="Get a Free Quote"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Palette className="h-3 w-3" /> Button Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={btnColor}
                          onChange={(e) => setBtnColor(e.target.value)}
                          className="w-9 h-9 rounded cursor-pointer border"
                        />
                        <Input
                          value={btnColor}
                          onChange={(e) => setBtnColor(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="border rounded-lg p-6 bg-slate-50 flex items-center justify-center min-h-[80px]">
                    <a
                      href={standaloneUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        backgroundColor: btnColor,
                        color: "#ffffff",
                        padding: "14px 28px",
                        borderRadius: "8px",
                        fontFamily: "sans-serif",
                        fontSize: "16px",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      {btnText || "Get a Free Quote"}
                    </a>
                  </div>

                  <CodeBlock code={buttonHtml} />
                </TabsContent>

                {/* Popup Tab */}
                <TabsContent value="popup" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input
                        value={btnText}
                        onChange={(e) => setBtnText(e.target.value)}
                        placeholder="Get a Free Quote"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Palette className="h-3 w-3" /> Button Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={btnColor}
                          onChange={(e) => setBtnColor(e.target.value)}
                          className="w-9 h-9 rounded cursor-pointer border"
                        />
                        <Input
                          value={btnColor}
                          onChange={(e) => setBtnColor(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-3">
                    💡 The popup script opens the quote tool in an overlay — customers stay on your page.
                    Paste the entire snippet just before your closing <code>&lt;/body&gt;</code> tag.
                  </p>

                  <CodeBlock code={popupJs} />
                </TabsContent>

                {/* iFrame Tab */}
                <TabsContent value="iframe" className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Embeds the full quote tool directly inside your webpage. Works great on a dedicated
                    "Get a Quote" landing page.
                  </p>
                  <CodeBlock code={iframeCode} />
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/60 px-3 py-1.5 border-b text-xs text-muted-foreground flex items-center gap-2">
                      <Globe className="h-3 w-3" /> Live preview (scaled)
                    </div>
                    <div className="h-64 overflow-hidden bg-white">
                      <iframe
                        src={standaloneUrl}
                        className="w-full h-[700px] border-none origin-top-left"
                        style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}
                        title="Quote Tool Preview"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" /> QR Code
              </CardTitle>
              <CardDescription>
                Print or display this QR code on business cards, yard signs, or flyers so customers can scan and get an instant quote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <QrCodeCanvas url={standaloneUrl} size={180} />
                <div className="space-y-3 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Scan with any smartphone camera to open the quote tool instantly — no app required.
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        const img = document.createElement("a");
                        img.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(standaloneUrl)}&margin=20`;
                        img.download = "quote-tool-qr.png";
                        img.target = "_blank";
                        img.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download QR Code (PNG)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Downloads a high-resolution 500×500px PNG suitable for print
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">QR code image URL (for Canva, Figma, etc.)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        className="text-xs font-mono text-muted-foreground"
                        value={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(standaloneUrl)}&margin=20`}
                      />
                      <CopyButton
                        text={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(standaloneUrl)}&margin=20`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Card className="border-dashed">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm font-medium text-muted-foreground mb-3">💡 Where to share your quote tool link</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span>→ Google Business Profile — add as a booking link</span>
                <span>→ Facebook / Instagram bio</span>
                <span>→ Email signature — button or text link</span>
                <span>→ Yard signs — print the QR code</span>
                <span>→ Business cards — QR code on the back</span>
                <span>→ Website header or "Get a Quote" page</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Regenerate confirm */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate quote tool link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new unique URL and permanently invalidate the current one. Any existing links,
              QR codes, or embeds using the old URL will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => regenMutation.mutate()}
              disabled={regenMutation.isPending}
            >
              {regenMutation.isPending ? "Regenerating..." : "Regenerate Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
