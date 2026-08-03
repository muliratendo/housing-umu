// resources/js/Pages/Admin/Waitlist/Index.tsx
import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ArrowUpCircle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AllocationsDialog from '@/components/Admin/Allocations/AllocationsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Note: AllocationController::waitlist() queries Applications where status='waitlisted'
// and returns the Application model (with student, hostel, academic_term eager-loaded).
// The promote action takes an application ID: PATCH /waitlist/{application}/promote

interface WaitlistRow {
  id: number;                   // Application ID
  waitlist_position: number;
  status: string;
  updated_at: string;
  room_type: string;
  student: { user: { name: string }; student_number: string; gender: string; };
  hostel: { id: number; name: string; };
  academic_term: { name: string; };
}

interface Paginated {
  data: WaitlistRow[];
  current_page: number; last_page: number;
  total: number; per_page: number;
  next_page_url: string | null; prev_page_url: string | null;
}

interface Hostel { id: number; name: string; }

interface Props {
  waitlist: Paginated;
  hostels?: Hostel[];
  canPromote?: boolean;
}

const ALL = 'all';

export default function WaitlistIndex({ waitlist, hostels = [], canPromote = false }: Props) {
  const [search,          setSearch]          = useState('');
  const [hostelFilter,    setHostelFilter]     = useState(ALL);
  const [genderFilter,    setGenderFilter]     = useState(ALL);
  const [promoteTarget,   setPromoteTarget]    = useState<WaitlistRow | null>(null);

  const applyFilters = (overrides: Record<string,string> = {}) => {
    const params: Record<string,string> = {};
    const merged = {
      search,
      hostel: hostelFilter === ALL ? '' : hostelFilter,
      gender: genderFilter === ALL ? '' : genderFilter,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) params[k] = v; });
    router.get(route('admin.waitlist.index'), params, { preserveState: true, replace: true });
  };

  return (
    <AuthenticatedLayout header="Waitlist">
      <Head title="Waitlist – Housing@UMU Admin" />
      <div className="space-y-4">

        {/* Summary pill */}
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-3 py-1">
            {waitlist.total} student{waitlist.total !== 1 ? 's' : ''} on waitlist
          </Badge>
          <p className="text-xs text-muted-foreground">Sorted by waitlist position ascending. Position #1 is next in line.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search student…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters({ search })}
            className="h-9 w-44 text-sm"
          />
          {hostels.length > 0 && (
            <Select value={hostelFilter} onValueChange={v => { setHostelFilter(v); applyFilters({ hostel: v === ALL ? '' : v }); }}>
              <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="All Hostels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Hostels</SelectItem>
                {hostels.map(h => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={genderFilter} onValueChange={v => { setGenderFilter(v); applyFilters({ gender: v === ALL ? '' : v }); }}>
            <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="All Genders" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {waitlist.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <p className="text-sm font-medium">The waitlist is empty.</p>
                <p className="text-xs">All pending applications have been processed.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide w-16">Pos.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Student</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Hostel Preference</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Term</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Gender</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Since</TableHead>
                      {canPromote && (
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.data.map(row => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'text-sm',
                          row.waitlist_position === 1 && 'bg-blue-50/60 dark:bg-blue-900/10',
                        )}
                      >
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                            row.waitlist_position === 1
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground',
                          )}>
                            {row.waitlist_position}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.student.user.name}</div>
                          <div className="text-xs text-muted-foreground">{row.student.student_number}</div>
                        </TableCell>
                        <TableCell>{row.hostel.name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.academic_term.name}</TableCell>
                        <TableCell className="capitalize">{row.student.gender}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.updated_at).toLocaleDateString('en-UG', { day:'numeric', month:'short', year:'numeric' })}
                        </TableCell>
                        {canPromote && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 text-xs gap-1.5 text-blue-700 hover:bg-blue-50"
                              onClick={() => setPromoteTarget(row)}
                            >
                              <ArrowUpCircle className="size-3.5" /> Promote
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {waitlist.last_page > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                    <span>
                      Showing {((waitlist.current_page - 1) * waitlist.per_page) + 1}–
                      {Math.min(waitlist.current_page * waitlist.per_page, waitlist.total)} of {waitlist.total}
                    </span>
                    <div className="flex gap-2">
                      {waitlist.prev_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(waitlist.prev_page_url!, {}, { preserveState: true })}>← Prev</Button>
                      )}
                      {waitlist.next_page_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.get(waitlist.next_page_url!, {}, { preserveState: true })}>Next →</Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {promoteTarget && (
        <AllocationsDialog
          mode="promote"
          open={!!promoteTarget}
          onOpenChange={(v) => { if (!v) setPromoteTarget(null); }}
          applicationId={promoteTarget.id}
          studentName={promoteTarget.student.user.name}
          hostelName={promoteTarget.hostel.name}
          applicationRoomType={promoteTarget.room_type}
        />
      )}
    </AuthenticatedLayout>
  );
}
