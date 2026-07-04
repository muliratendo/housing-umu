// resources/js/components/Student/QuickActions.tsx

import React from 'react';
import { route } from 'ziggy-js';
import { Link } from '@inertiajs/react';
import { Building2, ChevronRight, FileText, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  canAccessMaintenance: boolean;
}

interface ActionItem {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  disabled: boolean;
  tooltip: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickActions({ canAccessMaintenance }: Props) {
  const actions: ActionItem[] = [
    {
      label: 'Browse Hostels',
      description: 'View available rooms and apply',
      icon: Building2,
      href: route('student.hostels.index'),
      disabled: false,
      tooltip: 'Browse available hostels and apply for accommodation',
    },
    {
      label: 'My Applications',
      description: 'Track your hostel applications',
      icon: FileText,
      href: route('student.applications.index'),
      disabled: false,
      tooltip: 'View all your hostel applications this semester',
    },
    {
      label: 'Maintenance Request',
      description: 'Report a room issue',
      icon: Wrench,
      href: canAccessMaintenance ? route('student.maintenance.index') : '#',
      disabled: !canAccessMaintenance,
      tooltip: canAccessMaintenance
        ? 'Submit or view maintenance requests for your room'
        : 'Available only after allocation and check-in (BR-10)',
    },
  ];

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border">
        {actions.map(({ label, description, icon: Icon, href, disabled, tooltip }) => (
          <Link
            key={label}
            href={href}
            title={tooltip}
            onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            aria-disabled={disabled}
            className={cn(
              'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group',
              disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}
          >
            {/* Icon pill */}
            <div className="flex-shrink-0 rounded-md p-1.5 bg-accent-500/10">
              <Icon className="size-4 text-accent-500" strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            </div>

            {/* Chevron */}
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
