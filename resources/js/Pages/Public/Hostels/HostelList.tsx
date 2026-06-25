import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { cn } from '@/lib/utils';
import HostelCard from '@/components/Hostels/HostelCard';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Search,
  SlidersHorizontal,
  Church,
  Eraser,
  ShieldAlert,
  Award,
  ArrowRight,
  Bed,
  MapPin,
  Building2,
  Filter,
} from 'lucide-react';

import type {
  AvailabilityStatus,
  BedCountFilter,
  GenderScope,
  Hostel,
  HostelListProps,
  HostelQueryParams,
  ManagementType,
  RoomType,
} from '@/types/hostels';

import {
  AVAILABILITY_OPTIONS,
  BED_OPTIONS,
  GENDER_OPTIONS,
  LOCATION_OPTIONS,
  MANAGEMENT_OPTIONS,
  ROOM_TYPE_OPTIONS,
} from '@/constants/hostelFilters';

interface FilterState {
  bedCount: BedCountFilter | null;
  roomTypes: RoomType[];
  locations: string[];
  genderScope: GenderScope | null;
  isClergyOnly: boolean;
  locationIndex: string | null;
  availability: AvailabilityStatus[];
  managementType: ManagementType | null;
}

export default function HostelList({
  hostels,
  currentFilters,
}: HostelListProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showDesktopAdvancedFilters, setShowDesktopAdvancedFilters] = useState(false);
  const [search, setSearch] = useState(currentFilters?.search ?? '');

  const hostelList = useMemo<Hostel[]>(() => {
    if (Array.isArray(hostels)) {
      return hostels;
    }

    if (hostels && typeof hostels === 'object') {
      return Object.values(hostels);
    }

    return [];
  }, [hostels]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[HostelList] raw hostels prop:', hostels);
      console.log('[HostelList] Array.isArray(hostels):', Array.isArray(hostels));
      console.log('[HostelList] normalized hostelList:', hostelList);
      console.log('[HostelList] currentFilters:', currentFilters);
    }
  }, [hostels, hostelList, currentFilters]);

  const [filters, setFilters] = useState<FilterState>({
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
  });

  useEffect(() => {
    setSearch(currentFilters?.search ?? '');

    setFilters({
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
    });
  }, [currentFilters]);

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocationChange = (loc: string, checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;

    const updated = isChecked
      ? [...filters.locations.filter((l) => l !== loc), loc]
      : filters.locations.filter((l) => l !== loc);

    handleFilterChange('locations', updated);
    handleFilterChange(
      'locationIndex',
      isChecked ? loc : filters.locationIndex === loc ? null : filters.locationIndex
    );
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({
      bedCount: null,
      roomTypes: [],
      locations: [],
      genderScope: null,
      isClergyOnly: false,
      locationIndex: null,
      availability: [],
      managementType: null,
    });
  };

  const buildQueryParams = (): HostelQueryParams => {
    const queryParams: HostelQueryParams = {};

    if (search) queryParams.search = search;
    if (filters.roomTypes.length > 0) queryParams.room_type = filters.roomTypes;
    if (filters.locationIndex) queryParams.location = [filters.locationIndex];
    if (filters.availability.length > 0) queryParams.availability = filters.availability;
    if (filters.genderScope) queryParams.gender = [filters.genderScope];
    if (filters.managementType) queryParams.management_type = [filters.managementType];
    if (filters.isClergyOnly) queryParams.is_religious_order = true;
    if (filters.bedCount) queryParams.bed_count = filters.bedCount;

    return queryParams;
  };

  const applyFilters = () => {
    router.get('/hostels', buildQueryParams(), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      only: ['hostels', 'currentFilters'],
      onSuccess: () => setShowDesktopAdvancedFilters(false),
    });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      router.get('/hostels', buildQueryParams(), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ['hostels', 'currentFilters'],
      });
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, filters]);

  const activeFilterCount =
    (search ? 1 : 0) +
    filters.roomTypes.length +
    filters.availability.length +
    (filters.managementType ? 1 : 0) +
    (filters.genderScope ? 1 : 0) +
    (filters.bedCount ? 1 : 0) +
    (filters.locationIndex ? 1 : 0) +
    (filters.isClergyOnly ? 1 : 0);

  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title="Browse Hostels | Housing@UMU" />

      <div className="min-h-screen bg-slate-50/70 antialiased dark:bg-slate-950/20">
        <header>
          {/* Main search row */}
          <div className="bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
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
                <Button
                  type="button"
                  variant="outline"
                  className="hidden h-11 rounded-full px-4 md:inline-flex"
                  onClick={() => setShowDesktopAdvancedFilters((prev) => !prev)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full px-4 md:hidden"
                  onClick={() => setIsMobileFilterOpen(true)}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                  onClick={handleClearFilters}
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Desktop inline advanced filters */}
            <Dialog
              open={showDesktopAdvancedFilters}
              onOpenChange={setShowDesktopAdvancedFilters}
            >
              <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Advanced Filters</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Management Type
                    </label>
                    <Select
                      value={filters.managementType || 'all'}
                      onValueChange={(val) =>
                        handleFilterChange(
                          'managementType',
                          val === 'all' ? null : (val as ManagementType)
                        )
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                        <SelectValue placeholder="Select management type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Hostels</SelectItem>
                        {MANAGEMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Gender Policy
                    </label>
                    <Select
                      value={filters.genderScope || 'all'}
                      onValueChange={(val) =>
                        handleFilterChange(
                          'genderScope',
                          val === 'all' ? null : (val as GenderScope)
                        )
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                        <SelectValue placeholder="Select gender policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Policies</SelectItem>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Occupancy
                    </label>
                    <Select
                      value={filters.bedCount || 'all'}
                      onValueChange={(val) =>
                        handleFilterChange(
                          'bedCount',
                          val === 'all' ? null : (val as BedCountFilter)
                        )
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-sm dark:bg-slate-900">
                        <SelectValue placeholder="Select occupancy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Occupancy</SelectItem>
                        {BED_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-4 bg-slate-200 dark:bg-slate-800" />

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Room Setup
                    </label>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      {ROOM_TYPE_OPTIONS.map((type) => (
                        <label
                          key={type.value}
                          className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                        >
                          <Checkbox
                            checked={filters.roomTypes.includes(type.value)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const updated = isChecked
                                ? [...filters.roomTypes, type.value]
                                : filters.roomTypes.filter((t) => t !== type.value);

                              handleFilterChange('roomTypes', updated);
                            }}
                          />
                          <div className="flex flex-col gap-0.5">
                            <span>{type.label}</span>
                            {type.helper && (
                              <span className="text-[10px] text-slate-400">
                                {type.helper}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Availability
                    </label>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                        >
                          <Checkbox
                            checked={filters.availability.includes(option.value)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const updated = isChecked
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
                  <Button variant="outline" onClick={handleClearFilters}>
                    Reset
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowDesktopAdvancedFilters(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={applyFilters}
                    className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Apply Filters
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-0 sm:px-6 lg:px-8">
          <div className="space-y-5">
            {/* Empty state */}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pb-5">
                {hostelList.map((hostel) => (
                  <HostelCard key={hostel.id} hostel={hostel} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile filters sheet */}
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
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Management Type
                </label>
                <Select
                  value={filters.managementType || 'all'}
                  onValueChange={(val) =>
                    handleFilterChange(
                      'managementType',
                      val === 'all' ? null : (val as ManagementType)
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl text-xs">
                    <SelectValue placeholder="Select management type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hostels</SelectItem>
                    {MANAGEMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Occupancy
                </label>
                <div className="flex flex-col gap-2">
                  {BED_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
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

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Room Setup
                </label>
                <div className="flex flex-col gap-2">
                  {ROOM_TYPE_OPTIONS.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <Checkbox
                        checked={filters.roomTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          const updated = isChecked
                            ? [...filters.roomTypes, type.value]
                            : filters.roomTypes.filter((t) => t !== type.value);

                          handleFilterChange('roomTypes', updated);
                        }}
                      />
                      <div className="flex flex-col gap-0.5">
                        <span>{type.label}</span>
                        {type.helper && (
                          <span className="text-[10px] text-slate-400">{type.helper}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Availability
                </label>
                <div className="flex flex-col gap-2">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <Checkbox
                        checked={filters.availability.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          const updated = isChecked
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

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Gender Policy
                </label>
                <Select
                  value={filters.genderScope || 'all'}
                  onValueChange={(val) =>
                    handleFilterChange(
                      'genderScope',
                      val === 'all' ? null : (val as GenderScope)
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl text-xs">
                    <SelectValue placeholder="Select hostel policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Policies</SelectItem>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Location
                </label>
                <div className="flex flex-col gap-2">
                  {LOCATION_OPTIONS.map((loc) => (
                    <label
                      key={loc}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <Checkbox
                        checked={filters.locations.includes(loc)}
                        onCheckedChange={(checked) => handleLocationChange(loc, checked)}
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
              </div>

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
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="h-10 flex-1 text-xs"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="h-10 flex-1 bg-slate-900 text-xs text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </GuestLayout>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      )}
    >
      {label}
    </button>
  );
}
