// resources/js/hooks/use-radix-pointer-events-fix.ts
// Defensive backstop for Radix's dismissable-layer pointer-events bug when
// a Popover is nested inside a Dialog (only relevant if any individual
// @radix-ui/react-* package ever gets reintroduced alongside the unified
// `radix-ui` package). Safe to keep even when not strictly needed.
import * as React from 'react';

export function useRadixPointerEventsFix(open: boolean) {
  React.useEffect(() => {
    if (open) return;
    const timeoutId = window.setTimeout(() => {
      const anyLayerStillOpen = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][data-radix-popper-content-wrapper], [role="listbox"][data-state="open"]'
      );
      if (!anyLayerStillOpen && document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);
}
