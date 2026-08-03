// File: resources/js/Pages/Student/Application/Create.tsx  — MERGED
// This page completes the storefront checkout flow started on the Hostel Detail
// page: the room *category* (standard / self-contained / apartment) was already
// chosen there and arrives via the `roomType` prop. Here the student picks:
//   1. Occupancy (single/double) — required, drives price.
//   2. Optionally toggles "Request specific rooms" to reveal a picker that lets
//      them add up to `maxPreferredRooms` preferred rooms, contact-card style:
//      the first room added is the "primary" choice, subsequent ones are
//      fallback alternatives in priority order — mirroring the "add another
//      contact" pattern in a phone's Contacts app.
// Retains from the original form: Inertia useForm binding, the debounced
// auto-save draft flow, the D7 renewal gate, and the window-closed / affiliated
// hostel warnings.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import axios from 'axios';
import {
  AlertCircle, BedDouble, Building2, ChevronLeft, Info, Lock, Plus, Save,
  Star, Users, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';


// ── Types ──────────────────────────────────────────────────────────────────────


interface HostelSummary {
  id: number;
  name: string;
  slug: string;
  hostel_type: string;
  gender_policy?: string;
  location?: string;
  price_per_semester?: number | string;
  image_path?: string;
  is_application_window_open?: boolean;
}


// NEW: occupancy option available within the chosen room category.
interface OccupancyOption {
  capacity: number;
  label: string;
  price: number | string;
}


// NEW: a specific room the student can optionally mark as preferred.
interface RoomOption {
  id: number;
  room_number: string;
  floor?: string | number;
  room_type: string;
  capacity: number;
  gender_scope?: string;
  price_per_semester?: number | string;
}


interface Term {
  id: number;
  name: string;
  academic_year: string;
}


interface Draft {
  form_id?: string;
  capacity?: number;
  preferred_room_ids?: number[];
  notes?: string;
  special_needs?: string;
}


interface Props {
  hostel: HostelSummary;
  roomType: string;                 // NEW: category chosen on the Hostel Detail page
  occupancyOptions: OccupancyOption[];
  rooms: RoomOption[];              // NEW: eligible rooms within this category (all occupancies)
  maxPreferredRooms: number;        // NEW: cap on preferred room selections (3)
  currentTerm: Term;
  student: { id?: number; name?: string; gender?: string; is_first_year: boolean; year_of_study?: number };
  windowOpen: boolean;
  requiresRenewal: boolean;
  campusBedsAvailable?: number | null;
  draft?: Draft | null;
}


interface FormData {
  hostel_id: number;
  room_type: string;                       // NEW: replaces old free-text room_type preference select
  capacity: number | '';                   // NEW: chosen occupancy, required
  preferred_room_ids: number[];            // NEW: replaces old single preferred_room_id select
  notes: string;
  special_needs: string;
}


const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard Room',
  'self-contained': 'Self-Contained Room',
  apartment: 'Apartment',
};


// ── Component ─────────────────────────────────────────────────────────────────


