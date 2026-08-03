import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ArrowLeftRight, Eye, LogOut } from 'lucide-react';
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

interface BedOption { id: number; label: string; room_number: string; hostel_name: string; }

interface AllocationRow {
  id: number;
  status: string;
  bed_label: string | null;
  checked_in_at: string | null;
  admin_notes: string | null;
  is_admin_override: boolean;
  created_at: string;
  student: { user: { name: string }; student_number: string; gender: string; };
  hostel: { id: number; name: string; };
  room: { room_number: string; };
  academic_term: { name: string; };
}

interface PaginatedAllocations {
  data: AllocationRow[];
  current_page: number; last_page: number;
  total: number; per_page: number;
  next_page_url: string | null; prev_page_url: string | null;
}

interface Props {
  allocations: PaginatedAllocations;
  filters: { status?: string };
  availableBeds: BedOption[];
  canCheckOut?: boolean;
  canOverride?: boolean;
}

const ALL = 'all';

export default function AllocationsIndex({ allocations, filters, availableBeds, canCheckOut = false, canOverride = false }: Props) {
  const [status,          setStatus]          = useState(filters.status ?? ALL);
  const [checkOutTarget,  setCheckOutTarget]   = useState<AllocationRow | null>(null);
  const [checkOutLoading, setCheckOutLoading]  = useState(false);
  const [overrideTarget,  setOverrideTarget]   = useState<AllocationRow | null>(null);

  const applyStatus = (v: string) => {
    setStatus(v);
    const params: Record<string,string> = {};
    if (v !== ALL) params.status = v;
    router.get(route('admin.allocations.index'), params, { preserveState: true, replace: true });
  };

  const handleCheckOut = () => {
    if (!checkOutTarget) return;
    setCheckOutLoading(true);
    router.patch(route('admin.allocations.check-out', checkOutTarget.id), {}, {
      onSuccess: () => setCheckOutTarget(null),
      onFinish:  () => setCheckOutLoading(false),
    });
  };

  return (
    <AuthenticatedLayout header="Allocations">
      <Head title="Allocations – Housing@UMU Admin" />
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={applyStatus}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              <SelectItem value="allocated">Allocated</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" asChild className="h-9 text-sm ml-auto">
            <Link href={route('admin.waitlist.index')}>View Waitlist →</Link>
          </Button>
        </div>

        {/* Table */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {allocations.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <p className="text-sm font-medium">No allocations match your filters.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Student</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Hostel</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Room / Bed</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Term</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Checked In</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.data.map(alloc => (
                      <TableRow key={alloc.id} className="text-sm">
                        <TableCell>
                          <div className="font-medium">{alloc.student.user.name}</div>
                          <div className="text-xs text-muted-foreground">{alloc.student.student_number}</div>
                        </TableCell>
                        <TableCell>{alloc.hostel.name}</TableCell>
                        <TableCell>
                          <span>{alloc.room.room_number}</span>
                          {alloc.bed_label && <span className="text-muted-foreground"> · {alloc.bed_label}</span>}
                          {alloc.is_admin_override && (
                            <span className="ml-1 text-xs text-purple-600 font-medium">(Override)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{alloc.academic_term.name}</TableCell>
                        <TableCell><StatusBadge status={alloc.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {alloc.checked_in_at
                            ? new Date(alloc.checked_in_at).toLocaleDateString('en-UG', { day:'numeric', month:'short', year:'numeric' })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View details">
                              <Link href={route('admin.allocations.show', alloc.id)}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            {canOverride && alloc.status !== 'checked_out' && alloc.status !== 'cancelled' && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                title="Override bed"
                                onClick={() => setOverrideTarget(alloc)}
                              >
                                <ArrowLeftRight className="size-4" />
                              </Button>
                            )}
                            {canCheckOut && alloc.status === 'checked_in' && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-orange-600 hover:bg-orange-50"
                                title="Check out"
                                onClick={() => setCheckOutTarget(alloc)}
                              >
                                <LogOut className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {allocations.last_page > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                    <span>
                      Showing {((allocations.current_page - 1) * allocations.per_page) + 1}–
                      {Math.min(allocations.current_page * allocations.per_page, allocations.total)} of {allocations.total}
                    </span>
                    <div className="flex gap-2">
                      {allocations.prev_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(allocations.prev_page_url!, {}, { preserveState: true })}>← Prev</Button>
                      )}
                      {allocations.next_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(allocations.next_page_url!, {}, { preserveState: true })}>Next →</Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {checkOutTarget && (
        <ConfirmDialog
          open={!!checkOutTarget}
          onOpenChange={v => { if (!v) setCheckOutTarget(null); }}
          title="Check Out Student?"
          description={`This will check out ${checkOutTarget.student.user.name}, free their bed, and trigger the waitlist promotion (BR-8). This cannot be undone.`}
          confirmLabel="Check Out"
          confirmClassName="bg-orange-600 hover:bg-orange-700 text-white"
          onConfirm={handleCheckOut}
          loading={checkOutLoading}
        />
      )}

      {/* UPDATED: was OverrideDialog — now AllocationsDialog with mode="override" */}
      {overrideTarget && (
        <AllocationsDialog
          mode="override"
          allocationId={overrideTarget.id}
          currentBedLabel={overrideTarget.bed_label}
          open={!!overrideTarget}
          onOpenChange={v => { if (!v) setOverrideTarget(null); }}
        />
      )}
    </AuthenticatedLayout>
  );
}
