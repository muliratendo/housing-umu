/**
 * =============================================================================
 * FILE: components/states/ErrorState.tsx
 * PURPOSE: Renders all THREE error placements: toast, modal, inline.
 *
 * SECURITY NOTE (PortSwigger / OWASP alignment): this component NEVER
 * receives or renders raw exception messages, stack traces, SQL errors, or
 * backend paths. It only accepts a `reasonCode` + pre-approved `userMessage`
 * string chosen from ERROR_COPY below. The real error is sent ONLY to the
 * backend logger and never present in the browser's JS bundle, console, or DOM.
 *
 * FIX (2026-08-15): previously looked up placement from a static ERROR_COPY
 * dictionary keyed by reasonCode, which meant a component's own error state
 * could independently decide to render a modal. That's how TWO unrelated,
 * non-essential sections (Recommended Hostels, Recent Activity) each opened
 * their own full-page-blocking modal at once — nothing coordinated them.
 *
 * FIX: placement is now REQUIRED as a prop, always sourced directly from
 * `classifyError()` (single source of truth) rather than re-derived here.
 * ERROR_COPY below is kept only as the approved copy/placement REFERENCE
 * table that classifyError() and callers should consult — this component
 * itself no longer reads from it directly. This component also refuses to
 * render more than one modal at a time app-wide via a simple module-level
 * lock — if a second section tries to open a modal while one is already
 * open, it's downgraded to inline automatically and logged.
 * =============================================================================
 */
import { useEffect, useState } from "react";
import { logEvent, newCorrelationId } from "@/lib/logger";
import type { UserFlow } from "@/lib/logger";
import type { ErrorPlacement } from "@/lib/classifyError";


interface ErrorAction {
  label: string;
  onClick?: () => void;
  href?: string;
}


interface ErrorStateProps {
  component: string;
  userFlow: UserFlow;
  reasonCode: string;
  userMessage: string;
  placement: ErrorPlacement;
  primaryAction?: ErrorAction;
  onDismiss?: () => void;
  autoDismissMs?: number;
}


// Module-level guard: only ONE modal-placement error may be visible across
// the entire app at a time. This directly prevents the "3 stacked modals"
// failure mode seen in production.
let modalCurrentlyOpen = false;


export function ErrorState({
  component, userFlow, reasonCode, userMessage, placement,
  primaryAction, onDismiss, autoDismissMs = 4000,
}: ErrorStateProps) {
  // FIX: effectivePlacement lets a "modal" request be downgraded to
  // "inline" at runtime (the concurrency guard below) while everything else
  // — logging, auto-dismiss, rendering — still keys off the originally
  // requested `placement` where that's the correct behaviour (e.g. a toast
  // auto-dismiss timer shouldn't start just because a modal got downgraded).
  const [effectivePlacement, setEffectivePlacement] = useState<ErrorPlacement>(placement);

  useEffect(() => {
    logEvent({
      stateType: "error", component, userFlow, reasonCode,
      message: `ErrorState (${placement}) shown: ${userMessage}`, correlationId: newCorrelationId(),
    });
  }, [component, userFlow, reasonCode, userMessage, placement]);

  useEffect(() => {
    if (placement !== "modal") return;

    if (modalCurrentlyOpen) {
      // FIX: a modal is already showing somewhere else on the page.
      // Downgrade this one to inline instead of stacking on top of it,
      // and log it so the double-failure is still visible to developers.
      setEffectivePlacement("inline");
      logEvent({
        stateType: "error", component, userFlow, reasonCode: `${reasonCode}_MODAL_DOWNGRADED`,
        message: `Suppressed a second concurrent modal for ${component}; downgraded to inline`,
        correlationId: newCorrelationId(),
      });
      return;
    }

    modalCurrentlyOpen = true;
    return () => { modalCurrentlyOpen = false; };
  }, [placement, component, userFlow, reasonCode]);

  useEffect(() => {
    if (effectivePlacement !== "toast") return;
    const id = setTimeout(() => onDismiss?.(), autoDismissMs);
    return () => clearTimeout(id);
  }, [effectivePlacement, autoDismissMs, onDismiss]);

  const renderAction = (action: ErrorAction, className: string) =>
    action.href ? (
      <a href={action.href} className={className}>{action.label}</a>
    ) : (
      <button type="button" className={className} onClick={action.onClick}>{action.label}</button>
    );

  if (effectivePlacement === "toast") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="ux-toast"
        data-testid="error-toast"
        data-reason-code={reasonCode}
      >
        {userMessage}
      </div>
    );
  }

  if (effectivePlacement === "modal") {
    return (
      <div className="ux-modal-overlay" role="alertdialog" aria-modal="true" data-testid="error-modal">
        <div className="ux-modal" data-reason-code={reasonCode}>
          <p className="ux-modal__message">{userMessage}</p>
          <div className="ux-modal__actions">
            {primaryAction && renderAction(primaryAction, "ux-btn ux-btn--primary")}
            {onDismiss && (
              <button type="button" className="ux-btn ux-btn--secondary" onClick={onDismiss}>Close</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // inline — the default, scoped entirely to this section's own container.
  // Also covers the downgraded-from-modal case above.
  return (
    <div
      role="alert"
      className="ux-inline-error ux-inline-error--shake-safe"
      data-testid="error-inline"
      data-reason-code={reasonCode}
    >
      {userMessage}
      {primaryAction && renderAction(primaryAction, "ux-inline-error__retry")}
    </div>
  );
}


/**
 * ERROR COPY LIBRARY — approved, generic-but-informative user-facing messages.
 * NEVER interpolate raw backend text into these. Map 1:1 to backend reason
 * codes returned by ApiExceptionRenderer.php.
 *
 * FIX: this table is now consumed ONLY by `classifyError()` (the single
 * source of truth for placement decisions), not by ErrorState directly.
 * ErrorState always receives an explicit, already-resolved `placement` prop
 * — this prevents any individual component from independently deciding to
 * pop a modal, which was the root cause of the stacked-modal bug.
 */
export const ERROR_COPY: Record<string, { userMessage: string; placement: ErrorPlacement }> = {
  PAYMENT_DECLINED: {
    userMessage: "Your payment didn't go through. Your card was declined. Please check your card details or try a different payment method.",
    placement: "modal",
  },
  PERMISSION_DENIED: {
    userMessage: "You don't have access to this hostel. Request access from an admin to continue.",
    placement: "modal",
  },
  NETWORK_OFFLINE: { userMessage: "Couldn't connect. Retrying…", placement: "toast" },
  SERVER_ERROR: { userMessage: "We hit a snag saving that. Please try again in a moment.", placement: "inline" },
  VALIDATION_FAILED: { userMessage: "Please fix the highlighted fields before continuing.", placement: "inline" },
  SESSION_EXPIRED: { userMessage: "Your session expired for your security. Please log in again to continue.", placement: "modal" },
  UNKNOWN_ERROR: { userMessage: "Something didn't work as expected. Please try again — if this keeps happening, contact support.", placement: "inline" },
};
