<?php
// File: app/Providers/AppServiceProvider.php
//
// Registers all model policies (so Gate::authorize() / @can / $user->can()
// resolve correctly for every model with object-level authorization) and
// attaches AllocationObserver to the three models it observes.

declare(strict_types=1);

namespace App\Providers;

use App\Models\{
    AcademicTerm,
    Allocation,
    Application,
    Bed,
    Hostel,
    MaintenanceRequest,
    Room,
    Student,
    User,
};
use App\Observers\AllocationObserver;
use App\Policies\{
    AcademicTermPolicy,
    ApplicationPolicy,
    AllocationPolicy,
    BedPolicy,
    HostelPolicy,
    MaintenanceRequestPolicy,
    RoomPolicy,
    StudentPolicy,
    UserPolicy,
};
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // ── Policy registrations ────────────────────────────────────────────
        Gate::policy(Hostel::class, HostelPolicy::class);
        Gate::policy(Room::class, RoomPolicy::class);
        Gate::policy(Student::class, StudentPolicy::class);
        Gate::policy(Application::class, ApplicationPolicy::class);
        Gate::policy(Allocation::class, AllocationPolicy::class);
        Gate::policy(Bed::class, BedPolicy::class);
        Gate::policy(MaintenanceRequest::class, MaintenanceRequestPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(AcademicTerm::class, AcademicTermPolicy::class);

        // ── Observer registrations ──────────────────────────────────────────
        // AllocationObserver is shared across Hostel/Room (cache + search
        // sync) and Allocation (bed status transitions, waitlist promotion,
        // occupancy metrics flush) — see app/Observers/AllocationObserver.php
        Hostel::observe(AllocationObserver::class);
        Room::observe(AllocationObserver::class);
        Allocation::observe(AllocationObserver::class);

        // Global super-admin perission bypass
    Gate::before(function ($user, string $ability) {
        return $user->hasRole('super_admin') ? true : null;
    });
    }
}
