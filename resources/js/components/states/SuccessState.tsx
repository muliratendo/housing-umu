/**
 * =============================================================================
 * FILE: components/states/SuccessState.tsx
 * PURPOSE: Consistent, proportionate success feedback.
 *
 * RULE OF PROPORTION: celebration size matches achievement size:
 *   "micro"     -> tiny inline checkmark (e.g. drag card to Done)
 *   "toast"     -> brief confirmation banner (e.g. "Saved")
 *   "milestone" -> full-screen celebratory moment (e.g. "Application submitted!")
 * =============================================================================
 */
import { useEffect } from "react";
import { logEvent, newCorrelationId, UserFlow } from "../../lib/logger";

interface SuccessStateProps {
  component: string;
  userFlow: UserFlow;
  reasonCode: string;
  tier: "micro" | "toast" | "milestone";
  message: string;
  onDismiss?: () => void;
}

export function SuccessState({ component, userFlow, reasonCode, tier, message, onDismiss }: SuccessStateProps) {
  useEffect(() => {
    logEvent({
      stateType: "success", component, userFlow, reasonCode,
      message: `SuccessState(${tier}): ${message}`, correlationId: newCorrelationId(),
    });
  }, [component, userFlow, reasonCode, tier, message]);

  useEffect(() => {
    if (tier === "milestone") return;
    const id = setTimeout(() => onDismiss?.(), tier === "toast" ? 3000 : 1200);
    return () => clearTimeout(id);
  }, [tier, onDismiss]);

  if (tier === "micro") {
    return <span className="ux-success-micro" data-testid="success-micro" role="status">✓ {message}</span>;
  }
  if (tier === "toast") {
    return <div className="ux-toast ux-toast--success" role="status" data-testid="success-toast">{message}</div>;
  }
  return (
    <div className="ux-milestone-overlay" role="status" data-testid="success-milestone">
      <div className="ux-milestone-card">
        <div className="ux-milestone-card__confetti" aria-hidden="true" />
        <p className="ux-milestone-card__message">{message}</p>
        {onDismiss && <button type="button" className="ux-btn ux-btn--primary" onClick={onDismiss}>Continue</button>}
      </div>
    </div>
  );
}
