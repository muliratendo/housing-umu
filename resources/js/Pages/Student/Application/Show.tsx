// File: resources/js/Pages/Student/Application/Show.tsx
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  Building2, Calendar, ChevronLeft, ExternalLink, Info, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AllocationSnapshot {
  hostel_name: string;
  room_number: string;
  bed_number: string;
}

interface Preferences {
  room_type?: string;
  floor_pref?: string;
}

interface ApplicationDetail {
  id: number;
  hostel_name: string;
  hostel_location?: string;
  hostel_type: string;
  term_name: string;
  academic_year: string;
  status: string;
  waitlist_position?: number | null;
  created_at: string;
  notes?: string;
  special_needs?: string;
  preferences?: Preferences;
  dean_permission_granted?: boolean;
  permission_notes?: string;
  allocation?: AllocationSnapshot;
}

interface Props {
  application: ApplicationDetail;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicationShow({ application }: Props) {
  const isRejected = application.status === 'rejected';
  const isWaitlisted = application.status === 'waitlisted';
  const hasAllocation = !!application.allocation;

  return (
    <AuthenticatedLayout
      title="Application Details"
      breadcrumbs={[
        { label: 'Applications', href: route('student.applications.index') },
        { label: application.hostel_name, href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title={`Application – ${application.hostel_name}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Back */}
        <Link
          href={route('student.applications.index')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back to Applications
        </Link>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-700/10 p-2.5">
                  <Building2 className="size-5 text-brand-700" />
                </div>
                <div>
                  <h1 className="font-bold text-base font-heading text-foreground">
                    {application.hostel_name}
                  </h1>
                  {application.hostel_location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 text-accent-500" />
                      {application.hostel_location}
                    </p>
                  )}
                </div>
              </div>
              <StatusPill
                status={application.status}
                waitlistPosition={application.waitlist_position}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Academic Term</p>
                <p className="font-medium">{application.term_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Academic Year</p>
                <p className="font-medium">{application.academic_year}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hostel Type</p>
                <p className="font-medium capitalize">
                  {application.hostel_type.replace('-', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applied On</p>
                <p className="font-medium">
                  {new Date(application.created_at).toLocaleDateString('en-UG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Waitlist */}
            {isWaitlisted && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg px-3 py-2">
                <Info className="size-4 text-blue-600 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300">
                  You are #<strong>{application.waitlist_position}</strong> on the waitlist.
                  You will be notified when a bed becomes available.
                </span>
              </div>
            )}

            {/* Dean permission */}
            {application.dean_permission_granted && (
              <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg px-3 py-2">
                <Info className="size-4 text-green-700" />
                <span className="text-green-800 dark:text-green-300">
                  Dean of Students approval granted
                  {application.permission_notes && `: ${application.permission_notes}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Preferences ───────────────────────────────────────────────────── */}
        {(application.notes || application.special_needs || application.preferences) && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Your Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {application.preferences?.room_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Room Type</p>
                  <p className="capitalize">{application.preferences.room_type}</p>
                </div>
              )}
              {application.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{application.notes}</p>
                </div>
              )}
              {application.special_needs && (
                <div>
                  <p className="text-xs text-muted-foreground">Special Needs</p>
                  <p className="whitespace-pre-wrap">{application.special_needs}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Allocation result ─────────────────────────────────────────────── */}
        {hasAllocation && application.allocation && (
          <Card className="rounded-xl border border-green-300 shadow-sm bg-green-50/50 dark:bg-green-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-green-800 dark:text-green-300">
                Room Allocated
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Hostel</p>
                <p className="font-medium">{application.allocation.hostel_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Room / Bed</p>
                <p className="font-medium">
                  Room {application.allocation.room_number}, Bed{' '}
                  {application.allocation.bed_number}
                </p>
              </div>
              <div className="col-span-2">
                <Button asChild size="sm" className="bg-brand-700 hover:bg-brand-800 text-white">
                  <Link
                    href={route('student.allocation.show')}
                    title="View full allocation details"
                  >
                    View Allocation Details <ExternalLink className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Rejected CTA (D3) ─────────────────────────────────────────────── */}
        {isRejected && (
          <Card className="rounded-xl border shadow-sm">
            <CardContent className="py-6 flex flex-col items-center text-center gap-3">
              <p className="text-sm text-muted-foreground">
                Your application was not successful this term.
              </p>
              <Button asChild size="sm" className="bg-brand-700 hover:bg-brand-800 text-white">
                <Link href={route('student.hostels.index')} title="Explore other hostels">
                  Explore Other Hostels
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </AuthenticatedLayout>
  );
}
