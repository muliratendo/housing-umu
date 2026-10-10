/**
 * =============================================================================
 * FILE: components/states/LoadingIndicator.tsx
 * PURPOSE: The single decision-making component for "what loader to show".
 *
 * DECISION LOGIC (see docs/RESEARCH_NOTES.md for citations):
 *   elapsedMs < 300ms   -> render nothing (avoids "flash of loader")
 *   determinate task    -> always show progress bar with % immediately
 *   1s - 5s              -> spinner, no text
 *   5s - 10s              -> spinner + changing status text
 *   >10s                 -> escalate to stalled/step message, stop looping spinner
 * =============================================================================
 */
import { useEffect, useState } from "react";

export type LoaderVariant = "skeleton" | "spinner" | "inline-spinner" | "progress-bar" | "none";

interface LoadingIndicatorProps {
  startedAt: number | null;
  preferredVariant: "skeleton" | "spinner" | "inline-spinner";
  determinateProgress?: number;
  skeleton?: React.ReactNode;
  label: string;
}

const CHANGING_MESSAGES = ["Still working on it…", "Almost there…", "Just a little longer…"];

export function LoadingIndicator({
  startedAt, preferredVariant, determinateProgress, skeleton, label,
}: LoadingIndicatorProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  if (elapsedMs < 300 && determinateProgress === undefined) return null;

  if (determinateProgress !== undefined) {
    return (
      <div role="status" aria-live="polite" aria-label={label} className="ux-progress-bar" data-testid="progress-bar">
        <div className="ux-progress-bar__track">
          <div className="ux-progress-bar__fill" style={{ width: `${determinateProgress}%` }} />
        </div>
        <span className="ux-progress-bar__pct">{Math.round(determinateProgress)}%</span>
      </div>
    );
  }

  if (elapsedMs > 10000) {
    return (
      <div role="status" aria-live="polite" className="ux-loading-stalled" data-testid="loading-stalled">
        <div className="ux-progress-bar__track ux-progress-bar__track--indeterminate" />
        <p className="ux-loading-stalled__text">
          This is taking longer than usual. You can keep waiting, or check back shortly —
          we&apos;ll keep trying in the background.
        </p>
      </div>
    );
  }

  if (preferredVariant === "skeleton") {
    return (
      <div role="status" aria-live="polite" aria-label={label} data-testid="skeleton" className="ux-skeleton-wrapper">
        {skeleton}
      </div>
    );
  }

  if (preferredVariant === "inline-spinner") {
    return <span role="status" aria-label={label} className="ux-inline-spinner" data-testid="inline-spinner" />;
  }

  const msgIndex = elapsedMs > 7500 ? 2 : elapsedMs > 5000 ? 1 : elapsedMs > 2000 ? 0 : -1;
  return (
    <div role="status" aria-live="polite" className="ux-spinner-wrapper" data-testid="spinner">
      <span className="ux-spinner" aria-label={label} />
      {msgIndex >= 0 && <p className="ux-spinner__text">{CHANGING_MESSAGES[msgIndex]}</p>}
    </div>
  );
}
