/**
 * =============================================================================
 * FILE: hooks/useAsyncSection.ts
 * PURPOSE: The ONE hook every independent page section uses to fetch its own
 * data. Each section owns its own loading/error/empty/success state
 * INDEPENDENTLY, so one broken section never takes down the rest of the page.
 *
 * FIX (2026-08-15): classifyError() previously collapsed 401 AND 403 into a
 * single "PERMISSION_DENIED" reason code that renders as a page-blocking
 * MODAL. This is why the dashboard felt fully broken even though only two
 * minor sections failed — see docs/WHY_DASHBOARD_LOCKED_UP.md for the full
 * explanation. This version:
 *   1. Splits every distinct HTTP status family into its own reason code,
 *      covering the full IANA/Wikipedia status code list (400-599, plus
 *      1xx/3xx edge cases that can leak through fetch() in rare setups).
 *   2. Attaches a `placement` hint (modal | toast | inline) to EVERY
 *      classification, computed from severity, not guessed later by the
 *      component — the classifier owns severity because it has the status
 *      code, the UI layer should not re-decide it.
 *   3. Never uses the words "something went wrong" anywhere in copy.
 * =============================================================================
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RequestState } from "../lib/requestState";
import { logEvent, newCorrelationId } from "../lib/logger";
import type { UserFlow } from "../lib/logger";
import { classifyError, type ErrorPlacement } from "../lib/classifyError";

interface UseAsyncSectionOptions<T> {
  component: string;
  userFlow: UserFlow;
  fetcher: () => Promise<T>;
  isEmptyResult: (data: T) => boolean;
  emptyReasonCode: string;
  maxAutoRetries?: number;
  deps?: unknown[];
}

export function useAsyncSection<T>(opts: UseAsyncSectionOptions<T>) {
  const { component, userFlow, fetcher, isEmptyResult, emptyReasonCode, maxAutoRetries = 2 } = opts;
  const [state, setState] = useState<RequestState<T>>({ status: "idle" });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(async (isBackgroundRefresh = false) => {
    const correlationId = newCorrelationId();
    setStartedAt(Date.now());

    setState((prev) => {
      if (isBackgroundRefresh && prev.status === "success") {
        return { status: "refreshing", data: prev.data };
      }
      return { status: "loading" };
    });

    try {
      const data = await fetcher();
      if (!mountedRef.current) return;
      retryCountRef.current = 0;

      if (isEmptyResult(data)) {
        setState({ status: "empty", reasonCode: emptyReasonCode });
        logEvent({
          stateType: "empty", component, userFlow, reasonCode: emptyReasonCode,
          message: `Empty state rendered for ${component}`, correlationId,
          meta: { isBackgroundRefresh },
        });
        return;
      }

      setState({ status: "success", data });
      logEvent({
        stateType: "success", component, userFlow, reasonCode: "DATA_LOADED",
        message: `Section ${component} loaded successfully`, correlationId,
        meta: { isBackgroundRefresh },
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const classified = classifyError(err);

      if (classified.retryable && retryCountRef.current < maxAutoRetries) {
        retryCountRef.current += 1;
        const backoffMs = Math.min(1000 * 2 ** retryCountRef.current, 8000);
        logEvent({
          stateType: "error", component, userFlow,
          reasonCode: `${classified.reasonCode}_AUTORETRY_${retryCountRef.current}`,
          message: `Retrying ${component} after transient error`, correlationId,
          meta: { backoffMs, err: String((err as Error)?.message ?? err) },
        });
        setTimeout(() => run(isBackgroundRefresh), backoffMs);
        return;
      }

      // FIX: `placement` now travels WITH the classification, computed once
      // by classifyError — components no longer independently decide "this
      // error should be a modal," which is what let two unrelated section
      // failures both escalate to full-page-blocking dialogs.
      setState({ status: "error", ...classified });
      logEvent({
        stateType: "error", component, userFlow, reasonCode: classified.reasonCode,
        message: `Section ${component} failed after ${retryCountRef.current} retries`,
        correlationId, meta: {
          err: String((err as Error)?.message ?? err),
          placement: classified.placement,
        },
      });
    }
  }, [component, userFlow, fetcher, isEmptyResult, emptyReasonCode, maxAutoRetries]);

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, opts.deps ?? []);

  const retry = useCallback(() => { retryCountRef.current = 0; run(false); }, [run]);
  const backgroundRefresh = useCallback(() => run(true), [run]);

  return { state, retry, backgroundRefresh, startedAt };
}
