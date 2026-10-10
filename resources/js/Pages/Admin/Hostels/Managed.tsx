// resources/js/Pages/Admin/Hostels/Managed.tsx
//
// Manager-scoped hostel selection page.
//
// IMPORTANT: This is NOT the individual hostel management workspace.
// It receives a paginated `hostels` collection from HostelController@managed.
// The individual profile/detail workspace is Admin/Hostels/Manage.tsx and
// receives one `hostel` object from HostelController@manage.

import React from 'react';
import { route } from 'ziggy-js';
import { Head, Link } from '@inertiajs/react';
import {
  Building2,
  ChevronRight,
  MapPin,
  BedDouble,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';


interface Hostel {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  management_type: 'campus-managed' | 'affiliated';
  campus_location: 'on-campus' | 'off-campus';
  gender_scope: 'male' | 'female' | 'mixed';
  applications_open: boolean;
  image_url?: string | null;
  rooms_count: number;
  total_beds_count: number;
  occupied_beds_count: number;
}


interface Paginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
  total: number;
  prev_page_url: string | null;
  next_page_url: string | null;
}


interface Props {
  // IMPORTANT: plural `hostels`, because this page is a list/selection page.
  // There is intentionally no `hostel` prop here.
  hostels: Paginator<Hostel>;
}


export default function HostelManaged({ hostels }: Props) {
  return (
    <AuthenticatedLayout
      title="Manage Hostel"
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Manage Hostel' },
      ]}
    >
      <Head title="Manage Hostel — Housing@UMU" />

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-[#f1b418]" />
            <h1 className="text-lg font-semibold">Manage Hostel</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Select a hostel assigned to you to manage its details, rooms,
            capacity, and applications.
          </p>
        </div>

        {/* Empty state: this should happen when the signed-in administrator
            has no hostel_managers pivot assignments. It is not an error;
            access remains server-side restricted by HostelPolicy. */}
        {hostels.data.length === 0 ? (
          <Card className="rounded-xl border-dashed shadow-none">
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto size-10 text-muted-foreground/50" />

              <h2 className="mt-4 text-sm font-medium">
                No hostels are assigned to you
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Contact a super administrator or dean to request access to a
                hostel.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hostels.data.map((hostel) => {
              const occupancyLabel = hostel.total_beds_count > 0
                ? `${hostel.occupied_beds_count}/${hostel.total_beds_count} beds occupied`
                : 'No beds configured';

              return (
                <Link
                  key={hostel.id}
                  href={route('admin.hostels.manage', {
                    hostel: hostel.id,
                  })}
                  className="group block"
                >
                  <Card className="h-full rounded-xl transition-shadow group-hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* This image is only a preview of image_url. The
                            object-cover class visually crops the display but
                            does not alter the original remote image. */}
                        {hostel.image_url ? (
                          <img
                            src={hostel.image_url}
                            alt=""
                            className="size-12 shrink-0 rounded-lg border object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
                            <Building2 className="size-5 text-muted-foreground" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {hostel.name}
                            </p>

                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">
                              {hostel.location || 'No location provided'}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {hostel.management_type.replace('-', ' ')}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={`text-[10px] ${hostel.applications_open
                                  ? 'border-green-300 text-green-700'
                                  : 'border-gray-200 text-gray-500'
                                }`}
                            >
                              {hostel.applications_open ? 'Open' : 'Closed'}
                            </Badge>
                          </div>

                          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <BedDouble className="size-3.5" />
                            <span>
                              {hostel.rooms_count} room{hostel.rooms_count === 1 ? '' : 's'}
                              {' · '}
                              {occupancyLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Simple paginator for managers assigned to many hostels. */}
        {hostels.last_page > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {hostels.from ?? 0}–{hostels.to ?? 0} of {hostels.total}
            </span>

            <div className="flex items-center gap-2">
              {hostels.prev_page_url ? (
                <Link
                  href={hostels.prev_page_url}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-md border px-3 py-1.5 text-xs opacity-50">
                  Previous
                </span>
              )}

              <span className="text-xs">
                Page {hostels.current_page} of {hostels.last_page}
              </span>

              {hostels.next_page_url ? (
                <Link
                  href={hostels.next_page_url}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-md border px-3 py-1.5 text-xs opacity-50">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