export default function ApplicationCreate({
  hostel,
  roomType,
  occupancyOptions,
  rooms,
  maxPreferredRooms,
  currentTerm,
  student,
  windowOpen,
  requiresRenewal,
  campusBedsAvailable = 0,
  draft,
}: Props) {
  const { data, setData, post, processing, errors } = useForm<FormData>({
    hostel_id:           hostel.id,
    room_type:           roomType,
    capacity:            draft?.capacity ?? occupancyOptions[0]?.capacity ?? '',
    preferred_room_ids:  draft?.preferred_room_ids ?? [],
    notes:               draft?.notes ?? '',
    special_needs:       draft?.special_needs ?? '',
  });

  // ── Step 2 toggle: "Request specific rooms" — mirrors the phone Contacts app
  // pattern: off by default, revealing an "add preferred room" list when on. ──
  const [requestSpecificRooms, setRequestSpecificRooms] = useState(
    Boolean(draft?.preferred_room_ids?.length)
  );

  // ── Auto-save (debounced 3 s) ────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const formId = useRef<string>(
    draft?.form_id ?? (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString())
  );

  // FIX: auto-save must NOT go through Inertia's router — router.patch()
  // tags the request with X-Inertia headers, and Inertia's client then
  // requires a matching Inertia-format response. saveDraft() intentionally
  // returns plain JSON (just a timestamp) since this is a background save,
  // not a page navigation, so axios (no Inertia protocol) is the correct
  // tool here instead of router.patch().
  const triggerAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      axios.patch(
        route('student.applications.draft.save', formId.current),
        { ...data, form_id: formId.current }
      ).then((response) => {
        setLastSaved(new Date().toLocaleTimeString());
        // FIX: adopt the server's canonical form_id — if a draft already
        // existed for this student+hostel+term under a different id (e.g.
        // from an earlier session), this keeps the client in sync with it
        // instead of continuing to autosave under a UUID the DB doesn't
        // recognize as matching that row.
        if (response.data?.form_id) {
          formId.current = response.data.form_id;
        }
      }).catch((error) => {
        console.error('Draft auto-save failed', error);
      });
    }, 3000);
  };

  useEffect(() => {
    triggerAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [data]);

  // Rooms available for the currently selected occupancy — recalculated whenever
  // the student changes their single/double choice.
  const availableRoomsForCapacity = useMemo(
    () => rooms.filter((r) => r.capacity === data.capacity),
    [rooms, data.capacity]
  );

  // Rooms not yet added to the preferred list, for the "add a room" picker.
  const selectableRooms = useMemo(
    () => availableRoomsForCapacity.filter((r) => !data.preferred_room_ids.includes(r.id)),
    [availableRoomsForCapacity, data.preferred_room_ids]
  );

  const selectedCategoryOption = occupancyOptions.find((o) => o.capacity === data.capacity);

  // NEW: adds a room to the preferred list, respecting the maxPreferredRooms cap.
  const addPreferredRoom = (roomId: number) => {
    if (data.preferred_room_ids.length >= maxPreferredRooms) return;
    setData('preferred_room_ids', [...data.preferred_room_ids, roomId]);
  };

  // NEW: removes a room from the preferred list; remaining rooms keep their relative order.
  const removePreferredRoom = (roomId: number) => {
    setData('preferred_room_ids', data.preferred_room_ids.filter((id) => id !== roomId));
  };

  // When occupancy changes, drop any preferred rooms that no longer match the new capacity.
  const handleCapacityChange = (newCapacity: number) => {
    setData((prev) => ({
      ...prev,
      capacity: newCapacity,
      preferred_room_ids: prev.preferred_room_ids.filter(
        (id) => rooms.find((r) => r.id === id)?.capacity === newCapacity
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // FIX: kill any in-flight debounce so autosave can't fire a moment
    // after this submit request, re-creating draft_data on an already-
    // finalized row.
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    post(route('student.applications.store'), {
      data: {
        ...data,
        // FIX: form_id must travel with the final submission so the backend
        // can locate and finalize the SAME row the autosave draft created,
        // instead of creating a second, disconnected Application row.
        form_id: formId.current, // Lets the backend find and finalize the exact draft this session autosaved
        preferred_room_ids: requestSpecificRooms ? data.preferred_room_ids : [],
      },
      // NEW: diagnostic — logs the actual validation/business-rule error
      // instead of silently landing back on this same page.
      onError: (errs: Record<string, string>) => {
        console.error('Application submit failed:', errs);
      },
      onSuccess: () => {
        console.log('Application submitted successfully.');
      },
    } as any);
  };

  // ── D7: Renewal gate ─────────────────────────────────────────────────────
  if (requiresRenewal) {
    return (
      <AuthenticatedLayout
        title="Apply for Accommodation"
        breadcrumbs={[
          { label: 'Dashboard', href: route('student.dashboard') },
          { label: 'Hostels', href: route('student.hostels.index') },
          { label: hostel.name, href: route('student.hostels.show', { hostel: hostel.slug }) },
          { label: 'New Application' },
        ]}
      >
        <Head title={`Apply – ${hostel.name}`} />
        <div className="max-w-lg mx-auto mt-12 px-4">
          <Card className="rounded-xl border shadow-sm">
            <CardContent className="py-10 px-6 flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-accent-500/10 p-4">
                <Lock className="size-8 text-accent-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-heading text-foreground">
                  Renewal Required
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Non-first-year students must request Dean approval to continue in on-campus halls.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button
                  className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
                  onClick={() =>
                    router.post(route('student.allocation.request', 'renewal_request'), {
                      allocation_id:    0,
                      hostel_id:        hostel.id,
                      academic_term_id: currentTerm.id,
                    })
                  }
                >
                  Request Renewal
                </Button>
                <Button asChild variant="outline">
                  <Link href={route('student.hostels.index')}>Browse Other Hostels</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  const canSubmit = Boolean(data.capacity) && windowOpen && !requiresRenewal;

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <AuthenticatedLayout
      title="Apply for Accommodation"
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: 'Hostels', href: route('student.hostels.index') },
        { label: hostel.name, href: route('student.hostels.show', { hostel: hostel.slug }) },
        { label: 'New Application', href: '#' },
      ]}
    >
      <Head title={`Apply – ${hostel.name}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Back */}
        <Link
          href={route('student.hostels.show', { hostel: hostel.slug })}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back to {hostel.name}
        </Link>

        {/* ── Hostel Header (read-only) — doubles as the order summary for the
             storefront checkout flow, showing the chosen category. ────────── */}
        <Card className="rounded-xl border shadow-sm bg-muted/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-brand-700/10 p-3">
              <Building2 className="size-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Applying to</p>
              <p className="font-semibold text-foreground truncate">{hostel.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {/* NEW: shows the room category chosen on the Hostel Detail page */}
                {CATEGORY_LABELS[roomType] ?? hostel.hostel_type.replace('-', ' ')}
                {hostel.location && ` · ${hostel.location}`}
              </p>
            </div>
            <div className="text-xs font-medium text-muted-foreground shrink-0">
              {currentTerm.name}<br />
              <span className="text-[10px]">{currentTerm.academic_year}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Affiliated hostel warning ────────────────────────────────────── */}
        {hostel.hostel_type === 'affiliated' && !!campusBedsAvailable && campusBedsAvailable > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              On-campus beds are still available ({campusBedsAvailable} remaining).
              First-year students should apply on-campus first. An affiliated hostel
              requires Dean or Warden approval.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Window closed warning ────────────────────────────────────────── */}
        {!windowOpen && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              The application window for this hostel is currently closed. You may save a draft.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Form ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} id={`form-${formId.current}`}>

          {/* ── Step 1: Occupancy (single/double) — required, drives price ──── */}
          <Card className="rounded-xl border shadow-sm mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-accent-500" /> Choose Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {occupancyOptions.map((opt) => (
                <button
                  key={opt.capacity}
                  type="button"
                  onClick={() => handleCapacityChange(opt.capacity)}
                  className={cn(
                    'text-left rounded-lg border px-4 py-3 transition-colors',
                    data.capacity === opt.capacity
                      ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <p className="font-semibold text-sm">{opt.label} Room</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    UGX {Number(opt.price).toLocaleString()} / semester
                  </p>
                </button>
              ))}
              {errors.capacity && (
                <p className="text-xs text-destructive col-span-full">{errors.capacity}</p>
              )}
            </CardContent>
          </Card>

          {/* ── Step 2: Request specific rooms toggle ──────────────────────── */}
          <Card className="rounded-xl border shadow-sm mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star className="size-4 text-accent-500" /> Request Specific Rooms
                </CardTitle>
                <Switch
                  checked={requestSpecificRooms}
                  onCheckedChange={(checked) => {
                    setRequestSpecificRooms(checked);
                    if (!checked) setData('preferred_room_ids', []);
                  }}
                  aria-label="Toggle requesting specific preferred rooms"
                />
              </div>
            </CardHeader>
            {requestSpecificRooms && (
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" />
                  Optional — add up to {maxPreferredRooms} preferred rooms in priority order.
                  Your first pick is treated as primary.
                </p>

                {/* NEW: "contact card" list — one row per preferred room, primary first */}
                {data.preferred_room_ids.length > 0 && (
                  <div className="space-y-2">
                    {data.preferred_room_ids.map((roomId, index) => {
                      const room = rooms.find((r) => r.id === roomId);
                      if (!room) return null;
                      return (
                        <div
                          key={roomId}
                          className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'size-8 rounded-full flex items-center justify-center text-xs font-semibold',
                                index === 0
                                  ? 'bg-brand-700 text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {index === 0 ? <Star className="size-3.5" /> : index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Room {room.room_number}
                                {index === 0 && (
                                  <Badge className="ml-2 text-[10px] bg-brand-700 text-white">Primary</Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {room.floor ? `Floor ${room.floor}` : 'Ground floor'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePreferredRoom(roomId)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label={`Remove Room ${room.room_number} from preferred rooms`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* NEW: "Add preferred room" — disabled once the cap is reached */}
                {data.preferred_room_ids.length < maxPreferredRooms && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Add {data.preferred_room_ids.length === 0 ? 'a primary' : 'another'} room
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectableRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => addPreferredRoom(room.id)}
                          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs hover:bg-muted/50 hover:border-brand-700 transition-colors"
                        >
                          <Plus className="size-3.5 text-accent-500 shrink-0" />
                          Room {room.room_number}
                        </button>
                      ))}
                      {selectableRooms.length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-full">
                          No more eligible rooms available for this occupancy.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {data.preferred_room_ids.length >= maxPreferredRooms && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of {maxPreferredRooms} preferred rooms reached.
                  </p>
                )}
                {errors.preferred_room_ids && (
                  <p className="text-xs text-destructive">{errors.preferred_room_ids}</p>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Application Details</CardTitle>
              {lastSaved && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Save className="size-3 text-accent-500" /> Draft saved at {lastSaved}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information for the housing office..."
                  value={data.notes}
                  onChange={(e) => setData('notes', e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {data.notes.length}/1000
                </p>
                {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
              </div>

              {/* Special Needs */}
              <div className="space-y-1.5">
                <Label htmlFor="special_needs">
                  Special Needs or Accessibility Requirements (optional)
                </Label>
                <Textarea
                  id="special_needs"
                  placeholder="E.g. wheelchair access, ground floor, etc."
                  value={data.special_needs}
                  onChange={(e) => setData('special_needs', e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="resize-none"
                />
                {errors.special_needs && (
                  <p className="text-xs text-destructive">{errors.special_needs}</p>
                )}
              </div>

              {/* Global hostel error */}
              {errors.hostel_id && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{errors.hostel_id}</AlertDescription>
                </Alert>
              )}

              {/* NEW: order total — reflects the chosen occupancy price */}
              {selectedCategoryOption && (
                <p className="text-sm border-t pt-3">
                  <span className="text-muted-foreground">Total:</span>{' '}
                  <span className="font-bold font-heading text-brand-700">
                    UGX {Number(selectedCategoryOption.price).toLocaleString()} / semester
                  </span>
                </p>
              )}

            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href={route('student.hostels.show', { hostel: hostel.slug })}>
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={processing || !canSubmit}
              title={
                !windowOpen
                  ? 'Application window is closed for this hostel'
                  : 'Submit your application'
              }
              className={cn(
                'flex-1 font-semibold',
                canSubmit
                  ? 'bg-brand-700 hover:bg-brand-800 text-white'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {processing ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>

      </div>
    </AuthenticatedLayout>
  );
}
