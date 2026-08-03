import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ArrowLeft, ArrowLeftRight, BedDouble, Building2, LogOut, User } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/components/Admin/shared/StatusBadge';
import ConfirmDialog from '@/components/Admin/shared/ConfirmDialog';
import AllocationsDialog from '@/components/Admin/Allocations/AllocationsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Allocation {
  id: number; status: string; admin_notes: string | null; is_admin_override: boolean;
  override_by?: number | null; checked_in_at: string | null; checked_out_at: string | null;
  created_at: string;
  student: {
    id: number; student_number: string; gender: string; year_of_study: number; programme: string;
    user: { id: number; name: string; email: string };
  };
  hostel: { id: number; name: string; slug: string; location: string; management_type: string; };
  room: { id: number; room_number: string; room_type: string; floor: number | null; };
  bed: { id: number; label: string; } | null;
  academic_term: { id: number; name: string; };
  application: { id: number; } | null;
}

interface Props {
  allocation: Allocation;
  canCheckOut?: boolean;
  canOverride?: boolean;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? '—'}</dd>
    </div>
  );
}

export default function AllocationShow({ allocation, canCheckOut = false, canOverride = false }: Props) {
  const [checkOutOpen,    setCheckOutOpen]    = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [overrideOpen,    setOverrideOpen]    = useState(false);

  const handleCheckOut = () => {
    setCheckOutLoading(true);
    router.patch(route('admin.allocations.check-out', allocation.id), {}, {
      onSuccess: () => setCheckOutOpen(false),
      onFinish:  () => setCheckOutLoading(false),
    });
  };

  const isActive = allocation.status === 'checked_in' || allocation.status === 'allocated';

  return (
    <AuthenticatedLayout header="Allocation Detail">
      <Head title={`Allocation #${allocation.id} – Admin`} />
      <div className="space-y-6 max-w-4xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={route('admin.allocations.index')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Allocations
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">#{allocation.id}</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{allocation.student.user.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allocation.student.student_number} · {allocation.hostel.name} · Room {allocation.room.room_number}
              {allocation.bed && ` · ${allocation.bed.label}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={allocation.status} />
            {allocation.is_admin_override && (
              <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                Admin Override
              </Badge>
            )}
          </div>
        </div>

        {/* Action bar */}
        {(canCheckOut || canOverride) && (
          <div className="flex flex-wrap gap-2">
            {canOverride && allocation.status !== 'checked_out' && allocation.status !== 'cancelled' && (
              <Button
                onClick={() => setOverrideOpen(true)}
                variant="outline"
                className="gap-2 h-9 text-sm text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                <ArrowLeftRight className="size-4" /> Override Bed
              </Button>
            )}
            {canCheckOut && allocation.status === 'checked_in' && (
              <Button
                onClick={() => setCheckOutOpen(true)}
                variant="outline"
                className="gap-2 h-9 text-sm text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                <LogOut className="size-4" /> Check Out
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Student */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-muted-foreground" /> Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Full Name"   value={allocation.student.user.name} />
                <Detail label="Reg. Number" value={allocation.student.student_number} />
                <Detail label="Email"       value={<a href={`mailto:${allocation.student.user.email}`} className="text-primary hover:underline">{allocation.student.user.email}</a>} />
                <Detail label="Gender"      value={<span className="capitalize">{allocation.student.gender}</span>} />
                <Detail label="Year"        value={`Year ${allocation.student.year_of_study}`} />
                <Detail label="Programme"   value={allocation.student.programme} />
              </dl>
              <Separator className="my-3" />
              <Link href={route('admin.students.show', allocation.student.id)} className="text-xs text-primary hover:underline">
                View student profile →
              </Link>
            </CardContent>
          </Card>

          {/* Hostel & Bed */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BedDouble className="size-4 text-muted-foreground" /> Room & Bed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Hostel"      value={allocation.hostel.name} />
                <Detail label="Location"    value={allocation.hostel.location} />
                <Detail label="Room"        value={allocation.room.room_number} />
                <Detail label="Room Type"   value={<span className="capitalize">{allocation.room.room_type}</span>} />
                <Detail label="Floor"       value={allocation.room.floor ?? '—'} />
                <Detail label="Bed"         value={allocation.bed?.label ?? '—'} />
              </dl>
            </CardContent>
          </Card>

          {/* Timing & Term */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Academic Term"  value={allocation.academic_term.name} />
                <Detail label="Allocated At"   value={new Date(allocation.created_at).toLocaleDateString('en-UG', { day:'numeric', month:'long', year:'numeric' })} />
                <Detail label="Checked In"     value={allocation.checked_in_at ? new Date(allocation.checked_in_at).toLocaleDateString('en-UG') : '—'} />
                <Detail label="Checked Out"    value={allocation.checked_out_at ? new Date(allocation.checked_out_at).toLocaleDateString('en-UG') : '—'} />
              </dl>
            </CardContent>
          </Card>

          {/* Admin notes + links */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allocation.admin_notes ? (
                <p className="text-sm bg-muted rounded-lg p-3">{allocation.admin_notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No admin notes recorded.</p>
              )}
              <Separator />
              <div className="flex flex-col gap-1">
                {allocation.application && (
                  <Link href={route('admin.applications.show', allocation.application.id)} className="text-xs text-primary hover:underline">
                    View linked application →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={checkOutOpen} onOpenChange={setCheckOutOpen}
        title="Check Out Student?"
        description={`This frees ${allocation.bed?.label ?? 'the bed'} and triggers waitlist promotion (BR-8). This cannot be undone.`}
        confirmLabel="Check Out"
        confirmClassName="bg-orange-600 hover:bg-orange-700 text-white"
        onConfirm={handleCheckOut}
        loading={checkOutLoading}
      />

      {/* UPDATED: was OverrideDialog — now AllocationsDialog with mode="override" */}
      <AllocationsDialog
        mode="override"
        allocationId={allocation.id}
        currentBedLabel={allocation.bed?.label ?? null}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
      />
    </AuthenticatedLayout>
  );
}
