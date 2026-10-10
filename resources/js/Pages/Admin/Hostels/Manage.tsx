// resources/js/Pages/Admin/Hostels/Manage.tsx
//
// Replaces the former rooms-only page with an account/profile-style hostel
// management workspace. Hostel identity and settings are visible first,
// followed by room inventory management.

import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import {
  BedDouble,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/components/Admin/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface Room {
  id: number;
  name: string | null;
  room_number: string;
  room_type: string;
  price_per_semester: number | string;
  availability_status: 'available' | 'limited' | 'full' | string;
  is_active: boolean;
  beds_count: number;
  available_beds_count: number;
  occupied_beds_count: number;
}

interface Props {
  hostel: Hostel;
  rooms: LaravelPaginator<Room>;
  filters: {
    room_type?: string;
    availability_status?: string;
  };
  can: {
    editDetails: boolean;
    createRooms: boolean;
  };
}


export default function HostelManage({
  hostel,
  rooms,
  filters,
  can,
}: Props) {
  const columns = [
    {
      key: 'room_number',
      header: 'Room',
      cell: (room: Room) => (
        <div>
          <p className="font-medium">{room.name ?? room.room_number}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {room.room_type}
          </p>
        </div>
      ),
    },
    {
      key: 'bed_count',
      header: 'Beds',
      cell: (room: Room) => (
        <span className="text-xs tabular-nums">
          {room.available_beds_count}/{room.beds_count} available
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price / Semester',
      cell: (room: Room) => (
        <span className="text-xs tabular-nums">
          UGX {Number(room.price_per_semester).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Room State',
      cell: (room: Room) => (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] ${room.availability_status === 'full'
                ? 'border-red-300 text-red-700'
                : room.availability_status === 'available'
                  ? 'border-green-300 text-green-700'
                  : 'border-yellow-300 text-yellow-700'
              }`}
          >
            {room.availability_status}
          </Badge>

          {!room.is_active && (
            <Badge
              variant="outline"
              className="border-gray-300 text-[10px] text-gray-500"
            >
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (room: Room) => (
        <Link
          href={route('admin.rooms.show', { room: room.id })}
          className="flex items-center gap-1 text-xs text-[#137c41] hover:underline"
        >
          View
          <ChevronRight className="size-3" />
        </Link>
      ),
      className: 'text-right',
    },
  ];


  return (
    <AuthenticatedLayout
      title={`${hostel.name} — Manage Hostel`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: hostel.name },
      ]}
    >
      <Head title={`${hostel.name} — Hostel Management`} />

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        {/* ── Hostel profile / account-style management header ──────────
            This replaces the previous rooms-only title row. It presents
            the hostel as a managed entity, similar to an account profile:
            image, identity, visibility state, details, and a dedicated
            edit action before the operational rooms inventory. */}
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
              {/* Image preview: object-cover creates a stable visual crop in
                  the profile card. It does not modify or permanently crop the
                  remote source image stored in image_url. */}
              {hostel.image_url ? (
                <img
                  src={hostel.image_url}
                  alt={`${hostel.name} preview`}
                  className="h-40 w-auto max-w-full rounded-xl border object-cover"
                  onError={(event) => {
                    // Prevent a broken remote URL from leaving an ugly broken
                    // image icon in the profile header.
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border bg-muted">
                  <BedDouble className="size-10 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{hostel.name}</h1>

                  <Badge variant="outline" className="text-[10px] capitalize">
                    {hostel.management_type.replace('-', ' ')}
                  </Badge>

                  <Badge variant="outline" className="text-[10px] capitalize">
                    {hostel.gender_scope}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={`text-[10px] ${hostel.applications_open
                        ? 'border-green-300 text-green-700'
                        : 'border-gray-200 text-gray-500'
                      }`}
                  >
                    Applications {hostel.applications_open ? 'Open' : 'Closed'}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span>{hostel.location || 'No location provided'}</span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {hostel.campus_location === 'on-campus'
                    ? 'On-campus accommodation'
                    : 'Off-campus accommodation'}
                  {' · '}
                  Slug: {hostel.slug}
                </p>

                {hostel.description && (
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {hostel.description}
                  </p>
                )}

                {hostel.amenities && hostel.amenities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {hostel.amenities.map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}

                {hostel.is_religious_order && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                      <ShieldCheck className="size-4" />
                      Religious order hostel
                    </div>

                    {hostel.religious_notes && (
                      <p className="mt-1 text-sm leading-5 text-amber-800">
                        {hostel.religious_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action group is deliberately separate from the description
                  content, mirroring an account-management profile's clear
                  edit controls rather than blending management actions into
                  normal public hostel information. */}
              <div className="flex shrink-0 flex-wrap gap-2">
                {can.editDetails && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={route('admin.hostels.edit', {
                        hostel: hostel.id,
                      })}
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      Edit hostel details
                    </Link>
                  </Button>
                )}

                {can.createRooms && (
                  <Button
                    asChild
                    size="sm"
                    className="bg-[#137c41] text-white hover:bg-[#0b4b27]"
                  >
                    <Link
                      href={route('admin.rooms.create', {
                        hostel: hostel.id,
                      })}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      New Room
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Operational room inventory ─────────────────────────────────
            Room management remains below the hostel identity card, so a
            manager first understands which hostel they are editing before
            changing its room-level capacity and availability. */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <UsersRound className="size-5 text-[#f1b418]" />
            <div>
              <h2 className="text-base font-semibold">Rooms</h2>
              <p className="text-xs text-muted-foreground">
                Manage rooms, beds, capacity, and availability for this hostel.
              </p>
            </div>
          </div>

          <DataTable
            data={rooms.data}
            columns={columns}
            paginator={rooms}
            emptyMessage="No rooms have been added to this hostel."
            emptyIcon={<BedDouble className="size-10" />}
          />
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
