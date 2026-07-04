// resources/js/components/Student/HostelCard.tsx

import React from 'react';
import { route } from 'ziggy-js';
import { Link } from '@inertiajs/react';
import { BedDouble, Lock, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export type HostelType = 'campus-managed' | 'affiliated';
export type GenderPolicy = 'male' | 'female' | 'mixed';

export interface HostelCardData {
  id: number;
  name: string;
  slug: string;
  hostel_type: HostelType;
  gender_policy: GenderPolicy;
  location: string | null;
  price_per_semester: string | number | null;
  image_path: string | null;
  available_beds: number;
  total_capacity: number;
  window_open: boolean;
  already_applied: boolean;
  requires_renewal: boolean;
  can_apply: boolean;
  has_active_allocation: boolean;
}

interface Props {
  hostel: HostelCardData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDER_LABELS: Record<GenderPolicy, string> = {
  male: 'Male Only',
  female: 'Female Only',
  mixed: 'Mixed',
};

const TYPE_LABELS: Record<HostelType, string> = {
  'campus-managed': 'On-Campus',
  affiliated: 'Affiliated',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HostelCard({ hostel }: Props) {
  const {
    id, name, slug, hostel_type, gender_policy, location,
    price_per_semester, image_path, available_beds, total_capacity,
    window_open, already_applied, requires_renewal, has_active_allocation,
  } = hostel;

  // ── Determine disabled reason (null = enabled) ────────────────────────────

  const applyDisabledReason: string | null = has_active_allocation
    ? 'You already have an active allocation this semester'
    : !window_open
      ? 'Application window is currently closed'
      : requires_renewal
        ? 'Non-first-year students must request renewal for on-campus rooms'
        : null;

  // already_applied is NOT a disabled reason — it redirects to a different page
  const isDisabled = !!applyDisabledReason && !already_applied;

  // ── CTA label and destination ─────────────────────────────────────────────

  const ctaLabel: string = already_applied
    ? 'View Application'
    : requires_renewal
      ? 'Request Renewal'
      : 'Apply Now';

  const ctaHref: string = already_applied
    ? route('student.applications.index')
    : requires_renewal
      ? route('student.hostels.show', { hostel: slug })   // renewal dialog on S3
      : route('student.applications.create', { hostel_id: id });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">

      {/* Image */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {image_path ? (
          <img
            src={image_path}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <BedDouble className="size-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Type + gender badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge className="rounded-md bg-[#137c41] text-white text-[10px] px-2 py-0.5 min-w-fit">
            {TYPE_LABELS[hostel_type]}
          </Badge>
          <Badge className="rounded-md bg-card text-foreground border border-border text-[10px] px-2 py-0.5 min-w-fit">
            {GENDER_LABELS[gender_policy]}
          </Badge>
        </div>

        {/* Closed overlay */}
        {!window_open && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Lock className="size-3" /> Applications Closed
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <CardContent className="p-4 flex flex-col gap-3 flex-1">

        {/* Name + location */}
        <div>
          <Link
            href={route('student.hostels.show', { hostel: slug })}
            className="font-semibold text-foreground hover:underline line-clamp-1"
            title={`View details for ${name}`}
          >
            {name}
          </Link>
          {location && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="size-3 text-accent-500" />
              {location}
            </p>
          )}
        </div>

        {/* Capacity + price */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3 text-accent-500" />
            {available_beds}/{total_capacity} beds free
          </span>
          {price_per_semester != null && (
            <span className="font-medium text-foreground">
              UGX {Number(price_per_semester).toLocaleString()}/sem
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-2">
          {isDisabled ? (
            // Disabled state — plain button, no Link wrapper
            <Button
              size="sm"
              disabled
              title={applyDisabledReason ?? ''}
              className="w-full text-xs font-semibold bg-muted text-muted-foreground cursor-not-allowed"
            >
              {ctaLabel}
            </Button>
          ) : (
            // Enabled state — Button wraps a Link via asChild
            <Button
              asChild
              size="sm"
              title={ctaLabel}
              className={cn(
                'w-full text-xs font-semibold',
                'bg-brand-700 hover:bg-brand-800 text-white',
              )}
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
