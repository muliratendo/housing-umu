import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BedDouble, Building2, ClipboardList, Clock, UserCheck, WrenchIcon,
  type LucideIcon,
} from 'lucide-react';

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
}

function buildKpiCards(m: Metrics): KpiCard[] {
  return [
    { title: 'Total Beds', value: m.total_beds, Icon: BedDouble, color: 'text-emerald-700' },
    { title: 'Occupied', value: m.occupied_beds, Icon: UserCheck, color: 'text-amber-600' },
    { title: 'Available', value: m.available_beds, Icon: BedDouble, color: 'text-green-600' },
    { title: 'Under Maintenance', value: m.maintenance_beds, Icon: WrenchIcon, color: 'text-orange-500' },
    { title: 'Pending Applications', value: m.pending_applications, Icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Allocated This Term', value: m.allocated_this_term, Icon: UserCheck, color: 'text-emerald-700' },
    { title: 'Waitlisted', value: m.waitlisted, Icon: Clock, color: 'text-yellow-600' },
    { title: 'Active Hostels', value: m.total_hostels, Icon: Building2, color: 'text-emerald-700' },
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

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map(({ title, value, Icon, color }) => (
            <Card key={title} className="rounded-xl shadow-sm">
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
          ))}
        </div>

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
