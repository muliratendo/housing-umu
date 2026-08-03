// File: resources/js/Pages/Student/Application/Edit.tsx
// NEW: dedicated edit page for a draft, pending, or withdrawn application.
// Reuses the same "Request specific rooms" contact-card picker and
// notes/special-needs cards from Create.tsx, but room_type and capacity
// (occupancy) are READ-ONLY here — those were locked at checkout time.
// Only notes, special_needs, and preferred_room_ids are editable, matching
// what ApplicationService::edit() actually persists.
import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  AlertCircle, Building2, ChevronLeft, Info, Plus, Star, X,
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

interface RoomOption {
  id: number;
  room_number: string;
  floor?: string | number;
  room_type: string;
  capacity: number;
  gender_scope?: string;
  price_per_semester?: number | string;
}

interface ApplicationEditData {
  id: number;
  hostel_name: string;
  hostel_slug: string;
  room_type: string;                // read-only here
  capacity: number;                 // read-only here
  notes?: string;
  special_needs?: string;
  preferred_room_ids: number[];
  is_draft: boolean;
  status: string;
}

interface Props {
  application: ApplicationEditData;
  rooms: RoomOption[];
  maxPreferredRooms: number;
}

interface FormData {
  notes: string;
  special_needs: string;
  preferred_room_ids: number[];
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard Room',
  'self-contained': 'Self-Contained Room',
  apartment: 'Apartment',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicationEdit({ application, rooms, maxPreferredRooms }: Props) {
  const { data, setData, errors, processing, setError, clearErrors } = useForm<FormData>({
    notes: application.notes ?? '',
    special_needs: application.special_needs ?? '',
    preferred_room_ids: application.preferred_room_ids ?? [],
  });

  const [submitting, setSubmitting] = useState(false);

  // NEW: generic error bag access — ApplicationService::edit() can throw a
  // ValidationException keyed 'application' (e.g. eligibility failures),
  // which isn't a real FormData field, so it's read via a widened type
  // rather than extending FormData with a field that's never submitted.
  const applicationError = (errors as Record<string, string>).application;

  // NEW: toggle on by default if the application already had preferred rooms saved.
  const [requestSpecificRooms, setRequestSpecificRooms] = useState(
    application.preferred_room_ids.length > 0
  );

  // Rooms not yet added to the preferred list — capacity/room_type already
  // locked, so `rooms` here is pre-scoped by the controller.
  const selectableRooms = useMemo(
    () => rooms.filter((r) => !data.preferred_room_ids.includes(r.id)),
    [rooms, data.preferred_room_ids]
  );

  const addPreferredRoom = (roomId: number) => {
    if (data.preferred_room_ids.length >= maxPreferredRooms) return;
    setData('preferred_room_ids', [...data.preferred_room_ids, roomId]);
  };

  const removePreferredRoom = (roomId: number) => {
    setData('preferred_room_ids', data.preferred_room_ids.filter((id) => id !== roomId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      notes: data.notes,
      special_needs: data.special_needs,
      preferred_room_ids: requestSpecificRooms ? data.preferred_room_ids : [],
    };

    // NEW: three distinct outcomes depending on the application's current
    // state — "Save Changes" is really three different backend actions
    // wearing one button, matching what ApplicationService actually
    // supports (create/finalize a draft, resubmit a withdrawn one, or
    // plain edit() for a still-pending application).
    if (application.is_draft) {
      // Draft was never finalized — this POST runs it through the same
      // create()-with-existing_application_id path store() uses, turning
      // the draft into a real submission.
      router.post(route('student.applications.submit', application.id), payload);
    } else if (application.status === 'withdrawn') {
      // Withdrawn — persist the edited fields AND flip status back to
      // pending in one backend call.
      router.post(route('student.applications.resubmit', application.id), payload);
    } else {
      // Still pending — a normal field edit, no status change.
      router.patch(route('student.applications.update', application.id), payload);
    }
  };

  return (
    <AuthenticatedLayout
      title="Edit Application"
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: 'Applications', href: route('student.applications.index') },
        { label: application.hostel_name, href: route('student.applications.show', application.id) },
        { label: 'Edit' },
      ]}
    >
      <Head title={`Edit Application – ${application.hostel_name}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Back */}
        <Link
          href={route('student.applications.show', application.id)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back to Application
        </Link>

        {/* ── Read-only summary — room_type/capacity locked at checkout ─────── */}
        <Card className="rounded-xl border shadow-sm bg-muted/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-brand-700/10 p-3">
              <Building2 className="size-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Editing application to</p>
              <p className="font-semibold text-foreground truncate">{application.hostel_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {CATEGORY_LABELS[application.room_type] ?? application.room_type}
                {' · '}
                {application.capacity === 1 ? 'Single' : 'Double'} occupancy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* NEW: notice that category/occupancy can't be changed here — only
            available way to change those is to withdraw and re-apply fresh. */}
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Room category and occupancy were fixed when you applied and can't be changed here.
            To change them, withdraw this application and submit a new one.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit}>

          {/* ── Request specific rooms toggle — identical pattern to Create.tsx ── */}
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

          {/* ── Notes / special needs — identical fields to Create.tsx ────────── */}
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
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

              {applicationError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{applicationError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href={route('student.applications.show', application.id)}>
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 font-semibold bg-brand-700 hover:bg-brand-800 text-white"
            >
              {submitting
                ? (application.is_draft ? 'Submitting…' : application.status === 'withdrawn' ? 'Re-submitting…' : 'Saving…')
                : (application.is_draft ? 'Submit Application' : application.status === 'withdrawn' ? 'Re-submit Application' : 'Save Changes')}
            </Button>
          </div>
        </form>

      </div>
    </AuthenticatedLayout>
  );
}
