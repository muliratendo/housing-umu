// File: resources/js/Pages/Student/Allocation/Show.tsx
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  BedDouble, Building2, CheckCircle2, ChevronLeft,
  Info, LogIn, LogOut, MapPin, ShieldCheck, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Term {
  id: number;
  name: string;
  academic_year: string;
}

interface AllocationData {
  id: number;
  hostel_name: string;
  hostel_id: number;
  hostel_location?: string;
  room_number: string;
  room_type?: string;
  floor?: string | number;
  bed_number: string;
  status: string;
  checked_in_at?: string;
  checked_out_at?: string;
}

interface RetentionInfo {
  is_retained: boolean;
  retained_for_year?: string;
  retention_notes?: string;
}

interface DeanPermission {
  granted: boolean;
  notes?: string;
  granted_at?: string;
}

interface ApplicationSnapshot {
  id: number;
  hostel_name: string;
  status: string;
}

interface Props {
  allocation: AllocationData | null;
  currentTerm: Term | null;
  needsCheckIn: boolean;
  canAccessMaintenance: boolean;
  retentionInfo?: RetentionInfo;
  deanPermission?: DeanPermission;
  applications?: ApplicationSnapshot[];
  termEnded?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AllocationShow({
  allocation,
  currentTerm,
  needsCheckIn,
  canAccessMaintenance,
  retentionInfo,
  deanPermission,
}: Props) {
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkInProcessing, setCheckInProcessing]   = useState(false);

  const handleCheckIn = () => {
    if (!allocation) return;
    setCheckInProcessing(true);
    router.post(
      route('student.allocation.check-in', allocation.id),
      {},
      { onFinish: () => setCheckInProcessing(false) }
    );
  };

  const handleCheckout = () => {
    if (!allocation || !currentTerm) return;
    router.post(route('student.allocation.request', 'checkout_now'), {
      allocation_id:    allocation.id,
      hostel_id:        allocation.hostel_id,
      academic_term_id: currentTerm.id,
    });
    setCheckoutDialogOpen(false);
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!allocation) {
    return (
      <AuthenticatedLayout
        title="Allocation Status"
        // allocation.id from the Inertia prop
        breadcrumbs={[
          { label: 'Dashboard', href: route('student.dashboard') },
          { label: `Allocation Status` },
        ]}
      >
        <Head title="Allocation Status – Housing@UMU" />
        <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-accent-500/10 p-5">
            <BedDouble className="size-10 text-accent-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">No Active Allocation</h2>
          <p className="text-sm text-muted-foreground">
            You do not have an active room allocation for{' '}
            {currentTerm?.name ?? 'the current semester'}.
          </p>
          <Button asChild className="bg-brand-700 hover:bg-brand-800 text-white">
            <Link href={route('student.hostels.index')} title="Browse and apply for a hostel">
              Browse Hostels &amp; Apply
            </Link>
          </Button>
        </div>
      </AuthenticatedLayout>
    );
  }

