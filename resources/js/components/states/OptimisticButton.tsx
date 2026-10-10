/**
 * =============================================================================
 * FILE: components/states/OptimisticButton.tsx
 * PURPOSE: Optimistic UI pattern (e.g. "like"/bookmark a hostel listing).
 *
 * The UI updates INSTANTLY on click, before the server confirms. If the
 * server call fails, the change is rolled back and an inline error is shown
 * next to the control (closest-to-issue error placement rule). Tesler's Law
 * in action: complexity of "did it save?" is absorbed by the engineer.
 * =============================================================================
 */
import { useState } from "react";
import { logEvent, newCorrelationId, UserFlow } from "../../lib/logger";

interface OptimisticButtonProps {
  component: string;
  userFlow: UserFlow;
  initialActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onToggle: (nextActive: boolean) => Promise<void>;
}

export function OptimisticButton({
  component, userFlow, initialActive, activeLabel, inactiveLabel, onToggle,
}: OptimisticButtonProps) {
  const [active, setActive] = useState(initialActive);
  const [rolledBackError, setRolledBackError] = useState(false);

  const handleClick = async () => {
    const next = !active;
    setActive(next);
    setRolledBackError(false);
    try {
      await onToggle(next);
    } catch {
      setActive(!next);
      setRolledBackError(true);
      logEvent({
        stateType: "error", component, userFlow, reasonCode: "OPTIMISTIC_ROLLBACK",
        message: `Optimistic update rolled back for ${component}`, correlationId: newCorrelationId(),
      });
    }
  };

  return (
    <div className="ux-optimistic-btn-wrapper">
      <button type="button" className="ux-btn ux-btn--optimistic" onClick={handleClick} aria-pressed={active}>
        {active ? activeLabel : inactiveLabel}
      </button>
      {rolledBackError && <span className="ux-inline-error" role="alert">Didn&apos;t save. Try again.</span>}
    </div>
  );
}
