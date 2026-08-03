// File: resources/js/Pages/Student/Hostel/Show.tsx
// NEW (storefront redesign): this page now works like an Airbnb listing page combined
// with an online store. Room "categories" (standard / self-contained / apartment) are
// rendered as product cards — each with its own image placeholder, starting price, and
// occupancy options. Clicking "Apply" on a category forwards ?room_type=<category> to
// the application create page, where occupancy and optional preferred rooms are chosen.
// The old flat "Rooms" list table has been removed in favor of these product cards.
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  AlertCircle, BedDouble, Building2, CheckCircle2, ChevronLeft,
  Info, Lock, MapPin, Users, ArrowRight,
  ShieldAlert,  // NEW: used by the gender-ineligibility notice
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


// NEW: occupancy option within a room category — single or double, each with its own price.
interface OccupancyOption {
  capacity: number;
  label: string;
  price: number | string;
}


// NEW: a room "category" behaves like a storefront product (standard / self-contained / apartment).
interface RoomCategory {
  room_type: string;
  label: string;
  description?: string | null;
  starting_price: number | string;
  room_count: number;
  occupancy_options: OccupancyOption[];
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
  categories: RoomCategory[]; // NEW: replaces the old flat `rooms` prop
  // NEW: true when the hostel's gender_scope excludes this student outright
  // (e.g. a female student viewing a male-only hall). Distinct from an
  // empty categories array with zero active rooms — this tells the frontend
  // to show an eligibility notice instead of a "no rooms" empty state.
  genderIneligible: boolean;
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


// NEW: icon per room category, used on the storefront product cards.
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  standard: <BedDouble className="size-5" />,
  'self-contained': <Building2 className="size-5" />,
  apartment: <Building2 className="size-5" />,
};


// ── Component ─────────────────────────────────────────────────────────────────


export default function HostelShow({
  hostel,
  categories,
  genderIneligible, // NEW
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


  // Determine primary CTA (D0, D2, D7) — governs whether category cards are clickable at all.
  type CtaConfig =
    | { label: string; href: string; disabled: false; kind: 'link' }
    | { label: string; onClick: () => void; disabled: false; kind: 'button' }
    | { label: string; disabled: true; kind: 'button' };


  const getBannerCta = (): CtaConfig | null => {
    if (activeAllocation)
      return { label: 'View Allocation', href: route('student.allocation.show'), disabled: false, kind: 'link' };
    if (existingApplication)
      return { label: 'View Application', href: route('student.applications.show', existingApplication.id), disabled: false, kind: 'link' };
    if (requiresRenewal)
      return { label: 'Request Renewal', onClick: () => setRenewalDialogOpen(true), disabled: false, kind: 'button' };
    if (!windowOpen)
      return { label: 'Applications Closed', disabled: true, kind: 'button' };
    return null; // No blocking state — category cards drive the "Apply" action instead
  };


  const bannerCta = getBannerCta();
  // NEW: category cards are only actionable when nothing blocks a fresh application.
  const canApplyToCategories = !bannerCta;


  return (
    <AuthenticatedLayout
      title={hostel.name}
      // hostel.name from the Inertia prop
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: 'Hostels', href: route('student.hostels.index') },
        { label: hostel.name },
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


        {/* ── Hero image (Airbnb-style listing header) ──────────────────── */}
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


        {/* ── Header ──────────────────────────────────────────────────────── */}
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


          {/* Blocking-state CTA (only rendered when the student cannot apply at all) */}
          {bannerCta && (
            bannerCta.kind === 'link' && !bannerCta.disabled ? (
              <Button asChild className="bg-brand-700 hover:bg-brand-800 text-white font-semibold" title={bannerCta.label}>
                <Link href={(bannerCta as { href: string }).href}>{bannerCta.label}</Link>
              </Button>
            ) : (
              <Button
                disabled={bannerCta.disabled}
                onClick={'onClick' in bannerCta ? bannerCta.onClick : undefined}
                className={cn(
                  'font-semibold',
                  bannerCta.disabled
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-brand-700 hover:bg-brand-800 text-white'
                )}
                title={bannerCta.disabled ? 'Application window is closed' : bannerCta.label}
              >
                {bannerCta.label}
              </Button>
            )
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
                <p className="text-xs text-muted-foreground">From</p>
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


        {/* ── NEW: Room Category "Storefront" ──────────────────────────────
    Each category (standard / self-contained / apartment) is a product
    card. Clicking "Apply" forwards room_type to the application page,
    where occupancy and optional preferred rooms are chosen. */}
        {genderIneligible ? (
          // NEW: gender-eligibility notice — replaces the entire storefront
          // section when hostel.gender_scope excludes this student outright.
          // Distinct from an empty-but-eligible categories array; this is a
          // hard "you cannot apply here" message, not a "nothing to show" one.
          <Card className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm dark:bg-amber-900/20">
            <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="shrink-0 rounded-full bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <ShieldAlert className="size-5" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Rooms in this hostel are reserved for {GENDER_LABELS[hostel.gender_policy]?.toLowerCase() ?? 'a specific'} students
                </p>
                <p className="text-sm text-amber-800/90 dark:text-amber-300/90">
                  Based on your student profile, you're not eligible to apply to{' '}
                  <span className="font-medium">{hostel.name}</span>. You can browse other
                  hostels that match your profile, or contact support if you believe this is
                  an error.
                </p>
                {/* NEW: two explicit escape routes — browse elsewhere, or reach support —
            per the requirement that the notice must guide the student forward
            rather than just block them. */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" className="bg-brand-700 hover:bg-brand-800 text-white font-semibold">
                    <Link href={route('student.hostels.index')}>
                      Browse Other Hostels
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="font-semibold">
                    <Link href={route('public.support')} className="flex items-center gap-1.5">
                      <Info className="size-3.5" /> Contact Support
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : categories.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BedDouble className="size-4 text-accent-500" />
              Room Categories
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.room_type}
                  className="rounded-xl border shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Product "image" placeholder — consistent with hero image treatment */}
                  <div className="h-28 bg-muted flex items-center justify-center text-muted-foreground/40">
                    {CATEGORY_ICON[category.room_type] ?? <BedDouble className="size-8" strokeWidth={1} />}
                  </div>
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <p className="font-semibold text-sm">{category.label}</p>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                      )}
                    </div>

                    {/* Occupancy chips — informational only here, chosen for real on the application page */}
                    <div className="flex flex-wrap gap-1.5">
                      {category.occupancy_options.map((opt) => (
                        <Badge key={opt.capacity} variant="outline" className="text-[10px]">
                          {opt.label} · UGX {Number(opt.price).toLocaleString()}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="font-bold font-heading text-brand-700">
                          UGX {Number(category.starting_price).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={!canApplyToCategories}
                        asChild={canApplyToCategories}
                        className={cn(
                          'font-semibold',
                          canApplyToCategories
                            ? 'bg-brand-700 hover:bg-brand-800 text-white'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                        title={canApplyToCategories ? `Apply for ${category.label}` : 'Applications currently unavailable'}
                      >
                        {canApplyToCategories ? (
                          <Link
                            href={route('student.applications.create', {
                              hostel_id: hostel.id,
                              room_type: category.room_type,
                            })}
                            className="flex items-center gap-1"
                          >
                            Apply <ArrowRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span>Apply</span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}


      </div>
    </AuthenticatedLayout>
  );
}