  // ── Active allocation ───────────────────────────────────────────────────────
  return (
    <AuthenticatedLayout
      title="Allocation Status"
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: `Allocation #${allocation.id}` },
      ]}
    >
      <Head title="Allocation Status – Housing@UMU" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Check-in reminder banner (D4) ───────────────────────────────── */}
        {needsCheckIn && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-accent-500 shrink-0" />
              <span className="text-yellow-800 dark:text-yellow-300">
                Please confirm your check-in to activate your room assignment.
              </span>
            </div>
            <Button
              size="sm"
              className="bg-brand-700 hover:bg-brand-800 text-white shrink-0"
              onClick={handleCheckIn}
              disabled={checkInProcessing}
              title="Confirm check-in (BR-7)"
            >
              <LogIn className="size-3.5 mr-1.5" />
              {checkInProcessing ? 'Processing...' : 'Confirm Check-In'}
            </Button>
          </div>
        )}

        {/* ── Allocation Card ──────────────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BedDouble className="size-4 text-accent-500" />
                Room Assignment
              </CardTitle>
              <StatusPill status={allocation.status} />
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Hostel</p>
              <p className="font-semibold text-foreground">{allocation.hostel_name}</p>
              {allocation.hostel_location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-accent-500" /> {allocation.hostel_location}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Room</p>
              <p className="font-semibold">
                {allocation.room_number}
                {allocation.floor && ` – Floor ${allocation.floor}`}
              </p>
              {allocation.room_type && (
                <p className="text-xs text-muted-foreground capitalize">{allocation.room_type}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bed Number</p>
              <p className="font-semibold">{allocation.bed_number}</p>
            </div>
            {currentTerm && (
              <div>
                <p className="text-xs text-muted-foreground">Semester</p>
                <p className="font-semibold">{currentTerm.name}</p>
                <p className="text-xs text-muted-foreground">{currentTerm.academic_year}</p>
              </div>
            )}
            {allocation.checked_in_at && (
              <div>
                <p className="text-xs text-muted-foreground">Checked In</p>
                <p className="font-medium">
                  {new Date(allocation.checked_in_at).toLocaleDateString('en-UG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {allocation.checked_out_at && (
              <div>
                <p className="text-xs text-muted-foreground">Checked Out</p>
                <p className="font-medium">
                  {new Date(allocation.checked_out_at).toLocaleDateString('en-UG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Retention Info ───────────────────────────────────────────────── */}
        {retentionInfo?.is_retained && (
          <Card className="rounded-xl border border-green-300 bg-green-50/50 dark:bg-green-900/10 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <ShieldCheck className="size-5 text-green-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Room Retained</p>
                <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                  Your room is retained for the full{' '}
                  {retentionInfo.retained_for_year} academic year.
                  {retentionInfo.retention_notes && ` ${retentionInfo.retention_notes}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Dean Permission ──────────────────────────────────────────────── */}
        {deanPermission?.granted && (
          <Card className="rounded-xl border border-blue-300 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <CheckCircle2 className="size-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-300">
                  Dean's Permission Granted
                </p>
                {deanPermission.notes && (
                  <p className="text-blue-700 dark:text-blue-400 text-xs mt-0.5">
                    {deanPermission.notes}
                  </p>
                )}
                {deanPermission.granted_at && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    Granted on {deanPermission.granted_at}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-3">

          {/* Maintenance (BR-10) */}
          <Button
            asChild={canAccessMaintenance}
            disabled={!canAccessMaintenance}
            variant="outline"
            className={cn(
              'border-brand-700 text-brand-700 hover:bg-brand-700/10',
              !canAccessMaintenance && 'opacity-50 cursor-not-allowed'
            )}
            title={
              canAccessMaintenance
                ? 'Submit a maintenance request for your room'
                : 'Available only when allocated or checked in (BR-10)'
            }
          >
            {canAccessMaintenance ? (
              <Link href={route('student.maintenance.index')}>
                <Wrench className="size-4 mr-2" /> Maintenance Requests
              </Link>
            ) : (
              <span><Wrench className="size-4 mr-2" /> Maintenance Requests</span>
            )}
          </Button>

          {/* Checkout (D5 / BR-8) */}
          {allocation.status === 'checked_in' && (
            <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                title="Request checkout from your current room"
                onClick={() => setCheckoutDialogOpen(true)}
              >
                <LogOut className="size-4 mr-2" /> Request Checkout
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Checkout</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to check out of Room {allocation.room_number} at{' '}
                    {allocation.hostel_name}? Your bed will be released and may be assigned to
                    another student.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    className="bg-destructive hover:bg-destructive/90 text-white"
                  >
                    <LogOut className="size-4 mr-2" /> Confirm Checkout
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Back to dashboard */}
        <div className="pt-2">
          <Link
            href={route('student.dashboard')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" /> Back to Dashboard
          </Link>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
