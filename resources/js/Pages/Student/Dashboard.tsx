// File: resources/js/Pages/Student/Dashboard.jsx
import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  Calendar, BedDouble, Building2, Wrench, FileText,
  ArrowRight, Info, ClipboardList, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import KpiCard from '@/components/Student/KpiCard';
import StatusPill from '@/components/Student/StatusPill';
import NotificationBanner from '@/components/Student/NotificationBanner';
import QuickActions from '@/components/Student/QuickActions';
import HostelCard from '@/components/Student/HostelCard';
import { cn } from '@/lib/utils';
import { route } from 'ziggy-js';

/**
 * S1 — Student Dashboard
 *
 * Props (from DashboardController::index):
 *  student, currentTerm, summary, recommendedHostels, recentActivity
 */
interface DashboardProps {
  student: {
    name: string;
    is_first_year: boolean;
  };
  currentTerm: {
    name: string;
    academic_year: string;
    is_application_window_open: boolean;
  } | null;
  summary: {
    application_status: string;
    applications_count: number;
    waitlist_position: number | null;
    allocation: {
      hostel_name: string;
      room_number: string;
      bed_number: string;
      status: string;
      is_retained: boolean;
    } | null;
    applications: {
      id: number;
      hostel_name: string;
      hostel_type: string;
      status: string;
      waitlist_position: number | null;
    }[];
    maintenance_status: string | null;
    maintenance_request: { subject: string } | null;
    can_access_maintenance: boolean;
  };
  recommendedHostels: {
    id: number;
    name: string;
    slug: string;
    management_type: string;
    gender_scope: string;
    availability_status: string;
  }[];
  recentActivity: {
    description: string;
    timestamp: string;
    status: string;
    link: string;
  }[];
}

