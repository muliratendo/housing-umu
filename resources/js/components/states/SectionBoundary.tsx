/**
 * =============================================================================
 * FILE: components/states/SectionBoundary.tsx
 * PURPOSE: Implements GRACEFUL DEGRADATION at the component level.
 *
 * Wrap EVERY independently-fetched section of a page (profile card, hostel
 * grid, applications table, sidebar stats) in a <SectionBoundary>. If that
 * section's render crashes, ONLY this section shows an error + retry button —
 * the rest of the page keeps working (Instagram/YouTube pattern).
 * =============================================================================
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { logEvent, newCorrelationId, UserFlow } from "../../lib/logger";

interface SectionBoundaryProps {
  component: string;
  userFlow: UserFlow;
  children: ReactNode;
  fallback?: ReactNode;
}

interface SectionBoundaryState { hasRenderError: boolean; }

export class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = { hasRenderError: false };

  static getDerivedStateFromError() { return { hasRenderError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logEvent({
      stateType: "error", component: this.props.component, userFlow: this.props.userFlow,
      reasonCode: "RENDER_CRASH_ISOLATED",
      message: `Section ${this.props.component} crashed but was isolated from the rest of the page`,
      correlationId: newCorrelationId(),
      meta: { errorMessage: error.message, componentStack: info.componentStack },
    });
  }

  retry = () => this.setState({ hasRenderError: false });

  render() {
    if (this.state.hasRenderError) {
      return this.props.fallback ?? (
        <div className="ux-section-error" role="alert" data-testid="section-boundary-fallback">
          <p>This part of the page ran into a problem. The rest of the page still works.</p>
          <button type="button" className="ux-btn ux-btn--secondary" onClick={this.retry}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
