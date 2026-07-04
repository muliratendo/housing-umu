// File: resources/js/components/Public/HostelFiltersPanel.tsx
// REPLACE existing entirely.
//
// Self-contained search + filter panel.
// Owns: FilterState, search state, debounce, Dialog (desktop), Sheet (mobile).
// Exposes:  onClearFilters callback so the parent's empty-state "Clear Filters"
//           button can delegate here without duplicating router logic.
//
// Usage in public page:
//   <HostelFiltersPanel
//     currentFilters={currentFilters}
//     baseRoute="/hostels"
//     onClearFilters={handleClearFilters}   ← ref forwarded from parent
//   />
//
// Usage in student portal:
//   <HostelFiltersPanel
//     currentFilters={currentFilters}
//     baseRoute="/student/hostels"
//     onClearFilters={handleClearFilters}
//   />

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { router } from '@inertiajs/react';

import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

import {
  Eraser, Search, SlidersHorizontal, Filter, ShieldAlert,
} from 'lucide-react';

import {
  AVAILABILITY_OPTIONS,
  BED_OPTIONS,
  GENDER_OPTIONS,
  LOCATION_OPTIONS,
  MANAGEMENT_OPTIONS,
  ROOM_TYPE_OPTIONS,
} from '@/constants/hostelFilters';

import type {
  AvailabilityStatus,
  BedCountFilter,
  GenderScope,
  HostelListProps,
  HostelQueryParams,
  ManagementType,
  RoomType,
} from '@/types/hostels';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  bedCount: BedCountFilter | null;
  roomTypes: RoomType[];
  locations: string[];
  genderScope: GenderScope | null;
  isClergyOnly: boolean;
  locationIndex: string | null;
  availability: AvailabilityStatus[];
  managementType: ManagementType | null;
}

/** Handle exposed to parent via ref — lets parent trigger clear without owning state. */
export interface HostelFiltersPanelHandle {
  clearFilters: () => void;
}

