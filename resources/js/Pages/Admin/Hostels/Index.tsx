// resources/js/Pages/Admin/Hostels/Index.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronRight, Plus, Pencil } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FilterBar from '@/components/Admin/shared/FilterBar';
import DataTable from '@/components/Admin/shared/DataTable';
import OccupancyBar from '@/components/Admin/shared/OccupancyBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { LaravelPaginator } from '@/types/pagination';

interface Hostel {
  id: number;
  name: string;
  slug: string;
  management_type: 'campus-managed' | 'affiliated';
  gender_scope: 'male' | 'female' | 'mixed';
  campus_location: 'on-campus' | 'off-campus';
  location: string | null;
  applications_open: boolean;
  is_religious_order: boolean;
  religious_notes: string | null;
  amenities: string[] | null;
  description: string | null;
  image_url: string | null;
}

interface Props {
  hostels: LaravelPaginator<Hostel>;
  filters: {
    search?: string;
    management_type?: string;
    gender_scope?: string;
    campus_location?: string;
  };
  can: {
    create: boolean;
    manageListedHostels: boolean;
  };
}

export default function HostelsIndex({
  hostels,
  filters,
  can,
}: Props) {
  const toggleApplications = (hostelId: number) => {
    router.patch(route('admin.hostels.toggle-applications', { hostel: hostelId }), {}, { preserveState: true, preserveScroll: true });
  };

  const columns = [
    {
      key: 'name', header: 'Hostel', cell: (h: any) => (
        <div>
          <p className="font-medium">{h.name}</p>
          <p className="text-xs text-muted-foreground">{h.location}</p>
        </div>
      )
    },
    {
      key: 'management_type', header: 'Type', cell: (h: any) => (
        <Badge variant="outline" className="capitalize text-[10px]">{h.management_type}</Badge>
      )
    },
    {
      key: 'gender_scope', header: 'Gender', cell: (h: any) => (
        <span className="text-xs capitalize">{h.gender_scope}</span>
      )
    },
    {
      key: 'occupancy', header: 'Occupancy', cell: (h: any) => (
        <OccupancyBar occupied={h.occupied_beds_count} total={h.total_beds_count} />
      )
    },
    {
      key: 'rooms_count', header: 'Rooms', cell: (h: any) => (
        <span className="tabular-nums text-xs">{h.rooms_count}</span>
      )
    },
    {
      key: 'applications_open', header: 'Applications', cell: (h: any) => (
        <div className="flex items-center gap-2">
          <Switch checked={!!h.applications_open} onCheckedChange={() => toggleApplications(h.id)} />
          <Badge variant="outline" className={`text-[10px] ${h.applications_open ? 'border-green-300 text-green-700' : 'border-gray-200 text-gray-500'}`}>
            {h.applications_open ? 'Open' : 'Closed'}
          </Badge>
        </div>
      )
    },
    {
      key: 'actions', header: '', cell: (h: any) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={route('admin.hostels.edit', { hostel: h.id })} className="text-xs text-muted-foreground flex items-center gap-1 hover:underline">
            <Pencil className="size-3" /> Edit
          </Link>
          <Link href={route('admin.hostels.manage', { hostel: h.id })}
            className="text-xs text-[#137c41] flex items-center gap-1 hover:underline">
            Manage <ChevronRight className="size-3" />
          </Link>
        </div>
      ), className: 'text-right'
    },
  ];
  return (
    <AuthenticatedLayout
      title="Hostels"
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels' },
      ]}
    >
      <Head title="Hostels — Admin" />
      <div className="space-y-4 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-[#f1b418]" />
          <h1 className="text-lg font-semibold">Hostels</h1>
          <span className="text-xs text-muted-foreground">{hostels.total} hostels</span>
          <Link href={route('admin.hostels.create')} className="ml-auto">
            <Button size="sm" className="bg-[#137c41] hover:bg-[#0b4b27] text-white h-8 text-xs gap-1.5">
              <Plus className="size-3.5" /> New Hostel
            </Button>
          </Link>
        </div>
        <FilterBar filters={filters} routeName="admin.hostels.index" config={[
          { key: 'search', type: 'search', label: 'Search', placeholder: 'Hostel name…' },
          { key: 'management_type', type: 'select', label: 'Type', options: [{ value: 'campus-managed', label: 'Campus Managed' }, { value: 'affiliated', label: 'Affiliated' }] },
          { key: 'gender_scope', type: 'select', label: 'Gender', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'mixed', label: 'Mixed' }] },
          { key: 'campus_location', type: 'select', label: 'Location', options: [{ value: 'on-campus', label: 'On Campus' }, { value: 'off-campus', label: 'Off Campus' }] },
        ]} />
        <DataTable data={hostels.data} columns={columns} paginator={hostels} emptyMessage="No hostels found." emptyIcon={<Building2 className="size-10" />} />
      </div>
    </AuthenticatedLayout>
  );
}
