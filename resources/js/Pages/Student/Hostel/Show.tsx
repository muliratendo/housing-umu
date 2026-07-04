// File: resources/js/Pages/Student/Hostel/Show.tsx
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  AlertCircle, BedDouble, Building2, CheckCircle2, ChevronLeft,
  Info, Lock, MapPin, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HostelDetail {
  id: number;
  name: string;
  slug: string;
  hostel_type: 'campus-managed' | 'affiliated';
  gender_policy: 'male' | 'female' | 'mixed';
  location?: string;
  description?: string;
  image_path?: string;
  price_per_semester?: number | string;
  available_beds: number;
  total_capacity: number;
}

interface RoomRow {
  id: number;
  room_number: string;
  room_type?: string;
  floor?: string | number;
  gender_override?: string;
  capacity: number;
}

interface AllocationRef {
  hostel_name: string;
  room_number: string;
}

interface ApplicationRef {
  id: number;
  status: string;
}

interface Term {
  id: number;
  name: string;
  academic_year: string;
}

interface Props {
  hostel: HostelDetail;
  rooms: RoomRow[];
  activeAllocation?: AllocationRef | null;
  existingApplication?: ApplicationRef | null;
  requiresRenewal: boolean;
  campusBedsAvailable?: number;
  windowOpen: boolean;
  currentTerm?: Term | null;
  student: { name: string; is_first_year: boolean };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDER_LABELS: Record<string, string> = {
  male: 'Male Only',
  female: 'Female Only',
  mixed: 'Mixed',
};

const TYPE_LABELS: Record<string, string> = {
  'campus-managed': 'On-Campus',
  affiliated: 'Affiliated',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HostelShow({
  hostel,
  rooms,
  activeAllocation,
  existingApplication,
  requiresRenewal,
  campusBedsAvailable = 0,
  windowOpen,
  currentTerm,
  student,
}: Props) {
  // D7: renewal popup fires on page load
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(
    requiresRenewal && !existingApplication
  );

  const handleRenewalRequest = () => {
    router.post(route('student.allocation.request', 'renewal_request'), {
      allocation_id: 0,
      hostel_id: hostel.id,
      academic_term_id: currentTerm?.id,
    });
    setRenewalDialogOpen(false);
  };

  // Determine primary CTA (D0, D2, D7)
  type CtaConfig =
    | { label: string; href: string; disabled: false; kind: 'link' }
    | { label: string; onClick: () => void; disabled: false; kind: 'button' }
    | { label: string; disabled: true; kind: 'button' };

  const getCta = (): CtaConfig => {
    if (activeAllocation)
      return { label: 'View Allocation', href: route('student.allocation.show'), disabled: false, kind: 'link' };
    if (existingApplication)
      return { label: 'View Application', href: route('student.applications.show', existingApplication.id), disabled: false, kind: 'link' };
    if (requiresRenewal)
      return { label: 'Request Renewal', onClick: () => setRenewalDialogOpen(true), disabled: false, kind: 'button' };
    if (!windowOpen)
      return { label: 'Applications Closed', disabled: true, kind: 'button' };
    return {
      label: 'Apply Now',
      href: route('student.applications.create', { hostel_id: hostel.id }),
      disabled: false,
      kind: 'link',
    };
  };

  const cta = getCta();

  return (
    <AuthenticatedLayout
      title={hostel.name}
      breadcrumbs={[
        { label: 'Hostels', href: route('student.hostels.index') },
        { label: hostel.name, href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title={`${hostel.name} – Housing@UMU`} />

      {/* D7: Renewal popup ───────────────────────────────────────────────── */}
      <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Renewal for {hostel.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            As a returning student, access to on-campus halls requires Dean of Students approval.
            Would you like to submit a renewal request?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenewalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-700 hover:bg-brand-800 text-white"
              onClick={handleRenewalRequest}
            >
              Request Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        <Link
          href={route('student.hostels.index')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back to Hostels
        </Link>

        {/* ── Hero image ──────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden border shadow-sm">
          {hostel.image_path ? (
            <img
              src={hostel.image_path}
              alt={hostel.name}
              className="w-full h-52 object-cover"
            />
          ) : (
            <div className="w-full h-52 bg-muted flex items-center justify-center">
              <BedDouble className="size-16 text-muted-foreground/30" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* ── Header + CTA ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">{hostel.name}</h1>
            {hostel.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="size-3.5 text-accent-500" /> {hostel.location}
              </p>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-brand-700 text-white text-xs">
                {TYPE_LABELS[hostel.hostel_type]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {GENDER_LABELS[hostel.gender_policy]}
              </Badge>
              {!windowOpen && (
                <Badge
                  variant="outline"
                  className="text-xs border-muted-foreground/50 text-muted-foreground flex items-center gap-1"
                >
                  <Lock className="size-2.5" /> Closed
                </Badge>
              )}
            </div>
          </div>

          {/* Primary CTA */}
          {cta.kind === 'link' && !cta.disabled ? (
            <Button
              asChild
              className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
              title={cta.label}
            >
              <Link href={(cta as { href: string }).href}>{cta.label}</Link>
            </Button>
          ) : (
            <Button
              disabled={cta.disabled}
              onClick={'onClick' in cta ? cta.onClick : undefined}
              className={cn(
                'font-semibold',
                cta.disabled
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-brand-700 hover:bg-brand-800 text-white'
              )}
              title={cta.disabled ? 'Application window is closed' : cta.label}
            >
              {cta.label}
            </Button>
          )}
        </div>

        {/* ── Status banners ───────────────────────────────────────────────── */}
        {activeAllocation && (
          <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-300 rounded-lg px-4 py-3">
            <CheckCircle2 className="size-4 text-green-700 shrink-0" />
            <span className="text-green-800">
              You already have an active room allocation this semester.
            </span>
          </div>
        )}
        {existingApplication && !activeAllocation && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Info className="size-4 text-blue-600 shrink-0" />
            <span className="text-blue-800">
              You have applied to this hostel.{' '}
              <Link
                href={route('student.applications.show', existingApplication.id)}
                className="font-semibold underline underline-offset-2"
              >
                Status: <StatusPill status={existingApplication.status} />
              </Link>
            </span>
          </div>
        )}
        {hostel.hostel_type === 'affiliated' &&
          campusBedsAvailable > 0 &&
          student.is_first_year && (
            <div className="flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3">
              <AlertCircle className="size-4 text-yellow-700 shrink-0" />
              <span className="text-yellow-800">
                On-campus beds are still available ({campusBedsAvailable}). As a first-year
                student, on-campus accommodation is prioritised. Affiliated hostels require
                Dean/Warden approval.
              </span>
            </div>
          )}

        {/* ── Stats card ──────────────────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Available Beds</p>
              <p className="text-xl font-bold font-heading">
                {hostel.available_beds}
                <span className="text-sm font-normal text-muted-foreground">
                  /{hostel.total_capacity}
                </span>
              </p>
            </div>
            {hostel.price_per_semester && (
              <div>
                <p className="text-xs text-muted-foreground">Price/Semester</p>
                <p className="font-semibold">
                  UGX {Number(hostel.price_per_semester).toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Gender Policy</p>
              <p className="font-medium">{GENDER_LABELS[hostel.gender_policy]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium">{TYPE_LABELS[hostel.hostel_type]}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Description ─────────────────────────────────────────────────── */}
        {hostel.description && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">About this Hostel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {hostel.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Rooms ───────────────────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BedDouble className="size-4 text-accent-500" />
                Rooms ({rooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">Room {room.room_number}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {room.room_type}
                        {room.floor ? ` · Floor ${room.floor}` : ''}
                        {room.gender_override
                          ? ` · ${GENDER_LABELS[room.gender_override] ?? room.gender_override}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3 text-accent-500" />
                      Cap. {room.capacity}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </AuthenticatedLayout>
  );
}
