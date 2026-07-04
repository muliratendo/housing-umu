import React from 'react';
import { Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { HostelSummary } from '@/types/hostels';

import type {
  AvailabilityStatus,
  GenderScope,
} from '@/types/hostels';

import {
  Church,
  Award,
  ArrowRight,
  MapPin,
} from 'lucide-react';

type HostelCardProps = {
  hostel: HostelSummary;
  /** Override the detail route. Defaults to public.hostels.show */
  detailRoute?: string;
};

export default function HostelCard({
  hostel,
  detailRoute = 'public.hostels.show',
}: HostelCardProps): React.JSX.Element {
  const priceText =
    hostel.starting_price && hostel.highest_price
      ? hostel.starting_price === hostel.highest_price
        ? `UGX ${Number(hostel.starting_price).toLocaleString()} / semester`
        : `UGX ${Number(hostel.starting_price).toLocaleString()} - ${Number(
          hostel.highest_price
        ).toLocaleString()} per semester`
      : 'Price shared on hostel details';

  return (
    <Card className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Link href={route(detailRoute, hostel.slug)}>
          <img
            src={hostel.image_url || '/images/placeholder-hostel.png'}
            alt={hostel.name}
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder-hostel.png';
            }}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {!hostel.image_url && (
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/60 via-transparent to-transparent p-3">
              <div className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                Image unavailable
              </div>
            </div>
          )}
        </Link>


        {/* Management Type Badge */}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1.5 sm:gap-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm backdrop-blur',
              hostel.management_type === 'campus-managed'
                ? 'bg-brand-700/95'
                : 'bg-brand-red/95'
            )}
          >
            <Award className="h-3 w-3" />
            <span>{hostel.management_type_label}</span>
          </div>
        </div>

        {/* Religious Residents Badge */}
        <div className="absolute right-3 top-3 max-w-[42%]">
          {hostel.is_religious_order && (
            <div className="flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm">
              <Church className="h-3 w-3" />
              <span>Religious Residents</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3">
          <Badge
            className={cn(
              'px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
              getStatusStyles(hostel.availability_status)
            )}
          >
            {hostel.availability_status_label}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-4 px-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {hostel.name}
          </h3>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex max-w-[70%] items-center gap-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{hostel.location}</span>
            </span>

            <Badge
              variant="outline"
              className={cn(
                'py-0 text-[9px] font-semibold uppercase tracking-tight',
                getGenderStyles(hostel.gender_scope)
              )}
            >
              {hostel.gender_scope_label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(hostel.room_type_labels ?? []).map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </div>

        <div className="rounded-2xl p-0 text-sm dark:bg-slate-950/50">
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              Room options
            </span>
            <span className="text-right font-medium text-slate-900 dark:text-slate-50">
              {hostel.occupancy_labels?.join(', ') || 'See details'}
            </span>
          </div>
        </div>

        {!!hostel.amenities?.length && (
          <div className="flex flex-wrap gap-2">
            {hostel.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline">
                {amenity}
              </Badge>
            ))}

            {hostel.amenities.length > 3 && (
              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                +{hostel.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-center border-t border-slate-100 pt-3 dark:border-slate-800">
          <Link href={route(detailRoute, hostel.slug)}>
          <Button
              className="h-12 rounded-full bg-accent-500 px-20 text-xs font-medium text-white transition-all duration-200 group-hover:px-24 hover:bg-accent-600"
          >
            <span>View Details</span>
            <ArrowRight className="ml-1 h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Badge color styles for availability states.
 */
function getStatusStyles(status: AvailabilityStatus) {
  switch (status) {
    case 'available':
      return 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400';
    case 'limited':
      return 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400';
    case 'full':
      return 'border border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
  }
}

/**
 * Badge color styles for gender policy states.
 */
function getGenderStyles(policy: GenderScope) {
  switch (policy) {
    case 'male':
      return 'border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900 dark:text-blue-400';
    case 'female':
      return 'border-pink-200 bg-pink-50/50 text-pink-700 dark:border-pink-900 dark:text-pink-400';
    default:
      return 'border-purple-200 bg-purple-50/50 text-purple-700 dark:border-purple-900 dark:text-purple-400';
  }
}
