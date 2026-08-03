// resources/js/components/Admin/Allocations/AllocationsDialog.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  CheckCircle2, XCircle, ArrowLeftRight, ArrowUpCircle,
  ChevronDown, Dices, Loader2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Mode = 'approve' | 'reject' | 'override' | 'promote';

interface BedOption {
  bed_id: number;
  bed_label: string;
  room_id: number;
  room_number: string;
  room_type: string;
  floor?: string | number;
}

// NEW: override's endpoint returns a flatter shape (hostel_name instead of
// room_type/floor) since it lists EVERY available bed system-wide, not
// beds scoped to one application's category — kept distinct rather than
// forcing both shapes to match artificially.
interface OverrideBedOption {
  id: number;
  label: string;
  room_number: string;
  hostel_name: string;
}

interface Props {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;

  // approve / reject / promote — all keyed by application
  applicationId?: number;
  studentName?: string;
  hostelName?: string;
  applicationRoomType?: string; // drives the default category for random/manual pick

  // override — keyed by allocation, uses a pre-fetched flat bed list
  allocationId?: number;
  currentBedLabel?: string | null;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  'self-contained': 'Self-Contained',
  apartment: 'Apartment',
};

// NEW: single config table drives icon, copy, and confirm-button styling
// per mode — adding a fifth mode later means adding one row here, not a
// new file.
const MODE_CONFIG: Record<Mode, {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  confirmLabel: string;
  confirmClass: string;
}> = {
  approve: {
    icon: CheckCircle2, iconClass: 'text-emerald-600',
    title: 'Approve Application', confirmLabel: 'Approve',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  reject: {
    icon: XCircle, iconClass: 'text-destructive',
    title: 'Reject Application', confirmLabel: 'Reject',
    confirmClass: 'bg-destructive hover:bg-destructive/90 text-white',
  },
  override: {
    icon: ArrowLeftRight, iconClass: 'text-purple-600',
    title: 'Override Bed (BR-9)', confirmLabel: 'Override Bed',
    confirmClass: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  promote: {
    icon: ArrowUpCircle, iconClass: 'text-blue-600',
    title: 'Promote from Waitlist', confirmLabel: 'Promote',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export default function AllocationsDialog({
  mode, open, onOpenChange,
  applicationId, studentName, hostelName,
  applicationRoomType, allocationId, currentBedLabel,
}: Props) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  const isApplicationMode = mode === 'approve' || mode === 'reject' || mode === 'promote';
  const supportsBedPicker = mode === 'approve' || mode === 'promote' || mode === 'override';
  const bedPickerRequired = mode === 'override';

  // Shared
  const [submitting, setSubmitting] = useState(false);

  // approve-only
  const [notes, setNotes] = useState('');

  // reject-only
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // override-only state
  const [overrideBedOptions, setOverrideBedOptions] = useState<OverrideBedOption[]>([]); // FIXED: renamed + typed as array — this is the fetched LIST
  const [overrideBedsLoading, setOverrideBedsLoading] = useState(false);
  const [selectedOverrideBed, setSelectedOverrideBed] = useState<OverrideBedOption | null>(null); // the admin's CHOICE from that list
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideNotesError, setOverrideNotesError] = useState('');

  // approve / promote manual-bed-pick sub-flow — defaults OFF (random)
  const [manualAllocate, setManualAllocate] = useState(false);
  const [includeOtherTypes, setIncludeOtherTypes] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<'random' | number>('random');
  const [bedsLoading, setBedsLoading] = useState(false);
  const [matching, setMatching] = useState<BedOption[]>([]);
  const [other, setOther] = useState<BedOption[]>([]);

  // Reset all local state whenever the dialog opens for a new target,
  // so state from a previously-opened row never leaks into this one.
  useEffect(() => {
    if (!open) return;
    setNotes('');
    setReason('');
    setReasonError('');
    setOverrideBedOptions([]); // FIXED: was setOverrideBeds(null)
    setSelectedOverrideBed(null); // NEW
    setOverrideNotes('');
    setOverrideNotesError('');
    setManualAllocate(false);
    setIncludeOtherTypes(false);
    setSelectedBedId('random');
    setMatching([]);
    setOther([]);
  }, [open, applicationId, allocationId]);

  // NEW: this fetch effect was entirely missing — without it, override mode
  // never populates any beds at all, list stays empty regardless of the
  // naming bug. Mirrors the approve/promote lazy-fetch pattern.
  useEffect(() => {
    if (!open || mode !== 'override' || !allocationId) return;
    setOverrideBedsLoading(true);
    axios.get(route('admin.allocations.available-beds-for-allocation', allocationId))
      .then((res) => setOverrideBedOptions(res.data ?? []))
      .finally(() => setOverrideBedsLoading(false));
  }, [open, mode, allocationId]);

  // Lazily fetch matching/other beds only once the admin actually opts
  // into manual allocation on approve/promote — avoids an unnecessary
  // request on the common "just approve, allocate randomly" path.
  useEffect(() => {
    if (!open || !manualAllocate || !applicationId || mode === 'override') return;
    setBedsLoading(true);
    axios.get(route('admin.allocations.available-beds', applicationId)).then((res) => {
      setMatching(res.data.matching ?? []);
      setOther(res.data.other ?? []);
    }).finally(() => setBedsLoading(false));
  }, [open, manualAllocate, applicationId, mode]);

  const revealOtherTypes = () => setIncludeOtherTypes(true);
  const visibleRooms = includeOtherTypes ? [...matching, ...other] : matching;

  const handleConfirm = () => {
    if (mode === 'reject' && !reason.trim()) {
      setReasonError('A rejection reason is required.');
      return;
    }
    if (mode === 'override' && !selectedOverrideBed) { // FIXED: was checking overrideBeds (the list)
      return;
    }
    if (mode === 'override' && !overrideNotes.trim()) {
      setOverrideNotesError('Admin notes are required for manual overrides (BR-9).');
      return;
    }

    setSubmitting(true);

    // NEW: every branch below only tells the backend WHAT the admin
    // decided (approve/reject/override/promote + optional bed choice) —
    // none of them contain allocation logic themselves. Random-vs-specific
    // resolution, waitlist fallback, and gender/policy checks all live in
    // AllocationService::create(), invoked server-side only.
    if (mode === 'approve') {
      router.patch(route('admin.applications.approve', applicationId), {
        notes,
        bed_id: manualAllocate && selectedBedId !== 'random' ? selectedBedId : null,
        include_other_types: manualAllocate ? includeOtherTypes : false,
      }, { onFinish: () => { setSubmitting(false); onOpenChange(false); } });
    }

    if (mode === 'promote') {
      router.patch(route('admin.waitlist.promote', applicationId), {
        bed_id: manualAllocate && selectedBedId !== 'random' ? selectedBedId : null,
        include_other_types: manualAllocate ? includeOtherTypes : false,
      }, { onFinish: () => { setSubmitting(false); onOpenChange(false); } });
    }

    if (mode === 'reject') {
      router.patch(route('admin.applications.reject', applicationId), { reason }, {
        onError: () => setReasonError('Something went wrong. Please try again.'),
        onFinish: () => setSubmitting(false),
        onSuccess: () => onOpenChange(false),
      });
    }

    if (mode === 'override') {
      router.patch(route('admin.allocations.override', allocationId), {
        bed_id: selectedOverrideBed!.id, // FIXED: was overrideBeds!.id — overrideBeds was never the selection
        admin_notes: overrideNotes,
      }, { onFinish: () => { setSubmitting(false); onOpenChange(false); } });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn('size-5', config.iconClass)} /> {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'approve' && (
              <>Approving <strong>{studentName}</strong>'s application for <strong>{hostelName}</strong>. Leave bed allocation as random, or opt in below to choose a specific room.</>
            )}
            {mode === 'reject' && (
              <>Rejecting <strong>{studentName}</strong>'s application for <strong>{hostelName}</strong>. Any linked allocation is also cancelled.</>
            )}
            {mode === 'promote' && (
              <>Promoting <strong>{studentName}</strong> from the waitlist for <strong>{hostelName}</strong>. Defaults to a random bed within their applied category.</>
            )}
            {mode === 'override' && (
              <>Manually reassign this allocation to a different bed. Admin notes are <strong>required</strong>. This bypasses preference rules.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ── Reject body ─────────────────────────────────────────── */}
        {mode === 'reject' && (
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
              placeholder="Why is this application being rejected?"
              rows={3}
              className="text-sm resize-none"
            />
            {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
          </div>
        )}

        {/* ── Approve body: optional notes ────────────────────────── */}
        {mode === 'approve' && (
          <div className="space-y-2">
            <Label htmlFor="approve-notes" className="text-sm">
              Admin Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="approve-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        )}

        {/* ── Override body ─────────────────────────────────────── */}
        {mode === 'override' && (
          <div className="space-y-4">
            {currentBedLabel && (
              <p className="text-sm text-muted-foreground px-1">
                Current bed: <span className="font-medium text-foreground">{currentBedLabel}</span>
              </p>
            )}
            <div>
              <Label className="text-sm mb-1.5 block">Select New Bed <span className="text-destructive">*</span></Label>
              <Command className="border rounded-lg">
                <CommandInput placeholder="Search beds…" className="text-sm" />
                <CommandList className="max-h-44">
                  {overrideBedsLoading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <CommandEmpty className="text-xs py-3 text-center text-muted-foreground">
                        No available beds found.
                      </CommandEmpty>
                      <CommandGroup>
                        {overrideBedOptions.map((bed) => ( /* FIXED: was overrideBeds.map — now iterates the actual array */
                          <CommandItem
                            key={bed.id}
                            value={`${bed.hostel_name} ${bed.room_number} ${bed.label}`}
                            onSelect={() => setSelectedOverrideBed(bed)}
                            className={selectedOverrideBed?.id === bed.id ? 'bg-primary/10 text-primary' : ''} /* FIXED: was overrideBeds?.id */
                          >
                            <span className="font-medium">{bed.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">Room {bed.room_number} · {bed.hostel_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </div>
            <div>
              <Label htmlFor="override-notes" className="text-sm mb-1.5 block">
                Admin Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="override-notes"
                value={overrideNotes}
                onChange={(e) => { setOverrideNotes(e.target.value); setOverrideNotesError(''); }}
                placeholder="Reason for manual override…"
                rows={3}
                className="text-sm resize-none"
              />
              {overrideNotesError && <p className="text-xs text-destructive mt-1">{overrideNotesError}</p>}
            </div>
          </div>
        )}

        {/* ── Approve/Promote shared body: manual bed toggle ──────── */}
        {(mode === 'approve' || mode === 'promote') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/30">
              <Label htmlFor="manual-allocate" className="text-sm font-medium">
                Allocate a specific bed manually
              </Label>
              <Switch id="manual-allocate" checked={manualAllocate} onCheckedChange={setManualAllocate} />
            </div>

            {manualAllocate && (
              <>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/30">
                  <Label htmlFor="include-other-types" className="text-sm font-medium">
                    Include rooms outside {ROOM_TYPE_LABELS[applicationRoomType ?? ''] ?? applicationRoomType}
                  </Label>
                  <Switch id="include-other-types" checked={includeOtherTypes} onCheckedChange={setIncludeOtherTypes} />
                </div>

                {bedsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    <RadioGroup
                      value={String(selectedBedId)}
                      onValueChange={(v) => setSelectedBedId(v === 'random' ? 'random' : Number(v))}
                    >
                      <div className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                        selectedBedId === 'random' && 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                      )}>
                        <RadioGroupItem value="random" id="bed-random" />
                        <Dices className="size-4 text-accent-500 shrink-0" />
                        <Label htmlFor="bed-random" className="flex-1 cursor-pointer">
                          Random bed {includeOtherTypes ? '(any eligible category)' : `(within ${ROOM_TYPE_LABELS[applicationRoomType ?? ''] ?? applicationRoomType})`}
                        </Label>
                      </div>

                      {visibleRooms.map((bed) => (
                        <div
                          key={bed.bed_id}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                            selectedBedId === bed.bed_id && 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                          )}
                        >
                          <RadioGroupItem value={String(bed.bed_id)} id={`bed-${bed.bed_id}`} />
                          <Label htmlFor={`bed-${bed.bed_id}`} className="flex-1 cursor-pointer">
                            Room {bed.room_number} — Bed {bed.bed_label}
                            {bed.floor && <span className="text-muted-foreground"> · Floor {bed.floor}</span>}
                          </Label>
                          {bed.room_type !== applicationRoomType && (
                            <Badge variant="outline" className="text-[10px]">
                              {ROOM_TYPE_LABELS[bed.room_type] ?? bed.room_type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </RadioGroup>

                    {!includeOtherTypes && other.length > 0 && (
                      <button
                        type="button"
                        onClick={revealOtherTypes}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ChevronDown className="size-3.5" />
                        View {other.length} room{other.length === 1 ? '' : 's'} in other categories
                      </button>
                    )}

                    {visibleRooms.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No available beds match this category.{' '}
                        {!includeOtherTypes && 'Try including other room types.'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting || (mode === 'override' && !selectedOverrideBed)}
            className={cn('min-w-24', config.confirmClass)}
          >
            {submitting ? 'Processing…' : config.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
