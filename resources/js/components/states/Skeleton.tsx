/**
 * =============================================================================
 * FILE: components/states/Skeleton.tsx
 * PURPOSE: Reusable animated skeleton primitives.
 *
 * CRITICAL RESEARCH-BACKED RULE (do not simplify away): the shimmer animation
 * MUST sweep left-to-right at a SLOW, steady pace using a moving gradient —
 * NOT an opacity pulse/fade. See styles/states.css `@keyframes ux-shimmer`.
 * =============================================================================
 */
export function SkeletonLine({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return <div className="ux-skeleton-line" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="ux-skeleton-card" aria-hidden="true">
      <div className="ux-skeleton-line ux-skeleton-line--avatar" />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="60%" height={16} />
        <SkeletonLine width="90%" />
        <SkeletonLine width="40%" />
      </div>
    </div>
  );
}

export function HostelListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ux-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
