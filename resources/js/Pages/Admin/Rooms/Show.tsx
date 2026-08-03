// resources/js/Pages/Admin/Rooms/Show.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BedDouble, RefreshCw, Wrench, Pencil, ChevronRight } from 'lucide-react';

interface Allocation { id: number; student_id: number; status: string; }

interface BedShape {
  id: number;
  label: string;
  status: string;
  status_label: string;
  sort_order: number;
  current_allocation: Allocation | null;
}

interface RoomShape {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  room_type_label: string;
  capacity: number;
  bed_count: number;
  price_per_semester: string;
  price_per_bed: string;
  availability_status: string;
  availability_status_label: string;
  gender_scope: string;
  is_active: boolean;
  hostel: { id: number; name: string; slug: string };
  beds: BedShape[];
}

interface Props { room: RoomShape; }

const bedStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'occupied': return 'destructive';
    case 'reserved': return 'secondary';
    case 'maintenance': return 'outline';
    case 'inactive': return 'outline';
    default: return 'default';
  }
};

export default function RoomShow({ room }: Props) {
  const handleToggleCapacity = () => {
    if (!confirm(`Convert room to ${room.capacity === 1 ? 'double' : 'single'} occupancy?`)) return;
    router.post(route('admin.rooms.toggle-capacity', room.id));
  };

  return (
    <AuthenticatedLayout
      title={`Room ${room.room_number}`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: room.hostel.name, href: route('admin.hostels.rooms', { hostel: room.hostel.id }) },
        { label: `Room ${room.room_number}` },
      ]}
    >
      <Head title={`Room ${room.room_number} – Housing@UMU`} />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              {room.name}
              <span className="text-sm font-normal text-muted-foreground">
                #{room.room_number}
              </span>
              {!room.is_active && (
                <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500">Inactive</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* NEW: entry point into Room edit — the "room details
                  enables admins to edit room" requirement. */}
              <Link href={route('admin.rooms.edit', { room: room.id })}>
                <Button variant="outline" size="sm">
                  <Pencil className="size-4 mr-2 text-accent-500" />
                  Edit Room
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleCapacity}
                title={`Convert to ${room.capacity === 1 ? 'double' : 'single'}-bed room`}
              >
                <RefreshCw className="size-4 mr-2 text-accent-500" />
                Toggle Capacity
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            {[
              ['Type', room.room_type_label],
              ['Capacity', `${room.capacity} bed${room.capacity > 1 ? 's' : ''}`],
              ['Gender', room.gender_scope],
              ['Status', room.availability_status_label],
              ['Price/Sem', `UGX ${Number(room.price_per_semester).toLocaleString()}`],
              ['Price/Bed', `UGX ${Number(room.price_per_bed).toLocaleString()}`],
              ['Hostel', room.hostel.name],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Beds ({room.beds.length}/{room.capacity})
          </h2>
          {/* FIX: forward link completing the required flow Hostel ->
              Rooms List -> Room Details -> Beds Details. */}
          <Link href={route('admin.rooms.beds', { room: room.id })} className="text-xs text-[#137c41] flex items-center gap-1 hover:underline">
            Manage Beds <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {room.beds.map((bed) => (
            <Card key={bed.id} className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <BedDouble className="size-4 text-accent-500" />
                  <span className="font-semibold text-sm">{bed.label}</span>
                </div>
                <Badge variant={bedStatusVariant(bed.status)}>
                  {bed.status_label}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {bed.current_allocation ? (
                  <p className="text-muted-foreground">
                    Student ID:{' '}
                    <span className="font-medium text-foreground">
                      {bed.current_allocation.student_id}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No current occupant</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Wrench className="size-3.5 text-accent-500 shrink-0" />
                  <span>Manage status from the Beds page</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
