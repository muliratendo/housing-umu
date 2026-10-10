/**
 * =============================================================================
 * FILE: components/states/EmptyState.tsx
 * PURPOSE: One universal, flow-aware Empty State component.
 *
 * THE "GRANDMA RULE" (mandatory for every copy string passed here): if your
 * grandmother, who has never used this app, read the title and action button,
 * she should understand what happened and what to do next WITHOUT any
 * technical vocabulary.
 *
 * REQUIRED USAGE CONTRACT:
 *  - Every render of <EmptyState> logs itself via lib/logger.ts automatically.
 *  - `primaryAction` is REQUIRED (not optional). If you truly have nothing
 *    actionable, pass `primaryAction={null}` EXPLICITLY with `celebratory`
 *    copy instead (e.g. zero-inbox / all-caught-up state).
 * =============================================================================
 */
import { useEffect } from "react";
import { logEvent, newCorrelationId, UserFlow } from "../../lib/logger";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  component: string;
  userFlow: UserFlow;
  reasonCode: string;
  title: string;
  explanation: string;
  primaryAction: EmptyStateAction | null;
  secondaryAction?: EmptyStateAction;
  celebratory?: boolean;
  icon?: React.ReactNode;
}

export function EmptyState({
  component, userFlow, reasonCode, title, explanation,
  primaryAction, secondaryAction, celebratory = false, icon,
}: EmptyStateProps) {
  useEffect(() => {
    logEvent({
      stateType: "empty", component, userFlow, reasonCode,
      message: `EmptyState displayed: ${title}`, correlationId: newCorrelationId(),
      meta: { celebratory, hasPrimaryAction: !!primaryAction },
    });
  }, [component, userFlow, reasonCode, title, celebratory, primaryAction]);

  return (
    <div
      className={`ux-empty-state ${celebratory ? "ux-empty-state--celebratory" : ""}`}
      data-testid="empty-state" data-reason-code={reasonCode} role="status"
    >
      {icon && <div className="ux-empty-state__icon">{icon}</div>}
      <h3 className="ux-empty-state__title">{title}</h3>
      <p className="ux-empty-state__explanation">{explanation}</p>
      <div className="ux-empty-state__actions">
        {primaryAction && (primaryAction.href ? (
          <a href={primaryAction.href} className="ux-btn ux-btn--primary">{primaryAction.label}</a>
        ) : (
          <button type="button" className="ux-btn ux-btn--primary" onClick={primaryAction.onClick}>{primaryAction.label}</button>
        ))}
        {secondaryAction && (secondaryAction.href ? (
          <a href={secondaryAction.href} className="ux-btn ux-btn--secondary">{secondaryAction.label}</a>
        ) : (
          <button type="button" className="ux-btn ux-btn--secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * EMPTY STATE COPY LIBRARY — flow-aware presets for Booking@UMU. Centralizing
 * copy here prevents inconsistent tone across the app.
 */
export const EMPTY_STATE_PRESETS: Record<string, (flow: UserFlow) => Omit<EmptyStateProps, "component" | "userFlow">> = {
  NO_APPLICATIONS_YET: () => ({
    reasonCode: "NO_APPLICATIONS_YET",
    title: "You haven't applied to a hostel yet",
    explanation: "Applications you submit will show up here so you can track their progress.",
    primaryAction: { label: "Browse available hostels", href: "/hostels" },
    secondaryAction: { label: "How applications work", href: "/help/applications" },
  }),
  NO_SEARCH_RESULTS: (flow) => ({
    reasonCode: "NO_SEARCH_RESULTS",
    title: "No hostels matched your search",
    explanation: "Try a broader search, or clear your filters to see everything available to you.",
    primaryAction: { label: "Clear filters", onClick: () => {} },
    secondaryAction: flow === "student" ? { label: "Show hostels for my gender only", onClick: () => {} } : undefined,
  }),
  ZERO_PENDING_APPLICATIONS_ADMIN: () => ({
    reasonCode: "ZERO_PENDING_APPLICATIONS_ADMIN",
    title: "All applications are reviewed",
    explanation: "There's nothing waiting on you right now. New applications will appear here automatically.",
    primaryAction: null,
    celebratory: true,
  }),
  NO_HOSTELS_LISTED_ADMIN: () => ({
    reasonCode: "NO_HOSTELS_LISTED_ADMIN",
    title: "No hostels have been added yet",
    explanation: "Students can't apply until at least one hostel is listed with rooms and pricing.",
    primaryAction: { label: "Add your first hostel", href: "/admin/hostels/create" },
  }),
  GUEST_LOGIN_REQUIRED: () => ({
    reasonCode: "GUEST_LOGIN_REQUIRED",
    title: "Log in to see this",
    explanation: "This information is only visible to registered students and staff.",
    primaryAction: { label: "Log in", href: "/login" },
    secondaryAction: { label: "Create an account", href: "/register" },
  }),
};