interface HostelFiltersPanelProps {
  currentFilters: HostelListProps['currentFilters'];
  /** Route to fire router.get() against. Defaults to '/hostels'. */
  baseRoute?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveFilters(currentFilters: HostelListProps['currentFilters']): FilterState {
  return {
    bedCount:
      currentFilters?.bed_count === 1 || currentFilters?.bed_count === 'single'
        ? 'single'
        : currentFilters?.bed_count === 2 || currentFilters?.bed_count === 'double'
          ? 'double'
          : null,
    roomTypes: currentFilters?.room_type ?? [],
    locations: currentFilters?.location ?? [],
    genderScope: currentFilters?.gender?.[0] ?? null,
    isClergyOnly: currentFilters?.is_religious_order ?? false,
    locationIndex: currentFilters?.location?.[0] ?? null,
    availability: currentFilters?.availability ?? [],
    managementType: currentFilters?.management_type?.[0] ?? null,
  };
}

function buildQueryParams(search: string, filters: FilterState): HostelQueryParams {
  const q: HostelQueryParams = {};
  if (search) q.search = search;
  if (filters.roomTypes.length > 0) q.room_type = filters.roomTypes;
  if (filters.locationIndex) q.location = [filters.locationIndex];
  if (filters.availability.length > 0) q.availability = filters.availability;
  if (filters.genderScope) q.gender = [filters.genderScope];
  if (filters.managementType) q.management_type = [filters.managementType];
  if (filters.isClergyOnly) q.is_religious_order = true;
  if (filters.bedCount) q.bed_count = filters.bedCount;
  return q;
}

// ── Component ─────────────────────────────────────────────────────────────────

const HostelFiltersPanel = forwardRef<HostelFiltersPanelHandle, HostelFiltersPanelProps>(
  function HostelFiltersPanel(
    { currentFilters, baseRoute = '/hostels' },
    ref,
  ) {
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [showDesktopAdvancedFilters, setShowDesktopAdvancedFilters] = useState(false);

    const [search, setSearch] = useState(currentFilters?.search ?? '');
    const [filters, setFilters] = useState<FilterState>(() => deriveFilters(currentFilters));

    // ── Expose clearFilters to parent via ref ─────────────────────────────
    useImperativeHandle(ref, () => ({
      clearFilters: handleClearFilters,
    }));

    // ── Search debounce (search only — no filter dependency) ──────────────
    const isFirstRender = useRef(true);
    useEffect(() => {
      if (isFirstRender.current) { isFirstRender.current = false; return; }
      const timer = setTimeout(() => {
        router.get(baseRoute, buildQueryParams(search, filters), {
          preserveState: true, preserveScroll: true, replace: true,
          only: ['hostels', 'currentFilters'],
        });
      }, 400);
      return () => clearTimeout(timer);
    }, [search]); // ← ONLY search — intentional loop guard

    // ── Handlers ─────────────────────────────────────────────────────────

    const handleFilterChange = <K extends keyof FilterState>(
      key: K,
      value: FilterState[K],
    ) => setFilters((prev) => ({ ...prev, [key]: value }));

    const handleLocationChange = (loc: string, checked: boolean | 'indeterminate') => {
      const isChecked = checked === true;
      const updated = isChecked
        ? [...filters.locations.filter((l) => l !== loc), loc]
        : filters.locations.filter((l) => l !== loc);
      handleFilterChange('locations', updated);
      handleFilterChange(
        'locationIndex',
        isChecked ? loc : filters.locationIndex === loc ? null : filters.locationIndex,
      );
    };

    function handleClearFilters() {
      const empty: FilterState = {
        bedCount: null, roomTypes: [], locations: [], genderScope: null,
        isClergyOnly: false, locationIndex: null, availability: [], managementType: null,
      };
      setSearch('');
      setFilters(empty);
      router.get(baseRoute, {}, {
        preserveState: true, preserveScroll: true, replace: true,
        only: ['hostels', 'currentFilters'],
      });
    }

    const applyFilters = () => {
      router.get(baseRoute, buildQueryParams(search, filters), {
        preserveState: true, preserveScroll: true, replace: true,
        only: ['hostels', 'currentFilters'],
        onSuccess: () => setShowDesktopAdvancedFilters(false),
      });
    };

    const applyMobileFilters = () => {
      router.get(baseRoute, buildQueryParams(search, filters), {
        preserveState: true, preserveScroll: true, replace: true,
        only: ['hostels', 'currentFilters'],
        onSuccess: () => setIsMobileFilterOpen(false),
      });
    };

    const activeFilterCount =
      (search ? 1 : 0) +
      filters.roomTypes.length +
      filters.availability.length +
      (filters.managementType ? 1 : 0) +
      (filters.genderScope ? 1 : 0) +
      (filters.bedCount ? 1 : 0) +
      (filters.locationIndex ? 1 : 0) +
      (filters.isClergyOnly ? 1 : 0);

    // ── Render ────────────────────────────────────────────────────────────

    return (
      <div className="bg-white dark:bg-slate-900 dark:border-slate-800">
        {/* ── Search row ───────────────────────────────────────────────── */}
        <div className="flex flex-row items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hostels by name, area, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-700 focus:bg-white focus:ring-4 focus:ring-brand-700/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-950"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop filter button */}
            <Button
              type="button"
              variant="outline"
              className="hidden h-11 rounded-full px-4 md:inline-flex"
              onClick={() => setShowDesktopAdvancedFilters((prev) => !prev)}
            >
              <Filter className="mr-2 h-4 w-4 text-accent-500" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Mobile filter button */}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-4 md:hidden"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4 text-accent-500" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Reset — only shown when filters are active */}
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                onClick={handleClearFilters}
              >
                <Eraser className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── Desktop Advanced Filters Dialog ──────────────────────────── */}
        <Dialog open={showDesktopAdvancedFilters} onOpenChange={setShowDesktopAdvancedFilters}>
          <DialogContent
            className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-5xl"
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-accent-500" />
                Advanced Filters
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {/* Management Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Management Type
                  </label>
                  <Select
                    value={filters.managementType || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('managementType', val === 'all' ? null : (val as ManagementType))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                      <SelectValue placeholder="Select management type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hostels</SelectItem>
                      {MANAGEMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Policy */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Gender Policy
                  </label>
                  <Select
                    value={filters.genderScope || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('genderScope', val === 'all' ? null : (val as GenderScope))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                      <SelectValue placeholder="Select gender policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Policies</SelectItem>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Occupancy */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Occupancy
                  </label>
                  <Select
                    value={filters.bedCount || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('bedCount', val === 'all' ? null : (val as BedCountFilter))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                      <SelectValue placeholder="Select occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Occupancy</SelectItem>
                      {BED_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Location
                  </label>
                  <Select
                    value={filters.locationIndex || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('locationIndex', val === 'all' ? null : val)
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {LOCATION_OPTIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-4 bg-slate-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                {/* Room Setup */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Room Setup
                  </label>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    {ROOM_TYPE_OPTIONS.map((type) => (
                      <label key={type.value} className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.roomTypes.includes(type.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked === true
                              ? [...filters.roomTypes, type.value]
                              : filters.roomTypes.filter((t) => t !== type.value);
                            handleFilterChange('roomTypes', updated);
                          }}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span>{type.label}</span>
                          {type.helper && <span className="text-[10px] text-slate-400">{type.helper}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Availability
                  </label>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <label key={option.value} className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.availability.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked === true
                              ? [...filters.availability, option.value]
                              : filters.availability.filter((a) => a !== option.value);
                            handleFilterChange('availability', updated);
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Special Rules */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Special Rules
                  </label>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-950/40 dark:bg-amber-950/10">
                    <label className="flex cursor-pointer items-start gap-2">
                      <Checkbox
                        checked={filters.isClergyOnly}
                        onCheckedChange={(checked) =>
                          handleFilterChange('isClergyOnly', checked === true)
                        }
                        className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-600"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-400">
                          <ShieldAlert className="h-3 w-3 text-amber-600" />
                          Religious Hostels Only
                        </span>
                        <span className="text-[10px] leading-snug text-amber-700/80 dark:text-amber-500/80">
                          For nuns, priests, seminarians, or other religious residents.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button variant="outline" onClick={handleClearFilters}>Reset</Button>
              <Button variant="outline" onClick={() => setShowDesktopAdvancedFilters(false)}>Cancel</Button>
              <Button
                onClick={applyFilters}
                className="bg-brand-700 text-white hover:bg-brand-800"
              >
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Mobile Filter Sheet ───────────────────────────────────────── */}
        <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
          <SheetContent
            side="left"
            className="w-[320px] border-l border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900"
          >
            <SheetHeader className="border-b border-slate-200 p-4 dark:border-slate-800">
              <SheetTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                Filter Hostels
              </SheetTitle>
            </SheetHeader>

            <div className="h-[calc(100vh-60px)] overflow-y-auto p-4 pb-12">
              <div className="space-y-5">

                {/* Management Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Management Type</label>
                  <Select
                    value={filters.managementType || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('managementType', val === 'all' ? null : (val as ManagementType))
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl text-xs"><SelectValue placeholder="Select management type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hostels</SelectItem>
                      {MANAGEMENT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Occupancy */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Occupancy</label>
                  <div className="flex flex-col gap-2">
                    {BED_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.bedCount === option.value}
                          onCheckedChange={(checked) =>
                            handleFilterChange('bedCount', checked === true ? option.value : null)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Room Setup */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Room Setup</label>
                  <div className="flex flex-col gap-2">
                    {ROOM_TYPE_OPTIONS.map((type) => (
                      <label key={type.value} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.roomTypes.includes(type.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked === true
                              ? [...filters.roomTypes, type.value]
                              : filters.roomTypes.filter((t) => t !== type.value);
                            handleFilterChange('roomTypes', updated);
                          }}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span>{type.label}</span>
                          {type.helper && <span className="text-[10px] text-slate-400">{type.helper}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Availability</label>
                  <div className="flex flex-col gap-2">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.availability.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updated = checked === true
                              ? [...filters.availability, option.value]
                              : filters.availability.filter((a) => a !== option.value);
                            handleFilterChange('availability', updated);
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gender Policy */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gender Policy</label>
                  <Select
                    value={filters.genderScope || 'all'}
                    onValueChange={(val) =>
                      handleFilterChange('genderScope', val === 'all' ? null : (val as GenderScope))
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl text-xs"><SelectValue placeholder="Select hostel policy" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Policies</SelectItem>
                      {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</label>
                  <div className="flex flex-col gap-2">
                    {LOCATION_OPTIONS.map((loc) => (
                      <label key={loc} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Checkbox
                          checked={filters.locations.includes(loc)}
                          onCheckedChange={(checked) => handleLocationChange(loc, checked)}
                        />
                        <span>{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Religious */}
                <label className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-950/40 dark:bg-amber-950/10">
                  <Checkbox
                    checked={filters.isClergyOnly}
                    onCheckedChange={(checked) =>
                      handleFilterChange('isClergyOnly', checked === true)
                    }
                    className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-600"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-400">
                      <ShieldAlert className="h-3 w-3 text-amber-600" />
                      Religious Hostels Only
                    </span>
                    <span className="text-[10px] leading-snug text-amber-700/80 dark:text-amber-500/80">
                      For nuns, priests, seminarians, or other religious residents.
                    </span>
                  </div>
                </label>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleClearFilters} className="h-10 flex-1 text-xs">Reset</Button>
                  <Button
                    onClick={applyMobileFilters}
                    className="h-10 flex-1 bg-brand-700 text-xs text-white hover:bg-brand-800"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
);

HostelFiltersPanel.displayName = 'HostelFiltersPanel';
export default HostelFiltersPanel;
