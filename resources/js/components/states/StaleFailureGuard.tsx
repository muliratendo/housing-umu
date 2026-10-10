/**
 * =============================================================================
 * FILE: components/states/StaleFailureGuard.tsx
 * PURPOSE: Detects and recovers from SILENT FAILURES.
 *
 * FIX (2026-09-12): "stale timeout outlives its own attempt" bug.
 *
 * ROOT CAUSE: the original guard cleared its watchdog timer in a `finally`
 * block once the wrapped action's promise settled, which is correct on its
 * own. The bug appeared one layer up: nothing stopped a NEWER submission
 * (a fresh call to `run()`) from being confused with an OLDER one whose
 * watchdog had already fired. If a user resubmitted while an earlier attempt
 * was still technically in flight, the earlier attempt's "taking longer than
 * expected" warning could still be showing when the newer attempt's own
 * success/error resolved — because the warning had no concept of WHICH
 * attempt it belonged to.
 *
 * FIX: every call to `run()` now gets its own `attemptId`. The watchdog
 * timeout, and the eventual resolution of `action()`, both check that the
 * attempt they belong to is still the CURRENT attempt before touching state.
 * A stale attempt's timer firing late, or its promise settling late, is
 * simply ignored — it can never overwrite the UI for a newer attempt.
 *
 * This directly implements the "one login attempt has one identifiable
 * lifecycle" rule: input -> submit -> Laravel decision -> one final state.
 * =============================================================================
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { logEvent, newCorrelationId, UserFlow } from "../../lib/logger";

const WATCHDOG_MS = 12000;

interface UseSilentFailureGuardOptions {
  component: string;
  userFlow: UserFlow;
  action: () => Promise<void>;
}

function createAttemptId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSilentFailureGuard({
  component,
  userFlow,
  action,
}: UseSilentFailureGuardOptions) {
  const [suspectedSilentFailure, setSuspectedSilentFailure] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: tracks which attempt is currently authoritative. Any callback that
  // fires (timeout OR action settling) for an attempt that is no longer the
  // current one is a no-op — this is what prevents a stale warning or a late
  // success/error from a superseded attempt from touching visible UI state.
  const currentAttemptIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  /**
   * Explicitly invalidates the attempt currently in flight. Call this on a
   * new edit, a new submit, or on unmount so a late timer/response from the
   * old attempt is guaranteed to be ignored, even if it fires a moment
   * later.
   */
  const invalidateCurrentAttempt = useCallback(() => {
    currentAttemptIdRef.current = null;
    clearWatchdog();
    if (mountedRef.current) {
      setSuspectedSilentFailure(false);
    }
  }, [clearWatchdog]);

  const run = useCallback(async () => {
    const correlationId = newCorrelationId();
    const attemptId = createAttemptId();

    // FIX: cancel whatever the previous attempt was doing before starting a
    // new one. This is what stops "Attempt A" from ever overwriting UI that
    // belongs to "Attempt B".
    clearWatchdog();
    currentAttemptIdRef.current = attemptId;

    setSuspectedSilentFailure(false);
    setIsRunning(true);

    watchdogRef.current = setTimeout(() => {
      // FIX: only surface the warning if THIS timer's attempt is still the
      // one the user is currently waiting on.
      if (currentAttemptIdRef.current !== attemptId || !mountedRef.current) {
        return;
      }

      setSuspectedSilentFailure(true);
      logEvent({
        stateType: "silent_failure_recovered",
        component,
        userFlow,
        reasonCode: "WATCHDOG_TIMEOUT",
        message: `Action in ${component} did not resolve within ${WATCHDOG_MS}ms — surfaced recovery UI`,
        correlationId,
        meta: { attemptId },
      });
    }, WATCHDOG_MS);

    try {
      await action();
    } catch {
      // Caller's own try/catch + ErrorState handles surfacing the real error.
    } finally {
      // FIX: only clear shared state if this attempt is still current. If a
      // newer attempt has already started, let ITS lifecycle own the UI —
      // this older attempt settling late must not clear the newer attempt's
      // in-flight indicator.
      if (currentAttemptIdRef.current === attemptId) {
        clearWatchdog();
        currentAttemptIdRef.current = null;
        if (mountedRef.current) {
          setIsRunning(false);
        }
      }
    }
  }, [action, clearWatchdog, component, userFlow]);

  const resubmit = useCallback(() => {
    invalidateCurrentAttempt();
    run();
  }, [invalidateCurrentAttempt, run]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  // FIX: invalidate any in-flight attempt when the owning component unmounts
  // (e.g. Inertia navigated away after a successful redirect) so a timer
  // cannot fire against a page that is no longer on screen.
  useEffect(() => {
    return () => {
      invalidateCurrentAttempt();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    run,
    isRunning,
    suspectedSilentFailure,
    resubmit,
    reload,
    invalidateCurrentAttempt,
  };
}
