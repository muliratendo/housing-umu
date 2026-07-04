// File: resources/js/Pages/Public/Hostels/HostelList.tsx
// REPLACE existing entirely.
//
// This page is now a thin shell:
//   - hostelList normalisation
//   - HostelFiltersPanel owns all search/filter/router state
//   - clearFilters is called via ref so the empty-state button
//     delegates to the panel without duplicating any logic

import React, { useMemo, useRef } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import HostelCard from '@/components/Public/PublicHostelCard';
import HostelFiltersPanel, {
  type HostelFiltersPanelHandle,
} from '@/components/Public/HostelFiltersPanel';
import BackToTop from '@/components/BackToTop';

import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

import type { Hostel, HostelListProps } from '@/types/hostels';

// ── Component ─────────────────────────────────────────────────────────────────

export default function HostelList({ hostels, currentFilters }: HostelListProps) {
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
    <GuestLayout showNavAndFooter={true}>
      <Head title="Browse Hostels | Housing@UMU" />
      <BackToTop />

      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/20">

        {/* ── Filter + Search Bar ─────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl">
            <HostelFiltersPanel
              ref={filtersPanelRef}
              currentFilters={currentFilters}
              baseRoute="/hostels"
            />
          </div>
        </header>

        {/* ── Hostel Grid ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {hostelList.map((hostel) => (
                <HostelCard key={hostel.id} hostel={hostel} />
              ))}
            </div>
          )}
        </div>

      </div>
    </GuestLayout>
  );
}
