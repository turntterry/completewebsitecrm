import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  Zap,
  Send,
  Loader2,
  Info,
  AlertTriangle,
  User,
} from "lucide-react";
import { toast } from "sonner";

// ─── Business Hours Editor ────────────────────────────────────────────────────
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<typeof DAYS[number], string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h < 12 ? "AM" : "PM"}`;
  const value = `${String(h).padStart(2, "0")}:${m}`;
  return { value, label };
});

type DayHours = { open: string; close: string } | null;
type BusinessHours = Record<typeof DAYS[number], DayHours> & { timezone?: string };

const DEFAULT_HOURS: BusinessHours = {
  timezone: "America/New_York",
  monday:    { open: "08:00", close: "17:00" },
  tuesday:   { open: "08:00", close: "17:00" },
  wednesday: { open: "08:00", close: "17:00" },
  thursday:  { open: "08:00", close: "17:00" },
  friday:    { open: "08:00", close: "17:00" },
  saturday:  null,
  sunday:    null,
};

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Phoenix", label: "Arizona (MT, no DST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
];

function BusinessHoursEditor({
  value,
  onChange,
}: {
  value: BusinessHours;
  onChange: (h: BusinessHours) => void;
}) {
  const setDay = (day: typeof DAYS[number], hours: DayHours) => {
    onChange({ ...value, [day]: hours });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">Timezone</Label>
        <Select
          value={value.timezone ?? "America/New_York"}
          onValueChange={(tz) => onChange({ ...value, timezone: tz })}
        >
          <SelectTrigger className="h-8 text-sm w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {DAYS.map((day) => {
          const hours = value[day];
          const isOpen = hours !== null;
          return (
            <div key={day} className="flex items-center gap-3">
              <div className="w-10 text-sm font-medium text-muted-foreground">{DAY_LABELS[day]}</div>
              <Switch
                checked={isOpen}
                onCheckedChange={(v) => setDay(day, v ? { open: "08:00", close: "17:00" } : null)}
              />
              {isOpen && hours ? (
                <>
                  <Select value={hours.open} onValueChange={(v) => setDay(day, { ...hours, open: v })}>
                    <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <Select value={hours.close} onValueChange={(v) => setDay(day, { ...hours, close: v })}>
                    <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Test Chat ────────────────────────────────────────────────────────────────
function TestChat({ personaName }: { personaName: string }) {
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const testMutation = trpc.aiReceptionist.testReply.useMutation({
    onSuccess: (data) => {
      setThread((prev) => [...prev, { role: "ai", text: data.reply ?? "(no reply)" }]);
    },
    onError: (e) => toast.error(e.message),
  });

  function send() {
    if (!message.trim()) return;
    const text = message.trim();
    setThread((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    testMutation.mutate({ message: text });
  }

  return (
    <div className="flex flex-col h-72 border rounded-xl overflow-hidden">
      <div className="bg-slate-800 text-white text-xs px-3 py-2 flex items-center gap-2">
        <Bot className="h-3.5 w-3.5" />
        <span>Test as {personaName || "AI"} · Simulates an inbound SMS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {thread.length === 0 && (
          <p className="text-xs text-center text-muted-foreground mt-8">
            Send a test message to preview your AI receptionist's reply
          </p>
        )}
        {thread.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white border shadow-sm text-slate-800"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {testMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-2xl px-3 py-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {personaName || "AI"} is typing...
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 border-t bg-white">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a test customer message..."
          className="text-sm"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
        />
        <Button size="sm" onClick={send} disabled={testMutation.isPending || !message.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AiReceptionist() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.aiReceptionist.getSettings.useQuery();

  const [synced, setSynced] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [personaName, setPersonaName] = useState("Alex");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [afterHoursMsg, setAfterHoursMsg] = useState(
    "We're currently closed. We'll get back to you first thing tomorrow!"
  );
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [useBusinessHours, setUseBusinessHours] = useState(false);

  useEffect(() => {
    if (settings && !synced) {
      setEnabled(settings.enabled);
      setPersonaName(settings.personaName ?? "Alex");
      setSystemPrompt(settings.systemPrompt ?? "");
      setAfterHoursMsg(settings.afterHoursMessage ?? "We're currently closed. We'll get back to you first thing tomorrow!");
      if (settings.businessHours) {
        setBusinessHours({ ...DEFAULT_HOURS, ...(settings.businessHours as any) });
        setUseBusinessHours(true);
      }
      setSynced(true);
    }
  }, [settings]);

  const saveMutation = trpc.aiReceptionist.updateSettings.useMutation({
    onSuccess: () => {
      utils.aiReceptionist.getSettings.invalidate();
      toast.success("AI Receptionist settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  function save() {
    saveMutation.mutate({
      enabled,
      personaName,
      systemPrompt,
      businessHours: useBusinessHours ? businessHours : undefined,
      afterHoursMessage: afterHoursMsg,
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  const apiOk = settings?.apiKeyConfigured;
  const twilioOk = settings?.twilioConfigured;
  const fullyConfigured = apiOk && twilioOk;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Receptionist
            <Badge variant="secondary" className="text-xs font-medium">Internal</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Can reply to inbound customer SMS messages using Claude AI. Review live behavior before enabling broadly.
          </p>
        </div>
        <Badge className={enabled && fullyConfigured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
          {enabled && fullyConfigured ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
          )}
        </Badge>
      </div>

      {/* Requirements status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Setup Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            {apiOk ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
            <span className="text-sm">Anthropic API Key {apiOk ? "configured" : "— add ANTHROPIC_API_KEY to your environment"}</span>
          </div>
          <div className="flex items-center gap-3">
            {twilioOk ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
            <span className="text-sm">Twilio SMS {twilioOk ? "configured" : "— add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">
              Set your Twilio webhook to:{" "}
              <code className="text-xs bg-muted px-1 rounded">{window.location.origin}/api/webhooks/twilio/inbound</code>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Enable toggle */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Enable AI Receptionist</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                When on, inbound SMS messages may receive an AI-generated reply. Recommended only after testing with real messages.
              </p>
              {!fullyConfigured && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Complete setup above before enabling
                </p>
              )}
              {fullyConfigured && enabled && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Active — monitor Messages inbox to review AI replies
                </p>
              )}
            </div>
            <Switch
              checked={enabled}
              disabled={!fullyConfigured}
              onCheckedChange={(v) => {
                setEnabled(v);
                saveMutation.mutate({
                  enabled: v,
                  personaName,
                  systemPrompt,
                  businessHours: useBusinessHours ? businessHours : undefined,
                  afterHoursMessage: afterHoursMsg,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Persona */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> AI Persona
          </CardTitle>
          <CardDescription>Customize how the AI presents itself to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Assistant Name</Label>
            <Input
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="Alex"
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Customers will see "Hi, I'm {personaName || "Alex"} from {"{"}your company{"}"}"
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Custom Instructions (optional)
            </Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`Examples:\n• We specialize in soft washing roofs — never use high pressure\n• Our starting price for house washing is $199\n• We serve Crossville, Cookeville, and Sparta TN only\n• Always offer a free on-site estimate for jobs over 2,000 sqft`}
              rows={5}
              className="text-sm"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">{systemPrompt.length}/2000 — Be specific about your pricing, service area, and anything customers often ask about</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Business Hours
          </CardTitle>
          <CardDescription>
            The AI replies 24/7, but can acknowledge after-hours messages differently
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">Enable business hours awareness</p>
            <Switch checked={useBusinessHours} onCheckedChange={setUseBusinessHours} />
          </div>
          {useBusinessHours && (
            <>
              <Separator />
              <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">After-hours acknowledgment</Label>
                <Textarea
                  value={afterHoursMsg}
                  onChange={(e) => setAfterHoursMsg(e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="We're currently closed. We'll get back to you first thing in the morning!"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        className="w-full bg-slate-800 hover:bg-slate-700 text-white"
        onClick={save}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
      </Button>

      {/* Test chat */}
      {apiOk && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Test Your AI Receptionist
            </CardTitle>
            <CardDescription>
              Try a conversation before going live — uses your saved instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestChat personaName={personaName} />
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-dashed">
        <CardContent className="pt-5 pb-5">
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Zap className="h-4 w-4" /> How it works
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>① Customer texts your Twilio number</p>
            <p>② Claude reads the message + conversation history + any open jobs for that customer</p>
            <p>③ A reply is generated in seconds using your instructions and company context</p>
            <p>④ The reply is sent via Twilio and logged in your Messages inbox</p>
            <p>⑤ You can jump into any conversation at any time to take over manually</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
