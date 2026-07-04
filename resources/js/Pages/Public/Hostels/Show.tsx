import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ArrowRight, BedDouble, BadgeInfo } from 'lucide-react';
import type { HostelSummary, HostelDetail } from '@/types/hostels';

type ShowProps = {
  hostel: HostelDetail;
};

export default function Show({ hostel }: ShowProps): React.JSX.Element {
  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title={`${hostel.name} | Housing@UMU`} />

      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/20">
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Link href={route('public.hostels.index')}>
                  <span className="relative text-md font-bold text-primary hover:text-accent-500 py-1 transition-colors duration-200 group">
                    ← Back to hostels
                    {/* Center-expanding Accent Line */}
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-accent-500 transition-all duration-300 ease-out group-hover:w-full" />
                  </span>
                </Link>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl pt-3">
                  {hostel.name}
                </h1>

                <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4" />
                  {hostel.location || 'Location shared on request'}
                </p>

                <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {hostel.description ||''}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {hostel.rooms.map((room) => (
                <Card
                  key={room.id}
                  className="flex flex-col group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={room.image_url || '/images/placeholder-hostel.png'}
                      alt={room.name}
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder-hostel.png';
                      }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <CardContent className="flex flex-1 flex-col space-y-4 px-5">
                    <div className="space-y-4 flex-1">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {room.name}
                        </h3>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{room.room_type_label}</Badge>
                          <Badge variant="outline">{room.bed_count_label}</Badge>
                          <Badge variant="outline">{room.availability_status_label}</Badge>
                        </div>
                      </div>

                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {room.description ||
                          'View this room option to see more details and available preferences.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Semester price</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                            UGX {Number(room.price_per_semester || 0).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Capacity</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                            {room.capacity} residents
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Occupancy</p>
                          <p className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-50">
                            <BedDouble className="h-4 w-4" />
                            {room.bed_count_label}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Gender policy</p>
                          <p className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-50">
                            <BadgeInfo className="h-4 w-4" />
                            {room.gender_scope_label}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(room.amenities || []).map((amenity) => (
                          <Badge key={amenity} variant="outline">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Footer (button) */}
                    <div className="mt-auto mx-auto items-center pt-3">
                      <Link
                        // href={route('student.applications.create', {
                        //   hostel_slug: hostel.slug,
                        //   hostel_id: hostel.id,
                        //   room_id: room.id,
                        //   room_type: room.room_type,
                        // })}
                        href={route('login')}
                        className="inline-flex items-center gap-2 rounded-full  px-20 bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 group-hover:px-24 hover:bg-accent-600"
                      >
                        Apply Now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
