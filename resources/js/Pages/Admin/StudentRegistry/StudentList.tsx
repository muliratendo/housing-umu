// resources/js/Pages/Admin/StudentRegistry/StudentList.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import { Users, ChevronRight, ShieldCheck } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FilterBar from '@/components/Admin/shared/FilterBar';
import DataTable from '@/components/Admin/shared/DataTable';
import { Badge } from '@/components/ui/badge';

export default function StudentList({ students, filters }: any) {
  const columns = [
    {
      key: 'student', header: 'Student', cell: (s: any) => (
        <div>
          <p className="font-medium">{s.user?.name}</p>
          <p className="text-xs text-muted-foreground">{s.user?.email} · {s.student_number}</p>
        </div>
      )
    },
    { key: 'programme', header: 'Programme', cell: (s: any) => <span className="text-xs line-clamp-1">{s.programme}</span> },
    { key: 'gender', header: 'Gender', cell: (s: any) => <span className="text-xs capitalize">{s.gender}</span> },
    { key: 'year', header: 'Year', cell: (s: any) => <span className="text-xs tabular-nums">Y{s.year_of_study}</span> },
    {
      key: 'verified_record', header: 'Registry Match', cell: (s: any) => (
        s.verified_student_record
          ? <Badge className="text-[10px] bg-[#137c41] text-white">In Verified Record</Badge>
          : <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">No Match</Badge>
      )
    },
    { key: 'counts', header: 'Apps / Allocs', cell: (s: any) => <span className="text-xs tabular-nums">{s.applications_count} / {s.allocations_count}</span> },
    {
      key: 'actions', header: '', cell: (s: any) => (
        <Link href={route('admin.students.show', { student: s.id })} className="text-xs text-[#137c41] flex items-center gap-1 hover:underline">
          View <ChevronRight className="size-3" />
        </Link>
      ), className: 'text-right'
    },
  ];

  return (
    <AuthenticatedLayout title="Student Registry" breadcrumbs={[{ label: 'Dashboard', href: route('admin.dashboard') }, { label: 'Student Registry' }]}>
      <Head title="Student Registry — Admin" />
      <div className="space-y-4 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-[#f1b418]" />
          <h1 className="text-lg font-semibold">Student Registry</h1>
          <Link href={route('admin.student-registry.verification')} className="ml-3 text-xs text-[#137c41] inline-flex items-center gap-1 hover:underline">
            <ShieldCheck className="size-3.5" /> Verification Queue
          </Link>
          <span className="text-xs text-muted-foreground ml-auto">{students.total} students</span>
        </div>

        <FilterBar filters={filters} routeName="admin.students.index" config={[
          { key: 'search', type: 'search', label: 'Search', placeholder: 'Name, email or student number…' },
          { key: 'gender', type: 'select', label: 'Gender', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
          { key: 'year_of_study', type: 'select', label: 'Year', options: Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` })) },
          { key: 'verified_record', type: 'select', label: 'Registry Match', options: [{ value: 'yes', label: 'Matched' }, { value: 'no', label: 'Unmatched' }] },
        ]} />

        <DataTable data={students.data} columns={columns} paginator={students} emptyMessage="No students found." emptyIcon={<Users className="size-10" />} />
      </div>
    </AuthenticatedLayout>
  );
}
