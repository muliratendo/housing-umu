// File: resources/js/Pages/Student/Hostel/Index.tsx
import React, { useState, useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HostelCard from '@/components/Student/HostelCard';
import HostelFiltersPanel, {
  type HostelFiltersPanelHandle,
} from '@/components/Public/HostelFiltersPanel';
import BackToTop from '@/components/BackToTop';
import type { Hostel, HostelListProps } from '@/types/hostels';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HostelItem {
  id: number;
  name: string;
  slug: string;
  management_type: string;
  gender_scope: string;
  availability_status: string;
  location?: string;
  price_per_semester?: number | string;
}

interface ActiveAllocation {
  hostel_name: string;
  room_number: string;
}

interface Term {
  name: string;
  academic_year: string;
}

interface Props {
  hostels: HostelItem[];
  activeAllocation?: ActiveAllocation | null;
  currentFilters: HostelListProps['currentFilters'];
  currentTerm?: Term | null;
  student?: { name: string; is_first_year: boolean };
}

// ── Sentinel helpers ──────────────────────────────────────────────────────────
// Radix <SelectItem> disallows value="". Use "all" as the "no filter" sentinel
// and strip it before sending to the backend.

const ALL = 'all' as const;
const toParam = (v: string) => (v === ALL ? '' : v);
const toSelect = (v: string | undefined) => (v && v !== '' ? v : ALL);

// ── Component ─────────────────────────────────────────────────────────────────

export default function HostelIndex({
  hostels,
  activeAllocation,
  currentFilters,
  currentTerm,
  student,
}: Props) {
  // Ref gives us access to the panel's clearFilters() without lifting state
  const filtersPanelRef = useRef<HostelFiltersPanelHandle>(null);

  const hostelList = useMemo(() => {
    if (Array.isArray(hostels)) return hostels;
    if (hostels && typeof hostels === 'object') return Object.values(hostels) as Hostel[];
    return [];
  }, [hostels]);

  const handleClearFilters = () => filtersPanelRef.current?.clearFilters();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthenticatedLayout
      title="Hostels"
      breadcrumbs={[
        { label: 'Hostels', href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title="Browse Hostels – Housing@UMU" />
      <BackToTop />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* ── Filter + Search Bar ─────────────────────────────────────── */}
        <header>
          <div className="mx-auto max-w-7xl">
            <HostelFiltersPanel
              ref={filtersPanelRef}
              currentFilters={currentFilters}
              baseRoute="/student/hostels"
            />
          </div>
        </header>

        {/* ── Active allocation notice (D0) ────────────────────────────────── */}
        {activeAllocation && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm">
            <span className="text-green-800 dark:text-green-300">
              You already have an active room allocation this semester.
            </span>
            <Link
              href={route('student.allocation.show')}
              className="font-semibold text-green-800 underline underline-offset-2 whitespace-nowrap"
            >
              View Allocation →
            </Link>
          </div>
        )}

        {/* ── Hostel Grid ──────────────────────────────────────────────────── */}
        {hostelList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 rounded-full bg-slate-50 p-4 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <SlidersHorizontal className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              No Hostels Found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No hostels match your filters. Try changing the search text or clearing some filters.
            </p>
            <Button
              size="sm"
              onClick={handleClearFilters}
              className="mt-4 bg-brand-700 text-white hover:bg-brand-800"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hostelList.map((hostel) => (
              <HostelCard key={hostel.id} hostel={hostel} />
            ))}
          </div>
        )}

      </div>
    </AuthenticatedLayout>
  );
}
