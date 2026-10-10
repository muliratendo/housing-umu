/**
 * =============================================================================
 * FILE: lib/logger.ts
 * PURPOSE: Centralized frontend event logger for Booking@UMU.
 *
 * WHY THIS EXISTS (developer note):
 * Every UI state (empty, error, loading-timeout, partial-failure) MUST report
 * to this logger so that:
 *   1. Admins can see WHY a screen was empty/broken without asking the student.
 *   2. We can detect silent failures (actions that produced no visible result).
 *   3. We build a paper trail for security review (OWASP logging guidance:
 *      log security/UX-relevant events server-side, NEVER log secrets/tokens).
 *
 * HOW IT WORKS:
 * - `logEvent()` batches events in memory and flushes to `POST /api/client-logs`
 *   every 3s or when 10 events queue up.
 * - Uses `navigator.sendBeacon` on page unload so logs are not lost when the
 *   user closes the tab mid-session.
 * - Never throws. Logging must NEVER crash the app it is trying to protect.
 * =============================================================================
 */

export type UxStateType =
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "partial"
  | "silent_failure_recovered";

export type UserFlow = "admin" | "student" | "guest";

export interface UxLogPayload {
  stateType: UxStateType;
  component: string;
  userFlow: UserFlow;
  reasonCode: string;
  message: string;
  meta?: Record<string, unknown>;
  correlationId: string;
}

const QUEUE: (UxLogPayload & { ts: string; url: string })[] = [];
const FLUSH_INTERVAL_MS = 3000;
const MAX_QUEUE_BEFORE_FORCE_FLUSH = 10;
const LOG_ENDPOINT = "/api/client-logs";

export function newCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function flush() {
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  const body = JSON.stringify({ events: batch });

  try {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.getAttribute("content") : "";
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon?.(LOG_ENDPOINT, blob);
    if (!sent) {
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf || "" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let logging crash the app.
  }
}

setInterval(flush, FLUSH_INTERVAL_MS);
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}

/**
 * logEvent — call from any state component (EmptyState, ErrorState, etc.)
 */
export function logEvent(payload: UxLogPayload): void {
  QUEUE.push({ ...payload, ts: new Date().toISOString(), url: window.location.pathname });
  if (QUEUE.length >= MAX_QUEUE_BEFORE_FORCE_FLUSH) flush();

  // @ts-ignore - import.meta.env may not exist in all bundler setups
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[ux-log]", payload.stateType, payload.reasonCode, payload);
  }
}

export function forceFlushLogs(): void {
  flush();
}
