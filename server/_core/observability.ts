/**
 * Lightweight observability helpers for the CRM server.
 *
 * Provides structured logging that is:
 *  - Human-readable in development (single-line with emoji prefix)
 *  - JSON-structured in production (for log aggregators like Datadog / CloudWatch)
 *
 * Usage:
 *   import { logger } from "./_core/observability";
 *   logger.info("quote.submit", { quoteId, totalPrice });
 *   logger.warn("pricePreview.noDb", { companyId });
 *   logger.error("submitV2.insert", err, { customerEmail });
 */

const isProd = process.env.NODE_ENV === "production";

type LogLevel = "info" | "warn" | "error";

function emit(
  level: LogLevel,
  event: string,
  meta: Record<string, unknown> = {},
  err?: unknown
) {
  const ts = new Date().toISOString();
  const errMeta =
    err instanceof Error
      ? { errMsg: err.message, errType: err.constructor?.name ?? "Error" }
      : err
        ? { errMsg: String(err) }
        : {};

  if (isProd) {
    const entry = JSON.stringify({ ts, level, event, ...meta, ...errMeta });
    if (level === "error") process.stderr.write(entry + "\n");
    else process.stdout.write(entry + "\n");
  } else {
    const prefix = level === "error" ? "🔴" : level === "warn" ? "🟡" : "🟢";
    const metaStr = Object.keys({ ...meta, ...errMeta }).length
      ? " " + JSON.stringify({ ...meta, ...errMeta })
      : "";
    const line = `${prefix} [${ts}] ${event}${metaStr}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) =>
    emit("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>, err?: unknown) =>
    emit("warn", event, meta, err),
  error: (event: string, err?: unknown, meta?: Record<string, unknown>) =>
    emit("error", event, meta, err),
};

/**
 * onError handler for the tRPC Express middleware.
 * Logs all server-side tRPC errors with path + shape for observability.
 */
export function trpcOnError({
  error,
  path,
  ctx,
}: {
  error: { code: string; message: string; cause?: unknown };
  path?: string;
  ctx?: { user?: { id?: number; companyId?: number } | null };
}) {
  // Skip client errors (BAD_REQUEST, UNAUTHORIZED) — those are expected validation failures
  const serverErrors = ["INTERNAL_SERVER_ERROR", "TIMEOUT", "SERVICE_UNAVAILABLE"];
  if (!serverErrors.includes(error.code)) return;

  logger.error(`trpc.${path ?? "unknown"}`, error.cause ?? error, {
    code: error.code,
    path: path ?? "unknown",
    userId: ctx?.user?.id,
    companyId: ctx?.user?.companyId,
  });
}
