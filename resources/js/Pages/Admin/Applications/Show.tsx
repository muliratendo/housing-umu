// resources/js/Pages/Admin/Applications/Show.tsx
import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ArrowLeft, BedDouble, Building2, CalendarDays, CheckCircle2, User, XCircle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/components/Admin/shared/StatusBadge';
import AllocationsDialog from '@/components/Admin/Allocations/AllocationsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Types match ApplicationController::show() shape
// The existing controllers don't have a show() method — add it below.

interface Application {
  id: number;
  status: string;
  waitlist_position: number | null;
  created_at: string;
  updated_at: string;

  student: {
    id: number;
    student_number: string;
    gender: string;
    year_of_study: number;
    programme: string;
    user: { id: number; name: string; email: string };
  };
  hostel: {
    id: number;
    name: string;
    slug: string;
    location: string;
    gender_scope: string;
    management_type: string;
  };
  academic_term: { id: number; name: string };

  // Optional linked allocation (may not exist yet)
  allocation?: {
    id: number;
    status: string;
    bed_label: string | null;
    room_number: string | null;
    checked_in_at: string | null;
  } | null;
  room_type: string;
}

interface Props {
  application: Application;
  canProcess?: boolean;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? '—'}</dd>
    </div>
  );
}

export default function ApplicationShow({ application, canProcess = false }: Props) {
  // NEW: single mode state replaces two separate open flags
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);

  const isPending = application.status === 'pending';

  return (
    <AuthenticatedLayout header="Application Detail">
      <Head title={`Application #${application.id} – Admin`} />

      <div className="space-y-6 max-w-4xl">

        {/* Back + Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={route('admin.applications.index')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Applications
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">#{application.id}</span>
        </div>

        {/* Hero summary */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{application.student.user.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {application.student.student_number} · {application.student.programme} · Year {application.student.year_of_study}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={application.status} />
            {application.waitlist_position && (
              <Badge variant="outline" className="text-xs">
                Waitlist #{application.waitlist_position}
              </Badge>
            )}
          </div>
        </div>

        {/* Action bar — only for pending */}
        {isPending && canProcess && (
          <Card className="rounded-xl border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/10">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 px-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                This application is <strong>pending review</strong>. Approve to allocate (random by default, or pick a bed manually) — or reject to close it.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setDialogMode('approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-8 text-sm">
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
                <Button onClick={() => setDialogMode('reject')} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2 h-8 text-sm">
                  <XCircle className="size-4" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Student card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-muted-foreground" /> Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Full Name"     value={application.student.user.name} />
                <Detail label="Reg. Number"   value={application.student.student_number} />
                <Detail label="Email"         value={<a href={`mailto:${application.student.user.email}`} className="text-primary hover:underline">{application.student.user.email}</a>} />
                <Detail label="Gender"        value={<span className="capitalize">{application.student.gender}</span>} />
                <Detail label="Year of Study" value={`Year ${application.student.year_of_study}`} />
                <Detail label="Programme"     value={application.student.programme} />
              </dl>
              <Separator className="my-3" />
              <Link
                href={route('admin.students.show', application.student.id)}
                className="text-xs text-primary hover:underline"
              >
                View full student profile →
              </Link>
            </CardContent>
          </Card>

          {/* Hostel preference card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" /> Hostel Preference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Hostel"     value={application.hostel.name} />
                <Detail label="Location"   value={application.hostel.location} />
                <Detail label="Gender Scope" value={<span className="capitalize">{application.hostel.gender_scope}</span>} />
                <Detail label="Managed By" value={<span className="capitalize">{application.hostel.management_type.replace('-', ' ')}</span>} />
              </dl>
            </CardContent>
          </Card>

          {/* Academic term */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" /> Academic Term
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Term"    value={application.academic_term.name} />
                <Detail label="Applied" value={new Date(application.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Detail label="Updated" value={new Date(application.updated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </dl>
            </CardContent>
          </Card>

          {/* Linked allocation — shown if it exists */}
          {application.allocation && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BedDouble className="size-4 text-muted-foreground" /> Linked Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3">
                  <Detail label="Status"      value={<StatusBadge status={application.allocation.status} />} />
                  <Detail label="Room"        value={application.allocation.room_number} />
                  <Detail label="Bed"         value={application.allocation.bed_label} />
                  <Detail label="Checked In"  value={application.allocation.checked_in_at ? new Date(application.allocation.checked_in_at).toLocaleDateString('en-UG') : '—'} />
                </dl>
                <Separator className="my-3" />
                <Link
                  href={route('admin.allocations.show', application.allocation.id)}
                  className="text-xs text-primary hover:underline"
                >
                  View allocation →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* NEW: single merged dialog replaces ApproveDialog + RejectDialog */}
      {dialogMode && (
        <AllocationsDialog
          mode={dialogMode}
          open={!!dialogMode}
          onOpenChange={(v) => { if (!v) setDialogMode(null); }}
          applicationId={application.id}
          studentName={application.student.user.name}
          hostelName={application.hostel.name}
          applicationRoomType={application.room_type}
        />
      )}
    </AuthenticatedLayout>
  );
}
