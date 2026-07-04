// File: resources/js/Pages/Student/Application/Create.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { AlertCircle, Building2, ChevronLeft, Info, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HostelSummary {
  id: number;
  name: string;
  slug: string;
  hostel_type: string;
  location?: string;
  price_per_semester?: number | string;
}

interface RoomOption {
  id: number;
  room_number: string;
  room_type?: string;
  floor?: string | number;
}

interface Term {
  id: number;
  name: string;
  academic_year: string;
}

interface Draft {
  form_id?: string;
  preferred_room_id?: string | number;
  notes?: string;
  special_needs?: string;
  preferences?: {
    room_type?: string;
    floor_pref?: string;
    roommate?: string;
  };
}

interface Props {
  hostel: HostelSummary;
  rooms: RoomOption[];
  currentTerm: Term;
  student: { name: string; is_first_year: boolean };
  windowOpen: boolean;
  requiresRenewal: boolean;
  campusBedsAvailable?: number;
  draft?: Draft;
  selectedRoomId?: number | string;
}

interface FormData {
  hostel_id: number;
  preferred_room_id: string | number;
  notes: string;
  special_needs: string;
  preferences: {
    room_type: string;
    floor_pref: string;
    roommate: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateApplication({
  hostel,
  rooms,
  currentTerm,
  student,
  windowOpen,
  requiresRenewal,
  campusBedsAvailable = 0,
  draft,
  selectedRoomId,
}: Props) {
  const { data, setData, post, processing, errors } = useForm<FormData>({
    hostel_id:         hostel.id,
    preferred_room_id: selectedRoomId ?? draft?.preferred_room_id ?? '',
    notes:             draft?.notes ?? '',
    special_needs:     draft?.special_needs ?? '',
    preferences: {
      room_type:  draft?.preferences?.room_type  ?? '',
      floor_pref: draft?.preferences?.floor_pref ?? '',
      roommate:   draft?.preferences?.roommate   ?? '',
    },
  });

  // ── Auto-save (debounced 3 s) ────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const formId = useRef<string>(
    draft?.form_id ?? (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString())
  );

  const triggerAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      router.patch(
        route('student.applications.draft', formId.current),
        { ...(data as unknown as Record<string, string | number | boolean | object | null>), form_id: formId.current },
        {
          preserveState: true,
          preserveScroll: true,
          onSuccess: () => setLastSaved(new Date().toLocaleTimeString()),
        }
      );
    }, 3000);
  };

  useEffect(() => {
    triggerAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('student.applications.store'));
  };

  // ── D7: Renewal gate ─────────────────────────────────────────────────────
  if (requiresRenewal) {
    return (
      <AuthenticatedLayout
        title="Apply for Accommodation"
        breadcrumbs={[
          { label: 'Hostels', href: route('student.hostels.index') },
          { label: hostel.name, href: route('student.hostels.show', { hostel: hostel.slug }) },
          { label: 'Apply', href: '' },
          { label: '', href: '' },
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

        {/* ── Hostel Header (read-only) ────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm bg-muted/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-lg bg-brand-700/10 p-3">
              <Building2 className="size-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Applying to</p>
              <p className="font-semibold text-foreground truncate">{hostel.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {hostel.hostel_type.replace('-', ' ')}
                {hostel.location && ` · ${hostel.location}`}
                {hostel.price_per_semester && (
                  <> · UGX {Number(hostel.price_per_semester).toLocaleString()}/sem</>
                )}
              </p>
            </div>
            <div className="text-xs font-medium text-muted-foreground shrink-0">
              {currentTerm.name}<br />
              <span className="text-[10px]">{currentTerm.academic_year}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Affiliated hostel warning ────────────────────────────────────── */}
        {hostel.hostel_type === 'affiliated' && campusBedsAvailable > 0 && (
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

              {/* Preferred Room */}
              <div className="space-y-1.5">
                <Label htmlFor="preferred_room_id">Preferred Room (optional)</Label>
                <Select
                  value={data.preferred_room_id ? String(data.preferred_room_id) : ''}
                  onValueChange={(v) => setData('preferred_room_id', v ? parseInt(v) : '')}
                >
                  <SelectTrigger id="preferred_room_id" className="w-full">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        Room {r.room_number}
                        {r.floor ? ` – Floor ${r.floor}` : ''}
                        {r.room_type ? ` (${r.room_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.preferred_room_id && (
                  <p className="text-xs text-destructive">{errors.preferred_room_id}</p>
                )}
              </div>

              {/* Room Type Preference */}
              <div className="space-y-1.5">
                <Label htmlFor="pref_room_type">Room Type Preference</Label>
                <Select
                  value={data.preferences.room_type}
                  onValueChange={(v) =>
                    setData('preferences', { ...data.preferences, room_type: v })
                  }
                >
                  <SelectTrigger id="pref_room_type">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double (shared)</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="dormitory">Dormitory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Floor Preference */}
              <div className="space-y-1.5">
                <Label htmlFor="pref_floor">Floor Preference</Label>
                <Select
                  value={data.preferences.floor_pref}
                  onValueChange={(v) =>
                    setData('preferences', { ...data.preferences, floor_pref: v })
                  }
                >
                  <SelectTrigger id="pref_floor">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    <SelectItem value="ground">Ground Floor</SelectItem>
                    <SelectItem value="1">1st Floor</SelectItem>
                    <SelectItem value="2">2nd Floor</SelectItem>
                    <SelectItem value="3">3rd Floor</SelectItem>
                    <SelectItem value="top">Top Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
              disabled={processing || !windowOpen}
              title={
                !windowOpen
                  ? 'Application window is closed for this hostel'
                  : 'Submit your application'
              }
              className={cn(
                'flex-1 font-semibold',
                windowOpen
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
