import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Zap, Plus, Trash2, Pencil, PlayCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, MessageSquare, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const uid = () => crypto.randomUUID();

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: "job_created", label: "Job Created", description: "When a new job is created" },
  { value: "job_status_changed", label: "Job Status Changed", description: "When a job's status is updated" },
  { value: "job_completed", label: "Job Completed", description: "When a job is marked complete" },
  { value: "quote_sent", label: "Quote Sent", description: "When a quote is sent to a customer" },
  { value: "quote_accepted", label: "Quote Accepted", description: "When a customer accepts a quote" },
  { value: "invoice_created", label: "Invoice Created", description: "When an invoice is generated" },
  { value: "invoice_overdue", label: "Invoice Overdue", description: "When an invoice becomes overdue" },
  { value: "lead_created", label: "Lead Created", description: "When a new lead is added" },
  { value: "visit_completed", label: "Visit Completed", description: "When a crew checks out of a visit" },
  { value: "payment_received", label: "Payment Received", description: "When a payment is recorded" },
] as const;

const ACTION_TYPES = [
  { value: "send_sms", label: "Send SMS", icon: MessageSquare },
  // STUBBED: send_email — email provider not configured
  // { value: "send_email", label: "Send Email", icon: Mail },
  { value: "add_note", label: "Add Note", icon: FileText },
] as const;

const CONDITION_FIELDS: Record<string, { label: string; fields: { value: string; label: string }[] }> = {
  job_status_changed: {
    label: "Job fields",
    fields: [
      { value: "status", label: "Status" },
      { value: "jobNumber", label: "Job Number" },
    ],
  },
  default: {
    label: "Common fields",
    fields: [
      { value: "status", label: "Status" },
      { value: "customerName", label: "Customer Name" },
    ],
  },
};

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

const SMS_VARIABLES = [
  { token: "{{customerName}}", label: "Customer Name" },
  { token: "{{customerFirstName}}", label: "First Name" },
  { token: "{{jobNumber}}", label: "Job #" },
  { token: "{{jobTitle}}", label: "Job Title" },
  { token: "{{status}}", label: "Status" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Condition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string;
}

interface Action {
  id: string;
  type: "send_sms" | "send_email" | "add_note";
  config: Record<string, any>;
}

interface RuleFormState {
  name: string;
  trigger: string;
  conditions: Condition[];
  actions: Action[];
}

const emptyForm = (): RuleFormState => ({
  name: "",
  trigger: "job_completed",
  conditions: [],
  actions: [{ id: uid(), type: "send_sms", config: { message: "" } }],
});

// ─── Action Config Editor ─────────────────────────────────────────────────────

function ActionEditor({
  action,
  onChange,
  onRemove,
  index,
}: {
  action: Action;
  onChange: (updated: Action) => void;
  onRemove: () => void;
  index: number;
}) {
  const TypeIcon = ACTION_TYPES.find((a) => a.value === action.type)?.icon ?? MessageSquare;

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">
          Action {index + 1}
        </span>
        <Select
          value={action.type}
          onValueChange={(v) =>
            onChange({ ...action, type: v as Action["type"], config: {} })
          }
        >
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2">
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {action.type === "send_sms" && (
        <div className="space-y-2">
          <Textarea
            placeholder="Message text... Use {{customerName}}, {{jobNumber}}, etc."
            rows={3}
            value={action.config.message ?? ""}
            onChange={(e) =>
              onChange({ ...action, config: { ...action.config, message: e.target.value } })
            }
            className="text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {SMS_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() =>
                  onChange({
                    ...action,
                    config: {
                      ...action.config,
                      message: (action.config.message ?? "") + v.token,
                    },
                  })
                }
                className="text-xs px-2 py-0.5 rounded border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
              >
                {v.token}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STUBBED: send_email — email provider not configured; hidden from UI */}
      {/* {action.type === "send_email" && (
        <div className="space-y-2">
          <Input
            placeholder="Subject line"
            value={action.config.subject ?? ""}
            onChange={(e) =>
              onChange({ ...action, config: { ...action.config, subject: e.target.value } })
            }
            className="text-sm h-8"
          />
          <Textarea
            placeholder="Email body..."
            rows={3}
            value={action.config.body ?? ""}
            onChange={(e) =>
              onChange({ ...action, config: { ...action.config, body: e.target.value } })
            }
            className="text-sm"
          />
        </div>
      )} */}

      {action.type === "add_note" && (
        <Textarea
          placeholder="Note text..."
          rows={2}
          value={action.config.note ?? ""}
          onChange={(e) =>
            onChange({ ...action, config: { ...action.config, note: e.target.value } })
          }
          className="text-sm"
        />
      )}
    </div>
  );
}

