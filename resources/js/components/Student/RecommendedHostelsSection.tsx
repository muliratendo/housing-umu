/**
 * =============================================================================
 * FILE: resources/js/components/Student/RecommendedHostelsSection.tsx
 * FIX (2026-08-14): "TypeError: can't access property map, hostels is undefined"
 *
 * ROOT CAUSE: the success-branch render code did:
 *   const hostels = state.data;
 *   ...hostels.map(...)
 * but `useAsyncSection`'s generic type wasn't being respected at the call
 * site consistently — when the backend endpoint returned a response whose
 * JSON body didn't match `HostelCardData[]` exactly (e.g. it returned
 * `{ data: [...] }` wrapped in an object instead of a bare array, which is
 * Laravel's default `response()->json($resource)` behavior when a Resource
 * Collection is used), `state.data` became an object, and destructuring it
 * as `hostels` produced `undefined` when the code expected an array shape
 * mismatch further down. This is a classic "backend response shape drifted
 * from frontend assumption" bug — the exact class of bug flagged in
 * EDGE_CASES.md under "shape drift" and "silent failures."
 *
 * FIX: defend at the render boundary — never trust `state.data` is
 * guaranteed to be an array just because TypeScript says so. Default to []
 * so a shape mismatch shows an empty state instead of crashing, AND fix the
 * fetcher to unwrap `.data` if the backend ever nests it (defensive parsing).
 * =============================================================================
 */
import { useAsyncSection } from "@/hooks/useAsyncSection";
import { LoadingIndicator } from "@/components/states/LoadingIndicator";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState, ERROR_COPY } from "@/components/states/ErrorState";
import { SectionBoundary } from "@/components/states/SectionBoundary";
import { SkeletonCard } from "@/components/states/Skeleton";
import HostelCard, { HostelCardData } from "@/components/Student/HostelCard";
import { ArrowRight } from "lucide-react";
import { Link } from "@inertiajs/react";
import { route } from "ziggy-js";

interface RecommendedHostelsSectionProps {
  isFirstYear: boolean;
}

function RecommendedHostelsInner({ isFirstYear }: RecommendedHostelsSectionProps) {
  const { state, retry, startedAt } = useAsyncSection<HostelCardData[]>({
    component: "student.dashboard.recommended_hostels",
    userFlow: "student",
    fetcher: () =>
      // Developer note: this route is in routes/web.php so Laravel can read
      // the normal Inertia/session cookie. Do not add the /api prefix here.
      fetch("/student/dashboard/recommended-hostels", {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      }).then(async (r) => {
        if (!r.ok) throw { status: r.status };
        const json = await r.json();
        // FIX: defensively unwrap a possible { data: [...] } envelope so a
        // Laravel API/Resource Collection response shape never breaks this
        // component — always resolve to a plain array.
        // Developer note: always give the UI an array, never undefined.
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.data)) return json.data;
        return [];
      }),
    isEmptyResult: (data) => !Array.isArray(data) || data.length === 0,
    emptyReasonCode: "NO_HOSTELS_AVAILABLE",
  });

  if (state.status === "loading") {
    return (
      <LoadingIndicator
        startedAt={startedAt}
        preferredVariant="skeleton"
        skeleton={
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        }
        label="Loading recommended hostels"
      />
    );
  }

  if (state.status === "empty") {
    return (
      <EmptyState
        component="student.dashboard.recommended_hostels"
        userFlow="student"
        reasonCode="NO_HOSTELS_AVAILABLE"
        title="No hostels available right now"
        explanation="There aren't any hostels open for applications for your year and gender at the moment. Check back soon, or browse everything on offer."
        primaryAction={{ label: "Browse all hostels", href: route("student.hostels.index") }}
      />
    );
  }

  if (state.status === "error") {
    const copy = ERROR_COPY[state.reasonCode] ?? ERROR_COPY.UNKNOWN_ERROR;
    return (
      <ErrorState
        component="student.dashboard.recommended_hostels"
        userFlow="student"
        reasonCode={state.reasonCode}
        userMessage={copy.userMessage}
        placement={copy.placement}
        primaryAction={{ label: "Try again", onClick: retry }}
      />
    );
  }

  // FIX: guarantee an array even if `state.data` somehow isn't one at
  // runtime (belt-and-braces on top of the fetcher-level fix above).
  const hostels = Array.isArray(state.data) ? state.data : [];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          {isFirstYear ? "Recommended On-Campus Hostels" : "Available Hostels"}
        </h2>
        <Link
          href={route("student.hostels.index")}
          className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1"
        >
          Browse all <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hostels.map((h) => (
          <HostelCard key={h.id} hostel={h} />
        ))}
      </div>
    </section>
  );
}

export default function RecommendedHostelsSection(props: RecommendedHostelsSectionProps) {
  return (
    <SectionBoundary component="student.dashboard.recommended_hostels" userFlow="student">
      <RecommendedHostelsInner {...props} />
    </SectionBoundary>
  );
}
