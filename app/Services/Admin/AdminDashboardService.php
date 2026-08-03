<?php
// File: app/Services/Admin/AdminDashboardService.php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\{AcademicTerm, Allocation, Application, Bed, Hostel, User};
use App\Support\AdminScope;
use Illuminate\Support\Facades\Cache;

class AdminDashboardService
{
    /**
     * Build (and cache) dashboard metrics scoped to the requesting user's
     * role. A super_admin/dean sees system-wide numbers; a warden or
     * affiliated_admin sees numbers limited to hostels they manage/own,
     * via the same AdminScope::hostelsFor() used for hostel listing.
     *
     * Cache key includes the user id so scoped roles never see another
     * admin's cached (differently-scoped) numbers, and the term id so
     * switching academic terms doesn't serve stale data.
     */
    public function metricsFor(User $user, ?AcademicTerm $term): array
    {
        $termId   = $term?->id;
        $cacheKey = "admin_dashboard_metrics:{$user->id}:" . ($termId ?? 'no-term');

        return Cache::remember($cacheKey, 300, fn () => $this->buildMetrics($user, $termId));
    }

    private function buildMetrics(User $user, ?int $termId): array
    {
        $hostelIds = AdminScope::hostelsFor($user, Hostel::query())->pluck('id');

        $bedQuery = fn () => Bed::whereHas(
            'room.hostel',
            fn ($q) => $q->whereIn('hostel_id', $hostelIds)
                ->where('availability_status', '!=', 'inactive')
        );

        return [
            'total_beds'            => $bedQuery()->count(),
            'occupied_beds'         => $bedQuery()->where('status', Bed::STATUS_OCCUPIED)->count(),
            'available_beds'        => $bedQuery()->where('status', Bed::STATUS_AVAILABLE)->count(),
            'maintenance_beds'      => $bedQuery()->where('status', Bed::STATUS_MAINTENANCE)->count(),
            'vacant_beds'           => $bedQuery()->where('status', Bed::STATUS_AVAILABLE)->count(),

            'total_hostels'         => Hostel::whereIn('id', $hostelIds)
                ->where('availability_status', '!=', 'inactive')
                ->count(),

            'pending_applications'  => $termId
                ? Application::where('academic_term_id', $termId)
                    ->where('status', 'pending')
                    ->whereIn('hostel_id', $hostelIds)
                    ->count()
                : 0,

            'waitlisted'            => $termId
                ? Application::where('academic_term_id', $termId)
                    ->where('status', 'waitlisted')
                    ->whereIn('hostel_id', $hostelIds)
                    ->count()
                : 0,

            'active_allocations'    => $termId
                ? Allocation::where('academic_term_id', $termId)
                    ->whereIn('status', ['allocated', 'checked_in'])
                    ->whereIn('hostel_id', $hostelIds)
                    ->count()
                : 0,

            'allocated_this_term'   => $termId
                ? Allocation::where('academic_term_id', $termId)
                    ->whereIn('status', ['allocated', 'checked_in'])
                    ->whereIn('hostel_id', $hostelIds)
                    ->count()
                : 0,

            'open_maintenance_issues' => \App\Models\MaintenanceRequest::whereIn('status', ['open', 'in_progress'])
                ->whereHas('allocation', fn ($q) => $q->whereIn('hostel_id', $hostelIds))
                ->count(),
        ];
    }

    /**
     * Forget a specific user's cached metrics — call this from any
     * controller that mutates Bed/Application/Allocation state
     * (e.g. AllocationController::checkIn(), ApplicationController::store()).
     */
    public function forget(User $user, ?int $termId): void
    {
        Cache::forget("admin_dashboard_metrics:{$user->id}:" . ($termId ?? 'no-term'));
    }
}