// ─── Rule Builder Dialog ──────────────────────────────────────────────────────

function RuleBuilderDialog({
  open,
  onClose,
  editRule,
}: {
  open: boolean;
  onClose: () => void;
  editRule?: any;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<RuleFormState>(() =>
    editRule
      ? {
          name: editRule.name,
          trigger: editRule.trigger,
          conditions: (editRule.conditions as Condition[]) ?? [],
          actions: ((editRule.actions as Action[]) ?? []).map((a) => ({
            ...a,
            id: a.id ?? uid(),
          })),
        }
      : emptyForm()
  );

  // Reset when dialog opens
  const handleOpen = () => {
    if (editRule) {
      setForm({
        name: editRule.name,
        trigger: editRule.trigger,
        conditions: (editRule.conditions as Condition[]) ?? [],
        actions: ((editRule.actions as Action[]) ?? []).map((a: any) => ({
          ...a,
          id: a.id ?? uid(),
        })),
      });
    } else {
      setForm(emptyForm());
    }
  };

  const createMutation = trpc.automations.create.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automation created");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.automations.update.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automation saved");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.actions.length === 0) return toast.error("Add at least one action");

    const payload = {
      name: form.name.trim(),
      trigger: form.trigger as any,
      conditions: form.conditions,
      actions: form.actions,
      enabled: true,
    };

    if (editRule) {
      updateMutation.mutate({ id: editRule.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function addCondition() {
    setForm((f) => ({
      ...f,
      conditions: [...f.conditions, { field: "status", operator: "equals", value: "" }],
    }));
  }

  function addAction() {
    setForm((f) => ({
      ...f,
      actions: [...f.actions, { id: uid(), type: "send_sms", config: { message: "" } }],
    }));
  }

  const conditionFields =
    CONDITION_FIELDS[form.trigger]?.fields ?? CONDITION_FIELDS.default.fields;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRule ? "Edit Automation" : "New Automation"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Automation Name</Label>
            <Input
              placeholder="e.g. Thank You SMS After Job Complete"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <Label>Trigger — When this happens...</Label>
            <Select
              value={form.trigger}
              onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions <span className="text-muted-foreground font-normal">(optional — all must match)</span></Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addCondition}>
                <Plus className="h-3 w-3 mr-1" /> Add Condition
              </Button>
            </div>
            {form.conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No conditions — rule will run on every trigger
              </p>
            ) : (
              form.conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={cond.field}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        conditions: f.conditions.map((c, ci) =>
                          ci === i ? { ...c, field: v } : c
                        ),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionFields.map((cf) => (
                        <SelectItem key={cf.value} value={cf.value}>{cf.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        conditions: f.conditions.map((c, ci) =>
                          ci === i ? { ...c, operator: v as Condition["operator"] } : c
                        ),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="value"
                    value={cond.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        conditions: f.conditions.map((c, ci) =>
                          ci === i ? { ...c, value: e.target.value } : c
                        ),
                      }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        conditions: f.conditions.filter((_, ci) => ci !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Actions — Do this...</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addAction}>
                <Plus className="h-3 w-3 mr-1" /> Add Action
              </Button>
            </div>
            {form.actions.map((action, i) => (
              <ActionEditor
                key={action.id}
                action={action}
                index={i}
                onChange={(updated) =>
                  setForm((f) => ({
                    ...f,
                    actions: f.actions.map((a) => (a.id === action.id ? updated : a)),
                  }))
                }
                onRemove={() =>
                  setForm((f) => ({
                    ...f,
                    actions: f.actions.filter((a) => a.id !== action.id),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {editRule ? "Save Changes" : "Create Automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule Row ─────────────────────────────────────────────────────────────────

function RuleRow({ rule, onEdit, onDelete }: { rule: any; onEdit: () => void; onDelete: () => void }) {
  const utils = trpc.useUtils();
  const [showLogs, setShowLogs] = useState(false);
  const { data: logs } = trpc.automations.logs.useQuery(
    { ruleId: rule.id, limit: 10 },
    { enabled: showLogs }
  );

  const toggleMutation = trpc.automations.toggle.useMutation({
    onSuccess: () => utils.automations.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const trigger = TRIGGERS.find((t) => t.value === rule.trigger);
  const actions = (rule.actions as any[]) ?? [];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, enabled: checked })}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{rule.name}</span>
            <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
              {rule.enabled ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground flex-wrap">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>{trigger?.label ?? rule.trigger}</span>
            <span className="mx-1">→</span>
            {actions.map((a: any) => {
              const t = ACTION_TYPES.find((at) => at.value === a.type);
              return (
                <span key={a.id} className="flex items-center gap-0.5">
                  {t && <t.icon className="h-3 w-3" />}
                  {t?.label ?? a.type}
                </span>
              );
            })}
          </div>
          {rule.runCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Ran {rule.runCount} time{rule.runCount !== 1 ? "s" : ""}
              {rule.lastRunAt && ` · Last: ${new Date(rule.lastRunAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowLogs((s) => !s)}
          >
            Logs {showLogs ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showLogs && (
        <div className="border-t bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent Runs</p>
          {!logs || logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No runs yet</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  {log.status === "success" ? (
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                  ) : log.status === "skipped" ? (
                    <PlayCircle className="h-3 w-3 text-yellow-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span className={cn(
                    "capitalize",
                    log.status === "success" ? "text-green-700" :
                    log.status === "skipped" ? "text-yellow-700" : "text-red-700"
                  )}>
                    {log.status}
                  </span>
                  {log.entityType && (
                    <span className="text-muted-foreground">
                      · {log.entityType} #{log.entityId}
                    </span>
                  )}
                  {log.error && (
                    <span className="text-red-600 truncate max-w-xs">{log.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Automations() {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.automations.list.useQuery();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = trpc.automations.delete.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      setDeleteId(null);
      toast.success("Automation deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const activeCount = (rules as any[]).filter((r: any) => r.enabled).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" /> Automations
            <Badge variant="secondary" className="text-xs font-medium">Beta</Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Auto-run actions when things happen in your CRM. SMS delivery requires Twilio to be configured. Email actions are not yet supported.
          </p>
        </div>
        <Button onClick={() => { setEditRule(null); setShowBuilder(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Automation
        </Button>
      </div>

      {/* Stats */}
      {rules.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{rules.length}</span> rule{rules.length !== 1 ? "s" : ""} total
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-green-600">{activeCount}</span> active
          </span>
        </div>
      )}

      {/* Rule list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No automations yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Create your first automation to save time on repetitive tasks
            </p>
            <Button onClick={() => { setEditRule(null); setShowBuilder(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(rules as any[]).map((rule: any) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onEdit={() => { setEditRule(rule); setShowBuilder(true); }}
              onDelete={() => setDeleteId(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Templates / Ideas card */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">💡 Automation ideas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>→ SMS customer "Thanks for your business!" when a job is completed</p>
          <p>→ SMS customer "Your quote is ready to review!" when a quote is sent</p>
          <p>→ SMS customer "Your invoice is ready" when an invoice is created</p>
          <p>→ SMS reminder when a payment becomes overdue</p>
        </CardContent>
      </Card>

      {/* Builder dialog */}
      <RuleBuilderDialog
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditRule(null); }}
        editRule={editRule}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this automation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the rule and all its run history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
