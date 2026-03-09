/**
 * Automation Engine
 *
 * Evaluates automation rules when trigger events occur and executes configured actions.
 * Actions supported:
 *   - send_sms: Send an SMS to the customer via Twilio
 *   - send_email: Placeholder (log only; swap in email provider as needed)
 *   - add_note: Append a note to the job/customer record
 *   - wait_then_sms: Schedule a delayed SMS (simplified: executed immediately for now)
 *
 * To trigger: import `fireAutomation` and call it after any relevant DB mutation.
 */

import {
  findOrCreateConversation,
  getCustomer,
  getEnabledAutomationsByTrigger,
  getJob,
  insertSmsMessage,
  logAutomationRun,
} from "../db";
import { ENV } from "../_core/env";
import { getTwilioClient } from "../_core/sms";

export type TriggerEvent =
  | "job_created"
  | "job_status_changed"
  | "job_completed"
  | "quote_sent"
  | "quote_accepted"
  | "invoice_created"
  | "invoice_overdue"
  | "lead_created"
  | "visit_completed"
  | "payment_received";

export interface TriggerContext {
  companyId: number;
  entityType: "job" | "quote" | "invoice" | "lead" | "visit" | "payment";
  entityId: number;
  // Hydrated data for template interpolation
  data?: Record<string, any>;
}

/** Interpolate {{variable}} tokens in a template string */
function interpolate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return ctx[key] !== undefined ? String(ctx[key]) : `{{${key}}}`;
  });
}

/** Check if all conditions pass for this rule */
function evaluateConditions(conditions: any[], data: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => {
    const val = data[cond.field];
    switch (cond.operator) {
      case "equals": return String(val) === String(cond.value);
      case "not_equals": return String(val) !== String(cond.value);
      case "contains": return String(val ?? "").toLowerCase().includes(String(cond.value).toLowerCase());
      case "greater_than": return Number(val) > Number(cond.value);
      case "less_than": return Number(val) < Number(cond.value);
      default: return true;
    }
  });
}

async function executeSendSms(
  action: { message: string },
  entityData: Record<string, any>,
  companyId: number,
  customerId?: number
): Promise<{ success: boolean; detail: string }> {
  if (!customerId) return { success: false, detail: "No customer linked" };

  const customer = await getCustomer(customerId, companyId);
  if (!customer?.phone) return { success: false, detail: "Customer has no phone number" };

  const body = interpolate(action.message, entityData);
  const fromPhone = ENV.TWILIO_PHONE_NUMBER;

  // Store conversation + message regardless of Twilio status
  const convo = await findOrCreateConversation(
    companyId,
    customer.phone,
    customer.id,
    `${customer.firstName} ${customer.lastName}`.trim()
  );

  let twilioSid: string | undefined;
  let status: "sent" | "failed" | "queued" = "queued";

  const client = await getTwilioClient();
  if (client && fromPhone && convo) {
    try {
      const msg = await client.messages.create({ body, from: fromPhone, to: customer.phone });
      twilioSid = msg.sid;
      status = "sent";
      console.log(`[Automation] SMS sent to ${customer.phone} (SID: ${msg.sid})`);
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      console.error(`[Automation] SMS send failed to ${customer.phone}:`, errorMsg);
      status = "failed";
    }
  }

  if (convo) {
    await insertSmsMessage({
      conversationId: convo.id,
      companyId,
      direction: "outbound",
      body,
      twilioSid,
      status,
    });
  }

  return { success: status !== "failed", detail: `SMS to ${customer.phone}: "${body.slice(0, 60)}..."` };
}

/** Main entry point — call this after any event that should trigger automations */
export async function fireAutomation(event: TriggerEvent, ctx: TriggerContext) {
  try {
    const rules = await getEnabledAutomationsByTrigger(ctx.companyId, event);
    if (!rules.length) return;

    // Hydrate entity data for template interpolation + condition evaluation
    let entityData: Record<string, any> = ctx.data ?? {};
    let customerId: number | undefined;

    if (ctx.entityType === "job") {
      const job = await getJob(ctx.entityId, ctx.companyId);
      if (job) {
        customerId = job.customerId;
        entityData = {
          jobNumber: job.jobNumber,
          jobTitle: job.title ?? "",
          status: job.status,
          customerFirstName: "",
          customerLastName: "",
          ...entityData,
        };
        // Enrich with customer name if available
        const customer = await getCustomer(job.customerId, ctx.companyId);
        if (customer) {
          entityData.customerFirstName = customer.firstName ?? "";
          entityData.customerLastName = customer.lastName ?? "";
          entityData.customerName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
          entityData.customerPhone = customer.phone ?? "";
          customerId = customer.id;
        }
      }
    }

    for (const rule of rules) {
      try {
        // Evaluate conditions
        const conditions = (rule.conditions as any[]) ?? [];
        if (!evaluateConditions(conditions, entityData)) {
          await logAutomationRun({
            ruleId: rule.id,
            companyId: ctx.companyId,
            triggerEvent: event,
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            status: "skipped",
            actionsRun: [{ reason: "Conditions not met" }],
          });
          continue;
        }

        const actions = (rule.actions as any[]) ?? [];
        const actionsRun: any[] = [];

        for (const action of actions) {
          switch (action.type) {
            case "send_sms": {
              const result = await executeSendSms(action.config, entityData, ctx.companyId, customerId);
              actionsRun.push({ type: "send_sms", ...result });
              break;
            }
            case "send_email": {
              // Placeholder — wire in email provider (SendGrid, Resend, etc.)
              console.log(`[Automation] Email action (not yet wired): "${action.config?.subject}"`);
              actionsRun.push({ type: "send_email", success: true, detail: "Email provider not configured" });
              break;
            }
            case "add_note": {
              // Note text is stored in the automation log below; no separate note record is created yet.
              actionsRun.push({ type: "add_note", success: true, detail: `(log only) ${action.config?.note ?? ""}` });
              break;
            }
            default:
              actionsRun.push({ type: action.type, success: false, detail: "Unknown action type" });
          }
        }

        await logAutomationRun({
          ruleId: rule.id,
          companyId: ctx.companyId,
          triggerEvent: event,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          status: "success",
          actionsRun,
        });
      } catch (ruleErr: any) {
        console.error(`[Automation] Rule ${rule.id} failed:`, ruleErr.message);
        await logAutomationRun({
          ruleId: rule.id,
          companyId: ctx.companyId,
          triggerEvent: event,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          status: "failed",
          error: ruleErr.message,
        });
      }
    }
  } catch (err: any) {
    console.error("[Automation] Engine error:", err.message);
  }
}