export default function Dashboard({
  student,
  currentTerm,
  summary,
  recommendedHostels,
  recentActivity,
}: DashboardProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isEmpty = summary.application_status === 'not_applied';
  const isNewStudent = student.is_first_year;

  // ─── KPI card values ───────────────────────────────────────────────────────
  const kpiCards = [
    {
      title:   'Current Semester',
      value:   currentTerm ? `${currentTerm.name} – ${currentTerm.academic_year}` : '—',
      icon:    Calendar,
      subtitle: currentTerm
        ? currentTerm.is_application_window_open
          ? 'Application window open'
          : 'Application window closed'
        : 'No active term',
    },
    {
      title:    'Application Status',
      value:    isEmpty ? '—' : <StatusPill status={summary.application_status} waitlistPosition={summary.waitlist_position} />,
      icon:     FileText,
      subtitle: summary.applications_count > 0
        ? `${summary.applications_count} application(s) this term`
        : 'No application yet',
      action:   summary.applications_count > 0 && (
        <Link href={route('student.applications.index')} className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1">
          View <ArrowRight className="size-3" />
        </Link>
      ),
    },
    {
      title:   'Allocated Hostel',
      value:   summary.allocation ? summary.allocation.hostel_name : '—',
      icon:    Building2,
      subtitle: summary.allocation
        ? `Room ${summary.allocation.room_number}, Bed ${summary.allocation.bed_number}`
        : 'Not yet allocated',
      action: summary.allocation && (
        <Link href={route('student.allocation.show')} className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1">
          View <ArrowRight className="size-3" />
        </Link>
      ),
    },
    {
      title:    'Maintenance Status',
      value:    summary.maintenance_status
        ? <StatusPill status={summary.maintenance_status} />
        : '—',
      icon:     Wrench,
      subtitle: summary.maintenance_request
        ? summary.maintenance_request.subject
        : summary.can_access_maintenance
          ? 'No open requests'
          : 'Requires active allocation',
      action: summary.can_access_maintenance && (
        <Link href={route('student.maintenance.index')} className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1">
          View <ArrowRight className="size-3" />
        </Link>
      ),
    },
  ];

  // ─── Notification banner logic (D1 variants) ───────────────────────────────
  const getBannerProps = () => {
    if (isEmpty && currentTerm?.is_application_window_open) {
      return {
        message: 'Housing application window is now open for the new academic year.',
        variant: 'info',
        cta: { label: 'View Hostels →', href: route('student.hostels.index') },
      };
    }
    if (!currentTerm?.is_application_window_open && currentTerm) {
      return {
        message: 'Applications are currently closed for the season.',
        variant: 'warning',
        cta: { label: 'View Hostels →', href: route('student.hostels.index') },
      };
    }
    // Check-in reminder
    if (summary.allocation?.status === 'allocated') {
      return {
        message: 'Please confirm your check-in to activate your room assignment.',
        variant: 'warning',
        cta: { label: 'Confirm Check-In →', href: route('student.allocation.show') },
      };
    }
    return null;
  };

  const bannerProps = getBannerProps();

  return (
    <AuthenticatedLayout
      title="Dashboard"
      breadcrumbs={[{ label: 'Dashboard', href: route('student.dashboard') }]}
    >
      <Head title="Student Dashboard – Housing@UMU" />

      <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">

        {/* ── Upper-Top: KPI Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <KpiCard key={card.title} {...card} />
          ))}
        </div>

        {/* ── Lower-Top: Notification Banner ─────────────────────────────── */}
        {bannerProps && !bannerDismissed && (
          <NotificationBanner
            {...bannerProps}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* ── Mid-Section ────────────────────────────────────────────────── */}
        {isEmpty ? (
          /* EMPTY STATE */
          <Card className="rounded-xl border shadow-sm">
            <CardContent className="py-12 px-6 flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-[#f1b418]/10 p-5">
                <Home className="size-10 text-[#f1b418]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-heading text-foreground">
                  Welcome, {student.name.split(' ')[0]}!
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {student.is_first_year
                    ? 'As a first-year student, you have priority access to on-campus halls of residence.'
                    : 'Find accommodation that suits you for the upcoming semester.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button asChild className="bg-[#137c41] hover:bg-[#0b4b27] text-white font-semibold">
                  <Link href={route('student.hostels.index')}>
                    <Building2 className="size-4 mr-2" />
                    Browse Hostels &amp; Apply
                  </Link>
                </Button>
                <Button asChild variant="outline" className="font-semibold border-[#f1b418] text-[#137c41] hover:bg-[#f1b418]/10">
                  <a href="/how-it-works">
                    <Info className="size-4 mr-2" />
                    Learn How It Works
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ACTIVE STATE: Current Allocation + Applications */
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Current Allocation */}
            <div className="lg:col-span-2 space-y-4">
              {summary.allocation && (
                <Card className="rounded-xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BedDouble className="size-4 text-[#f1b418]" />
                      Current Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Hostel</p>
                      <p className="font-medium">{summary.allocation.hostel_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Room / Bed</p>
                      <p className="font-medium">Room {summary.allocation.room_number}, Bed {summary.allocation.bed_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <StatusPill status={summary.allocation.status} className="mt-1" />
                    </div>
                    {summary.allocation.is_retained && (
                      <div className="col-span-3 flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg px-3 py-2">
                        <Info className="size-3.5 text-green-700" />
                        <span className="text-green-800 dark:text-green-300">
                          This room is retained for your first academic year.
                        </span>
                      </div>
                    )}
                    <div className="col-span-3">
                      <Button asChild size="sm" variant="outline" className="border-[#137c41] text-[#137c41] hover:bg-[#137c41]/10">
                        <Link href={route('student.allocation.show')}>
                          View Allocation Details <ArrowRight className="size-3 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Applications this term */}
              {summary.applications.length > 0 && (
                <Card className="rounded-xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardList className="size-4 text-[#f1b418]" />
                      Applications This Term
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {summary.applications.map((app) => (
                        <Link
                          key={app.id}
                          href={route('student.applications.show', app.id)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
                          title={`View application to ${app.hostel_name}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{app.hostel_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{app.hostel_type.replace('-', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={app.status} waitlistPosition={app.waitlist_position} />
                            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t">
                      <Link
                        href={route('student.applications.index')}
                        className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1"
                      >
                        View all applications <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <QuickActions canAccessMaintenance={summary.can_access_maintenance} />
            </div>
          </div>
        )}

        {/* ── Recommended Hostels ──────────────────────────────────────────── */}
        {recommendedHostels.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                {student.is_first_year ? 'Recommended On-Campus Hostels' : 'Available Hostels'}
              </h2>
              <Link
                href={route('student.hostels.index')}
                className="text-xs text-[#137c41] font-medium hover:underline flex items-center gap-1"
              >
                Browse all <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedHostels.map((h) => (
                <HostelCard key={h.id} hostel={h} />
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom: Recent Activity (Variant A/B) ──────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl border shadow-sm h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="size-4 text-[#f1b418]" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  /* Variant A: No Activity */
                  <div className="flex flex-col items-center py-8 text-center gap-2">
                    <ClipboardList className="size-10 text-muted-foreground/30" strokeWidth={1} />
                    <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground">
                      Your housing activity will appear here once you apply for accommodation.
                    </p>
                  </div>
                ) : (
                  /* Variant B: Has activity */
                  <div className="space-y-3">
                    {recentActivity.map((item, i) => (
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
                              {new Date(item.timestamp).toLocaleDateString('en-UG', {
                                day: 'numeric', month: 'short', year: 'numeric',
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
          </div>

          {/* Quick actions in empty state */}
          {isEmpty && (
            <QuickActions canAccessMaintenance={summary.can_access_maintenance} />
          )}
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
