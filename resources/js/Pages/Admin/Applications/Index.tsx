// resources/js/Pages/Admin/Applications/Index.tsx
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { CheckCircle2, Eye, Play, XCircle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/components/Admin/shared/StatusBadge';
import ConfirmDialog from '@/components/Admin/shared/ConfirmDialog';
import AllocationsDialog from '@/components/Admin/Allocations/AllocationsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────────────────────
// Shape matches ApplicationController::index() which returns a Laravel paginator
// wrapped in Inertia. Each item has student.user, hostel, academicTerm eager-loaded.

interface StudentSnapshot { user: { name: string }; student_number: string; gender: string; }
interface HostelSnapshot  { id: number; name: string; }
interface TermSnapshot    { id: number; name: string; }

interface ApplicationRow {
  id: number;
  status: string;
  waitlist_position: number | null;
  created_at: string;
  room_type: string; // NEW — required by AllocationsDialog's approve mode; must be added to ApplicationController::index()'s query/payload if it isn't already exposed there via the model's default column set
  student: StudentSnapshot;
  hostel: HostelSnapshot;
  academic_term: TermSnapshot;   // snake_case — Laravel serialises relation as academic_term
}

interface PaginatedApplications {
  data: ApplicationRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  next_page_url: string | null;
  prev_page_url: string | null;
}

interface Filters {
  status?: string;
  term_id?: string;
  gender?: string;
  hostel_preference?: string;
}

interface Props {
  applications: PaginatedApplications;
  filters: Filters;
  pendingCount?: number;
  canRunBatch?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL = 'all';
const toParam = (v: string) => (v === ALL ? '' : v);

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicationsIndex({ applications, filters, pendingCount = 0, canRunBatch = false }: Props) {
  const [search,  setSearch]  = useState(filters.hostel_preference ?? '');
  const [status,  setStatus]  = useState(filters.status ?? ALL);
  const [gender,  setGender]  = useState(filters.gender ?? ALL);
  const [termId,  setTermId]  = useState(filters.term_id ?? ALL);

  // NEW: one dialog target + mode replaces the separate approveTarget/rejectTarget pair
  const [dialogTarget, setDialogTarget] = useState<ApplicationRow | null>(null);
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);

  const [batchOpen,     setBatchOpen]     = useState(false);
  const [batchLoading,  setBatchLoading]  = useState(false);

  const applyFilters = (overrides: Partial<Filters> = {}) => {
    const params: Record<string, string> = {};
    const merged = {
      status:           toParam(status),
      gender:           toParam(gender),
      term_id:          toParam(termId),
      hostel_preference: search,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) params[k] = v; });
    router.get(route('admin.applications.index'), params, { preserveState: true, replace: true });
  };

  const clearFilters = () => {
    setSearch(''); setStatus(ALL); setGender(ALL); setTermId(ALL);
    router.get(route('admin.applications.index'), {}, { preserveState: false, replace: true });
  };

  const hasFilters = !!(filters.status || filters.gender || filters.hostel_preference);

  const handleBatchRun = () => {
    setBatchLoading(true);
    router.post(route('admin.allocations.run'), {}, {
      onSuccess: () => setBatchOpen(false),
      onFinish:  () => setBatchLoading(false),
    });
  };

  // NEW: opens the merged dialog for a given row + mode in one call
  const openDialog = (app: ApplicationRow, mode: 'approve' | 'reject') => {
    setDialogTarget(app);
    setDialogMode(mode);
  };

  return (
    <AuthenticatedLayout header="Applications">
      <Head title="Applications – Housing@UMU Admin" />

      <div className="space-y-4">

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap items-center gap-2">

            {/* Search by hostel name */}
            <Input
              placeholder="Search hostel…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters({ hostel_preference: search })}
              className="h-9 w-44 text-sm"
            />

            {/* Status filter */}
            <Select value={status} onValueChange={v => { setStatus(v); applyFilters({ status: toParam(v) }); }}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Gender filter */}
            <Select value={gender} onValueChange={v => { setGender(v); applyFilters({ gender: toParam(v) }); }}>
              <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="All Genders" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
                Clear
              </Button>
            )}
          </div>

          {/* Batch allocation */}
          {canRunBatch && (
            <Button
              onClick={() => setBatchOpen(true)}
              disabled={pendingCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9"
            >
              <Play className="size-4" />
              Run Batch Allocation
              {pendingCount > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {applications.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <p className="text-sm font-medium">No applications match your filters.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Student</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Hostel</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Term</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Gender</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Applied</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.data.map(app => (
                      <TableRow key={app.id} className="text-sm">
                        <TableCell>
                          <div className="font-medium">{app.student.user.name}</div>
                          <div className="text-xs text-muted-foreground">{app.student.student_number}</div>
                        </TableCell>
                        <TableCell>{app.hostel.name}</TableCell>
                        <TableCell className="text-muted-foreground">{app.academic_term.name}</TableCell>
                        <TableCell className="capitalize">{app.student.gender}</TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                          {app.waitlist_position && (
                            <span className="ml-1 text-xs text-muted-foreground">#{app.waitlist_position}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString('en-UG', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View details">
                              <Link href={route('admin.applications.show', app.id)}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            {app.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                  title="Approve"
                                  onClick={() => openDialog(app, 'approve')}
                                >
                                  <CheckCircle2 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  title="Reject"
                                  onClick={() => openDialog(app, 'reject')}
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {applications.last_page > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                    <span>
                      Showing {((applications.current_page - 1) * applications.per_page) + 1}–
                      {Math.min(applications.current_page * applications.per_page, applications.total)} of{' '}
                      {applications.total}
                    </span>
                    <div className="flex gap-2">
                      {applications.prev_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(applications.prev_page_url!, {}, { preserveState: true })}>
                          ← Prev
                        </Button>
                      )}
                      {applications.next_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(applications.next_page_url!, {}, { preserveState: true })}>
                          Next →
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NEW: single merged dialog replaces ApproveDialog + RejectDialog */}
      {dialogTarget && dialogMode && (
        <AllocationsDialog
          mode={dialogMode}
          open={!!dialogTarget}
          onOpenChange={(v) => { if (!v) { setDialogTarget(null); setDialogMode(null); } }}
          applicationId={dialogTarget.id}
          studentName={dialogTarget.student.user.name}
          hostelName={dialogTarget.hostel.name}
          applicationRoomType={dialogTarget.room_type}
        />
      )}
      <ConfirmDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        title="Run Batch Allocation?"
        description={`This will process all ${pendingCount} pending applications for the current term using AllocationService. Students will be allocated or waitlisted based on bed availability and gender policy.`}
        confirmLabel="Run Allocation"
        confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
        onConfirm={handleBatchRun}
        loading={batchLoading}
      />
    </AuthenticatedLayout>
  );
}
