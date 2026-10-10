/**
 * =============================================================================
 * FILE: resources/js/components/Student/RecentActivitySection.tsx
 * PURPOSE: Independently-fetched "Recent Activity" section.
 *
 * WHY THIS IS SEPARATED FROM Dashboard.tsx:
 * getRecentActivity() queries TWO different tables (applications + allocations)
 * and merges/sorts them in PHP. It's a distinct data source from the rest of
 * the dashboard, so a failure or slowdown here should only affect this card,
 * not the KPIs or allocation summary above it.
 * =============================================================================
 */
import { useAsyncSection } from "@/hooks/useAsyncSection";
import { LoadingIndicator } from "@/components/states/LoadingIndicator";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState, ERROR_COPY } from "@/components/states/ErrorState";
import { SectionBoundary } from "@/components/states/SectionBoundary";
import { SkeletonLine } from "@/components/states/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClipboardList } from "lucide-react";
import { Link } from "@inertiajs/react";
import   StatusPill from "@/components/Student/StatusPill";
import { route } from "ziggy-js";

interface ActivityItem {
  type: "application" | "allocation";
  description: string;
  status: string;
  timestamp: string;
  link: string;
}

function RecentActivityInner() {
  const { state, retry, startedAt } = useAsyncSection<ActivityItem[]>({
    component: "student.dashboard.recent_activity",
    userFlow: "student",
    fetcher: () =>
      // Developer note: this route is in routes/web.php, not routes/api.php.
      fetch("/student/dashboard/recent-activity").then((r) => {
        if (!r.ok) throw { status: r.status };
        return r.json();
      }),
    isEmptyResult: (data) => data.length === 0,
    emptyReasonCode: "NO_ACTIVITY_YET",
  });

  return (
    <Card className="rounded-xl border shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="size-4 text-[#f1b418]" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" && (
          <LoadingIndicator
            startedAt={startedAt}
            preferredVariant="skeleton"
            skeleton={
              <div className="space-y-3">
                <SkeletonLine width="80%" />
                <SkeletonLine width="60%" />
                <SkeletonLine width="70%" />
              </div>
            }
            label="Loading recent activity"
          />
        )}

        {state.status === "empty" && (
          <EmptyState
            component="student.dashboard.recent_activity"
            userFlow="student"
            reasonCode="NO_ACTIVITY_YET"
            title="No activity yet"
            explanation="Your housing activity will appear here once you apply for accommodation."
            primaryAction={{ label: "Browse hostels", href: route("student.hostels.index") }}
          />
        )}

        {state.status === "error" && (() => {
          const copy = ERROR_COPY[state.reasonCode] ?? ERROR_COPY.UNKNOWN_ERROR;
          return (
            <ErrorState
              component="student.dashboard.recent_activity"
              userFlow="student"
              reasonCode={state.reasonCode}
              userMessage={copy.userMessage}
              placement={copy.placement}
              primaryAction={{ label: "Try again", onClick: retry }}
            />
          );
        })()}

        {(state.status === "success" || state.status === "refreshing") && (
          <div className="space-y-3">
            {state.data.map((item, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-3" />}
                <Link
                  href={item.link}
                  className="flex items-start justify-between gap-3 group"
                  title={item.description}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:underline capitalize">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString("en-UG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecentActivitySection() {
  return (
    <SectionBoundary component="student.dashboard.recent_activity" userFlow="student">
      <RecentActivityInner />
    </SectionBoundary>
  );
}
