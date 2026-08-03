// resources/js/Pages/Admin/Hostels/Rooms.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import { BedDouble, ChevronRight, Plus } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/components/Admin/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HostelRooms({ hostel, rooms, filters }: any) {
  const columns = [
    {
      key: 'room_number', header: 'Room', cell: (r: any) => (
        <div>
          <p className="font-medium">{r.name ?? r.room_number}</p>
          <p className="text-xs text-muted-foreground capitalize">{r.room_type}</p>
        </div>
      )
    },
    {
      key: 'bed_count', header: 'Beds', cell: (r: any) => (
        <span className="tabular-nums text-xs">{r.available_beds_count}/{r.beds_count} available</span>
      )
    },
    {
      key: 'price', header: 'Price / Semester', cell: (r: any) => (
        <span className="tabular-nums text-xs">UGX {Number(r.price_per_semester).toLocaleString()}</span>
      )
    },
    {
      key: 'status', header: 'Room State', cell: (r: any) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] ${r.availability_status === 'full' ? 'border-red-300 text-red-700' : r.availability_status === 'available' ? 'border-green-300 text-green-700' : 'border-yellow-300 text-yellow-700'}`}>
            {r.availability_status}
          </Badge>
          {!r.is_active && (
            <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500">Inactive</Badge>
          )}
        </div>
      )
    },
    {
      key: 'actions', header: '', cell: (r: any) => (
        <Link href={route('admin.rooms.show', { room: r.id })} className="text-xs text-[#137c41] flex items-center gap-1 hover:underline">
          View <ChevronRight className="size-3" />
        </Link>
      ), className: 'text-right'
    },
  ];
  return (
    <AuthenticatedLayout
      title={`${hostel.name} — Rooms`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: hostel.name },
      ]}
    >
      <Head title={`${hostel.name} Rooms — Admin`} />
      <div className="space-y-4 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BedDouble className="size-5 text-[#f1b418]" />
          <h1 className="text-lg font-semibold">{hostel.name}</h1>
          <Badge variant="outline" className="text-[10px] capitalize">{hostel.management_type}</Badge>
          <Badge variant="outline" className={`text-[10px] ${hostel.applications_open ? 'border-green-300 text-green-700' : 'border-gray-200 text-gray-500'}`}>
            Applications {hostel.applications_open ? 'Open' : 'Closed'}
          </Badge>
          <Link href={route('admin.rooms.create', { hostel: hostel.id })} className="ml-auto">
            <Button size="sm" className="bg-[#137c41] hover:bg-[#0b4b27] text-white h-8 text-xs gap-1.5">
              <Plus className="size-3.5" /> New Room
            </Button>
          </Link>
        </div>
        <DataTable data={rooms.data} columns={columns} paginator={rooms} emptyMessage="No rooms." emptyIcon={<BedDouble className="size-10" />} />
      </div>
    </AuthenticatedLayout>
  );
}
