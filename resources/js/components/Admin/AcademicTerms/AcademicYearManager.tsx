// resources/js/components/Admin/AcademicTerms/AcademicYearManager.tsx
// Lets an admin create, rename, and delete academic years directly from a
// small popover launched next to the "Academic Year" field inside the
// Create/Edit Term dialog — avoids a whole separate admin page for what is
// a rare, low-volume management task.
import * as React from 'react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Plus, Pencil, Trash2, Check, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// FIX: popover.tsx now imports from the unified `radix-ui` package (same
// as Dialog/Select elsewhere) instead of the legacy `@radix-ui/react-popover`
// — that package mismatch was the real cause of the dialog freezing after
// this popover closed, not a missing `modal` prop. See popover.tsx.
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useRadixPointerEventsFix } from '@/hooks/use-radix-pointer-events-fix';

interface AcademicYear {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

interface AcademicYearManagerProps {
  academicYears: AcademicYear[];
}

export function AcademicYearManager({ academicYears }: AcademicYearManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [startYear, setStartYear] = React.useState('');
  const [endYear, setEndYear] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useRadixPointerEventsFix(open);

  const resetForm = () => {
    setAdding(false);
    setEditingId(null);
    setStartYear('');
    setEndYear('');
    setError(null);
  };

  const startAdd = () => {
    resetForm();
    setAdding(true);
  };

  const startEdit = (year: AcademicYear) => {
    resetForm();
    setEditingId(year.id);
    setStartYear(String(year.start_year));
    setEndYear(String(year.end_year));
  };

  const submitCreate = () => {
    setError(null);
    if (!startYear || !endYear) {
      setError('Both years are required.');
      return;
    }
    if (Number(endYear) <= Number(startYear)) {
      setError('End year must be after start year.');
      return;
    }
    setBusy(true);
    router.post(
      route('admin.academic-years.store'),
      { start_year: startYear, end_year: endYear },
      {
        preserveScroll: true,
        onSuccess: () => resetForm(),
        onError: (errs) => setError(Object.values(errs)[0] as string),
        onFinish: () => setBusy(false),
      },
    );
  };

  const submitUpdate = (id: number) => {
    setError(null);
    if (!startYear || !endYear) {
      setError('Both years are required.');
      return;
    }
    if (Number(endYear) <= Number(startYear)) {
      setError('End year must be after start year.');
      return;
    }
    setBusy(true);
    router.patch(
      route('admin.academic-years.update', { academicYear: id }),
      { start_year: startYear, end_year: endYear },
      {
        preserveScroll: true,
        onSuccess: () => resetForm(),
        onError: (errs) => setError(Object.values(errs)[0] as string),
        onFinish: () => setBusy(false),
      },
    );
  };

  const remove = (id: number) => {
    setBusy(true);
    router.delete(route('admin.academic-years.destroy', { academicYear: id }), {
      preserveScroll: true,
      onFinish: () => setBusy(false),
    });
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }} modal={false}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
          <Settings2 className="size-3.5" /> Manage years
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Academic Years</p>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {academicYears.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No academic years yet.</p>
            )}
            {academicYears.map((year) =>
              editingId === year.id ? (
                <div key={year.id} className="flex items-center gap-1.5 rounded-md border p-1.5">
                  <Input
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="2025"
                    className="h-7 text-xs px-2"
                  />
                  <span className="text-xs text-muted-foreground">/</span>
                  <Input
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="2026"
                    className="h-7 text-xs px-2"
                  />
                  <Button size="icon" variant="ghost" className="size-7 shrink-0" disabled={busy} onClick={() => submitUpdate(year.id)}>
                    <Check className="size-3.5 text-[#137c41]" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={resetForm}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div key={year.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <span className="text-xs">{year.name}</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => startEdit(year)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-6" disabled={busy} onClick={() => remove(year.id)}>
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>

          {adding ? (
            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Label className="text-[10px]">Start year</Label>
                  <Input value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="2025" className="h-7 text-xs" />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px]">End year</Label>
                  <Input value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder="2026" className="h-7 text-xs" />
                </div>
              </div>
              {error && <p className="text-[10px] text-red-500">{error}</p>}
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={resetForm}>Cancel</Button>
                <Button size="sm" className="h-6 text-[10px] px-2 bg-[#137c41] hover:bg-[#0b4b27] text-white" disabled={busy} onClick={submitCreate}>
                  {busy ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={startAdd}>
              <Plus className="size-3" /> Add year
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
