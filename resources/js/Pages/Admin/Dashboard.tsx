// resources/js/Pages/Admin/Dashboard.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BedDouble, Building2, ClipboardList, Clock, UserCheck, WrenchIcon, HelpCircle,
  type LucideIcon,
} from 'lucide-react';
// FIX: removed `import { link } from 'node:fs';` — this was a stray Node.js
// filesystem import (unrelated `link()` syscall binding) that happened to
// share a name with the broken `<link>` JSX usage below. It has no purpose
// in a browser bundle and was never the correct way to render a link here.


interface Term {
  id: number;
  name: string;
  academic_year: string | null;
  window_open: string | null;
  window_close: string | null;
}


interface Metrics {
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  maintenance_beds: number;
  pending_applications: number;
  allocated_this_term: number;
  waitlisted: number;
  total_hostels: number;
}


interface EntryPoint {
  label: string;
  route: string;
  permission: string;
}


interface Props {
  currentTerm: Term | null;
  metrics: Metrics;
  entryPoints: EntryPoint[];
}


interface KpiCard {
  title: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  // NEW: routeName points at a named Ziggy route so each KPI card can act
  // as its own entry point (replaces the old, unused `url` string field).
  routeName: string;
  // NEW: short explanatory copy shown inside the "?" tooltip on hover/focus.
  description: string;
}


// NEW: maps each KPI card to the admin route it should navigate to when
// clicked, and the one-line explanation shown in its tooltip. Route names
// match the ones already wired up in AdminNavSections (AppSidebar.tsx), so
// no new backend routes are required for this change.
function buildKpiCards(m: Metrics): KpiCard[] {
  return [
    {
      title: 'Total Beds',
      value: m.total_beds,
      Icon: BedDouble,
      color: 'text-emerald-700',
      routeName: 'admin.hostels.index',
      description: 'Total bed capacity across all active hostels.',
    },
    {
      title: 'Occupied',
      value: m.occupied_beds,
      Icon: UserCheck,
      color: 'text-amber-600',
      routeName: 'admin.allocations.index',
      description: 'Beds currently checked in to a student for this term.',
    },
    {
      title: 'Available',
      value: m.available_beds,
      Icon: BedDouble,
      color: 'text-green-600',
      routeName: 'admin.hostels.index',
      description: 'Beds that are free and ready to be allocated right now.',
    },
    {
      title: 'Under Maintenance',
      value: m.maintenance_beds,
      Icon: WrenchIcon,
      color: 'text-orange-500',
      routeName: 'admin.maintenance.index',
      description: 'Beds temporarily marked unavailable due to an open maintenance request.',
    },
    {
      title: 'Pending Applications',
      value: m.pending_applications,
      Icon: ClipboardList,
      color: 'text-blue-600',
      routeName: 'admin.applications.index',
      description: 'Student applications awaiting review or a decision.',
    },
    {
      title: 'Allocated This Term',
      value: m.allocated_this_term,
      Icon: UserCheck,
      color: 'text-emerald-700',
      routeName: 'admin.allocations.index',
      description: 'Students successfully allocated a bed for the current academic term.',
    },
    {
      title: 'Waitlisted',
      value: m.waitlisted,
      Icon: Clock,
      color: 'text-yellow-600',
      routeName: 'admin.waitlist.index',
      description: 'Applicants on the waitlist, pending a bed becoming available.',
    },
    {
      title: 'Active Hostels',
      value: m.total_hostels,
      Icon: Building2,
      color: 'text-emerald-700',
      routeName: 'admin.hostels.index',
      description: 'Hostels currently open and accepting applications.',
    },
  ];
}


export default function Dashboard({ currentTerm, metrics, entryPoints }: Props) {
  const kpiCards = buildKpiCards(metrics);


  return (
    <AuthenticatedLayout
      header="Admin Dashboard"
    >
      <Head title="Admin Dashboard – Housing@UMU" />


      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">


        {/* Term banner */}
        {currentTerm ? (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
            <span className="font-semibold">
              {currentTerm.academic_year} — {currentTerm.name}
            </span>
            {currentTerm.window_open && (
              <span className="text-muted-foreground">
                Application window: {currentTerm.window_open} → {currentTerm.window_close ?? 'open'}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            No active academic term found.
          </div>
        )}


        {/* KPI grid — each card is now its own clickable entry point (an
            Inertia <Link>) and carries a "?" tooltip trigger in its top-right
            corner explaining what the metric means. TooltipProvider wraps the
            whole grid once rather than per-card, which is the correct usage
            pattern for Radix/shadcn tooltips (a single shared context, not one
            provider per trigger). */}
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpiCards.map(({ title, value, Icon, color, routeName, description }) => (
              // FIX: the old code wrapped each Card in a bare `<link>` tag —
              // not a valid React/HTML element in this position (it's the
              // void <link> used in document <head>, imported here by mistake
              // from 'node:fs'). Replaced with Inertia's <Link>, which is the
              // correct way to make the whole card navigate on click.
              <Link
                key={title}
                href={route(routeName)}
                // NEW: relative positioning lets the "?" tooltip trigger sit
                // absolutely in the card's top-right corner without affecting
                // the card's own flow/layout.
                className="relative block rounded-xl transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Card className="rounded-xl shadow-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {title}
                    </CardTitle>
                    <Icon className={`size-4 ${color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
                  </CardContent>
                </Card>


                {/* NEW: "?" tooltip trigger, absolutely positioned in the
                    card's top-right corner. `stopPropagation` +
                    `preventDefault` on click keep it from triggering the
                    parent <Link>'s navigation — the icon is for reading the
                    explanation only, not for navigating away. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label={`What does "${title}" mean?`}
                      className="absolute right-2 top-2 rounded-full p-0.5 text-muted-foreground/60 hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    {description}
                  </TooltipContent>
                </Tooltip>
              </Link>
            ))}
          </div>
        </TooltipProvider>


        {/* Entry-point quick links */}
        {entryPoints.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entryPoints.map((item) => (
              <Link
                key={item.label}
                href={route(item.route)}
                className="rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted/40 font-medium text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}


      </div>
    </AuthenticatedLayout>
  );
}
