// resources/js/Pages/Admin/AcademicTerms/Index.tsx
import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, Plus, Pencil, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
// NEW: shadcn AlertDialog, used to confirm both activate and deactivate —
// deactivate especially, since it silently clears which term the rest of
// the system treats as "current" with no replacement named.
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DataTable from '@/components/Admin/shared/DataTable';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { AcademicYearManager } from '@/components/Admin/AcademicTerms/AcademicYearManager';

function toDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

interface TermFormValues {
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_application_window_open: boolean;
  // NEW: split out from the term's start_date — this is the actual field
  // that was missing before. Previously the backend always forced the
  // window's open-date to equal start_date, so there was no way to open
  // applications early; now the admin picks this independently.
  application_window_opens: string;
  application_deadline: string;
}

function TermFormDialog({
  open,
  onOpenChange,
  mode,
  term,
  academicYears,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  term?: any;
  academicYears: any[];
}) {
  const [range, setRange] = useState<DateRange | undefined>(
    mode === 'edit' ? { from: toDate(term?.start_date), to: toDate(term?.end_date) } : undefined,
  );
  // NEW: separate local Date state for the window's opening date, exactly
  // parallel to `deadline` below but intentionally NOT derived from
  // `range` — it must be pickable independently, including dates before
  // range.from, which is the whole point of this fix.
  const [windowOpensAt, setWindowOpensAt] = useState<Date | undefined>(
    mode === 'edit' ? toDate(term?.application_window_open) : undefined,
  );
  const [deadline, setDeadline] = useState<Date | undefined>(
    mode === 'edit' ? toDate(term?.application_window_close) : undefined,
  );

  const { data, setData, post, patch, processing, errors, reset } = useForm<TermFormValues>({
    academic_year_id: term ? String(term.academic_year_id) : '',
    name: term?.name ?? '',
    start_date: term?.start_date ?? '',
    end_date: term?.end_date ?? '',
    is_application_window_open: term?.is_application_window_open ?? false,
    application_window_opens: term?.application_window_open ?? '',
    application_deadline: term?.application_window_close ?? '',
  });

  React.useEffect(() => {
    if (!open) return;
    setRange(mode === 'edit' ? { from: toDate(term?.start_date), to: toDate(term?.end_date) } : undefined);
    setWindowOpensAt(mode === 'edit' ? toDate(term?.application_window_open) : undefined);
    setDeadline(mode === 'edit' ? toDate(term?.application_window_close) : undefined);
    setData({
      academic_year_id: term ? String(term.academic_year_id) : '',
      name: term?.name ?? '',
      start_date: term?.start_date ?? '',
      end_date: term?.end_date ?? '',
      is_application_window_open: term?.is_application_window_open ?? false,
      application_window_opens: term?.application_window_open ?? '',
      application_deadline: term?.application_window_close ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, term?.id]);

  const handleRangeChange = (next: DateRange | undefined) => {
    setRange(next);
    setData('start_date', next?.from ? format(next.from, 'yyyy-MM-dd') : '');
    setData('end_date', next?.to ? format(next.to, 'yyyy-MM-dd') : '');
    // NOTE: deliberately no longer clearing windowOpensAt/deadline when
    // the term range changes — the application window is intentionally
    // decoupled from the term's own start/end dates now, so shrinking the
    // term shouldn't silently wipe a validly-set window.
  };

  const handleWindowOpensChange = (next: Date | undefined) => {
    setWindowOpensAt(next);
    setData('application_window_opens', next ? format(next, 'yyyy-MM-dd') : '');
    // If the deadline is now before the new opens-date, clear it so the
    // window can't end up inverted — mirrors the range picker's own
    // internal guard logic.
    if (deadline && next && deadline < next) {
      setDeadline(undefined);
      setData('application_deadline', '');
    }
  };

  const handleDeadlineChange = (next: Date | undefined) => {
    setDeadline(next);
    setData('application_deadline', next ? format(next, 'yyyy-MM-dd') : '');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const onSuccess = () => {
      reset();
      setRange(undefined);
      setWindowOpensAt(undefined);
      setDeadline(undefined);
      onOpenChange(false);
    };
    if (mode === 'create') {
      post(route('admin.academic-terms.store'), { onSuccess });
    } else {
      patch(route('admin.academic-terms.update', { term: term.id }), { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{mode === 'create' ? 'Create Academic Term' : `Edit ${term?.name}`}</DialogTitle>
          <DialogDescription>
            Define the term's academic year, name, date range, and application window.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Academic Year</Label>
              {mode === 'create' && <AcademicYearManager academicYears={academicYears} />}
            </div>
            {academicYears.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2">
                No academic years exist yet. Use "Manage years" above to create one.
              </p>
            ) : mode === 'create' ? (
              <Select value={data.academic_year_id} onValueChange={(v) => setData('academic_year_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((y: any) => (
                    <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm rounded-md border bg-muted/40 px-3 py-2">
                {academicYears.find((y: any) => String(y.id) === String(data.academic_year_id))?.name ?? '—'}
              </p>
            )}
            {errors.academic_year_id && <p className="text-xs text-red-500 mt-1">{errors.academic_year_id}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Term Name</Label>
            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Semester 1 2025/2026" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Term Dates</Label>
            <DateRangePicker value={range} onChange={handleRangeChange} />
            {(errors.start_date || errors.end_date) && (
              <p className="text-xs text-red-500 mt-1">{errors.start_date || errors.end_date}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.is_application_window_open} onCheckedChange={(v) => setData('is_application_window_open', v)} />
            <Label>Application Window Open</Label>
          </div>
          {data.is_application_window_open && (
            <div className="grid grid-cols-2 gap-3">
              {/* NEW: this is the field that was completely missing
                  before. No `min` is passed here — deliberately, so an
                  admin can pick any date, including one well before the
                  term's own start_date, letting applications open early. */}
              <div className="space-y-1.5">
                <Label>Opens On</Label>
                <DatePicker
                  value={windowOpensAt}
                  onChange={handleWindowOpensChange}
                  placeholder="Select opening date"
                />
                {errors.application_window_opens && (
                  <p className="text-xs text-red-500 mt-1">{errors.application_window_opens}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <DatePicker
                  value={deadline}
                  onChange={handleDeadlineChange}
                  min={windowOpensAt}
                  placeholder="Select deadline"
                />
                {errors.application_deadline && <p className="text-xs text-red-500 mt-1">{errors.application_deadline}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#137c41] hover:bg-[#0b4b27] text-white" disabled={processing}>
              {processing ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// NEW: shared confirmation dialog for both activate and deactivate — the
// two actions are visually/behaviorally symmetric (same location, same
// pattern, opposite direction), so one component with an `action` prop
// avoids duplicating the AlertDialog markup twice.
function ActivationConfirmDialog({
  term,
  action,
  onOpenChange,
}: {
  term: any | null;
  action: 'activate' | 'deactivate' | null;
  onOpenChange: (open: boolean) => void;
}) {
  const busy = React.useRef(false);

  const confirm = () => {
    if (!term || !action || busy.current) return;
    busy.current = true;
    const routeName = action === 'activate' ? 'admin.academic-terms.activate' : 'admin.academic-terms.deactivate';
    router.patch(route(routeName, { term: term.id }), {}, {
      preserveState: true,
      onFinish: () => { busy.current = false; onOpenChange(false); },
    });
  };

  return (
    <AlertDialog open={!!term && !!action} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'activate' ? `Activate "${term?.name}"?` : `Deactivate "${term?.name}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'activate'
              ? 'This will become the current term. Any previously active term will be marked inactive.'
              : 'No term will be marked as current afterward. Anything that reads the "current" term (application forms, allocation logic) will treat this as unset until another term is activated.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className={action === 'deactivate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#137c41] hover:bg-[#0b4b27] text-white'}
          >
            {action === 'activate' ? 'Activate' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AcademicTermsIndex({ terms, academicYears, currentTermId }: any) {
  const [creating, setCreating] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any | null>(null);
  // NEW: tracks which term + which action (activate/deactivate) the
  // AlertDialog is currently confirming.
  const [confirmTarget, setConfirmTarget] = useState<{ term: any; action: 'activate' | 'deactivate' } | null>(null);

  const columns = [
    {
      key: 'name', header: 'Term', cell: (t: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{t.name}</span>
          {t.id === currentTermId && <Badge className="text-[10px] bg-[#137c41] text-white">Active</Badge>}
        </div>
      )
    },
    { key: 'academic_year', header: 'Year', cell: (t: any) => <span className="text-xs">{t.academic_year?.name}</span> },
    {
      key: 'dates', header: 'Dates', cell: (t: any) => {
        const start = toDate(t.start_date);
        const end = toDate(t.end_date);
        return (
          <span className="text-xs text-muted-foreground">
            {start ? format(start, 'd MMM yyyy') : '—'}
            {' → '}
            {end ? format(end, 'd MMM yyyy') : '—'}
          </span>
        );
      }
    },
    {
      key: 'window', header: 'App Window', cell: (t: any) => (
        <Badge variant="outline" className={`text-[10px] ${t.is_application_window_open ? 'border-green-300 text-green-700' : 'border-gray-200 text-gray-500'}`}>
          {t.is_application_window_open ? 'Open' : 'Closed'}
        </Badge>
      )
    },
    {
      key: 'actions', header: '', cell: (t: any) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingTerm(t)} aria-label={`Edit ${t.name}`}>
            <Pencil className="size-3.5" />
          </Button>
          {/* FIX: activate/deactivate now live in the SAME place, both
              gated behind the AlertDialog confirmation — previously only
              "Activate" existed and there was no way to turn a term off
              without naming a replacement. */}
          {t.id !== currentTermId ? (
            <Button
              size="sm" variant="ghost" className="h-7 text-xs text-[#137c41] gap-1"
              onClick={() => setConfirmTarget({ term: t, action: 'activate' })}
            >
              <Power className="size-3" /> Activate
            </Button>
          ) : (
            <Button
              size="sm" variant="ghost" className="h-7 text-xs text-red-600 gap-1"
              onClick={() => setConfirmTarget({ term: t, action: 'deactivate' })}
            >
              <PowerOff className="size-3" /> Deactivate
            </Button>
          )}
        </div>
      ), className: 'text-right'
    },
  ];

  return (
    <AuthenticatedLayout title="Academic Terms" breadcrumbs={[{ label: 'Dashboard', href: route('admin.dashboard') }, { label: 'Academic Terms' }]}>
      <Head title="Academic Terms — Admin" />
      <div className="space-y-4 px-4 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="size-5 text-[#f1b418]" />Academic Terms</h1>
          <Button size="sm" className="bg-[#137c41] hover:bg-[#0b4b27] text-white h-8 text-xs gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> New Term
          </Button>
        </div>
        <DataTable data={terms.data} columns={columns} paginator={terms} emptyMessage="No terms yet." emptyIcon={<CalendarDays className="size-10" />} />
      </div>

      <TermFormDialog open={creating} onOpenChange={setCreating} mode="create" academicYears={academicYears} />

      {editingTerm && (
        <TermFormDialog
          open={!!editingTerm}
          onOpenChange={(next) => { if (!next) setEditingTerm(null); }}
          mode="edit"
          term={editingTerm}
          academicYears={academicYears}
        />
      )}

      <ActivationConfirmDialog
        term={confirmTarget?.term ?? null}
        action={confirmTarget?.action ?? null}
        onOpenChange={(next) => { if (!next) setConfirmTarget(null); }}
      />
    </AuthenticatedLayout>
  );
}
