<?php
// File: app/Services/OccupancyMetricsService.php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Schema;
use App\Models\AcademicTerm;
use App\Models\Allocation;
use App\Models\Room;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Read-only service.
 * Computes occupancy metrics scoped to the most recent allocation window.
 *
 * "Most recent window" = the AcademicTerm whose application_window_open
 * is latest (regardless of whether it is still open or already closed).
 * Only active (campus-managed + affiliated) hostels are included.
 *
 * Security note: no user-supplied input reaches this service.
 * All queries are read-only; no write path exists here.
 */
final class OccupancyMetricsService
{
    private const CACHE_TTL_SECONDS = 300; // 5 minutes
    private const CACHE_KEY         = 'occupancy_metrics:landing';

    /**
     * Returns a small DTO array safe to pass straight to Inertia/React.
     *
     * [
     *   'allocation_percentage' => int   (0–100),
     *   'allocated_beds'        => int,
     *   'total_beds'            => int,
     *   'term_name'             => string|null,
     *   'academic_year'         => string|null,
     * ]
     */
    public function landingSnapshot(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL_SECONDS,
            fn () => $this->compute(),
        );
    }

    /** Force-invalidate the cache (call from HousingUnitObserver or AllocationObserver). */
    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function compute(): array
    {
        // Avoid hard crash if migration hasn’t run yet
        if (! Schema::hasTable('academic_terms')) {
            // Always return an array, not null
            return $this->emptySnapshot();
        }

        // 1. Resolve the most recent term that had an allocation window.
        //    We pick by latest application_window_open to match the requirement:
        //    "most recently opened and/or closed windows or most recent allocation round".
        $term = AcademicTerm::query()
            ->whereNotNull('application_window_open')
            ->orderByDesc('application_window_open')
            ->select(['id', 'name', 'academic_year_id'])
            ->with('academicYear')   // assumes AcademicTerm::academicYear() belongsTo relationship(if you need the related AcademicYear data downstream)
            ->first();

        if ($term === null) {
            return $this->emptySnapshot();
        }

        // 2. Count total active bed capacity across active hostels for this term.
        //    Join: rooms → hostels (active only).
        //    "active hostel" = management_type in ('campus-managed', 'affiliated')
        //    AND availability_status != 'inactive'.
        $totalBeds = Room::query()
            ->join('hostels', 'hostels.id', '=', 'rooms.hostel_id')
            ->where('hostels.availability_status', '!=', 'inactive')
            ->whereIn('hostels.management_type', ['campus-managed', 'affiliated'])
            ->whereNull('rooms.deleted_at')
            ->sum(DB::raw('COALESCE(rooms.bed_count, rooms.capacity, 0)'));

        if ((int) $totalBeds === 0) {
            return $this->emptySnapshot($term);
        }

        // 3. Count confirmed allocations (allocated + checked_in) for that term.
        //    Scoped to the same active hostels via a sub-join so we never
        //    count orphaned or inactive-hostel allocations.
        $allocatedBeds = Allocation::query()
            ->join('rooms', 'rooms.id', '=', 'allocations.room_id')
            ->join('hostels', 'hostels.id', '=', 'rooms.hostel_id')
            ->where('allocations.academic_term_id', $term->id)
            ->whereIn('allocations.status', ['allocated', 'checked_in'])
            ->where('hostels.availability_status', '!=', 'inactive')
            ->whereIn('hostels.management_type', ['campus-managed', 'affiliated'])
            ->count();

        $percentage = (int) round(($allocatedBeds / $totalBeds) * 100);

        return [
            'allocation_percentage' => min($percentage, 100), // clamp at 100 %
            'allocated_beds'        => $allocatedBeds,
            'total_beds'            => (int) $totalBeds,
            'term_name'             => $term->name,
            'academic_year' => $term?->academicYear?->name,
        ];
    }

    private function emptySnapshot(?AcademicTerm $term = null): array
    {
        return [
            'allocation_percentage' => 0,
            'allocated_beds'        => 0,
            'total_beds'            => 0,
            'term_name'             => $term?->name,
            'academic_year' => $term?->academicYear?->name,
        ];
    }
}
