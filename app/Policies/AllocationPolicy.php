<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\{Allocation, User};
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * AllocationPolicy centralises authorization rules for hostel allocations.
 *
 * It is designed to align with the business rules expressed in the
 * Allocation model (STATUS_* constants, checkIn/checkOut, overrides) and
 * with your admin role hierarchy:
 *   - super_admin, admin, dean → full visibility and control
 *   - warden                   → campus-managed hostels only
 *   - affiliated_admin         → affiliated hostels only
 *
 * Controllers should call $this->authorize() / Gate::authorize() with
 * these methods instead of embedding role checks directly.
 */
class AllocationPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any allocations.
     *
     * Mapped to: AllocationController::index(), waitlist(), show()
     */
    public function viewAny(User $user): bool
    {
        // Permission check ensures only admin-lane users reach allocations UI.
        return $user->can('view allocations')
            || $user->hasAnyRole(['super_admin', 'admin', 'dean', 'warden', 'affiliated_admin']);
    }

    /**
     * Determine whether the user can view a specific allocation record.
     *
     * This hardens object-level access beyond the middleware:
     *  - Wardens may only see allocations for campus-managed hostels.
     *  - Affiliated admins may only see allocations for affiliated hostels.
     *  - Super/admin/dean may see all allocations.
     */
    public function view(User $user, Allocation $allocation): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }

        // Super/admin/dean: unrestricted.
        if ($user->hasAnyRole(['super_admin', 'admin', 'dean'])) {
            return true;
        }

        $managementType = $allocation->hostel?->management_type;

        // Warden: campus-managed only.
        if ($user->hasRole('warden')) {
            return $managementType === 'campus-managed';
        }

        // Affiliated admin: affiliated hostels only.
        if ($user->hasRole('affiliated_admin')) {
            return $managementType === 'affiliated';
        }

        return false;
    }

    /**
     * Determine whether the user can create allocations (batch run / promote).
     *
     * Mapped to: AllocationController::runBatch(), promote().
     */
    public function create(User $user): bool
    {
        // Use your granular permission where available; roles as fallback.
        return $user->can('process applications')
            || $user->hasAnyRole(['super_admin', 'admin', 'dean']);
    }

    /**
     * Determine whether the user can update an allocation.
     *
     * Covers:
     *  - checkOut() (ASYS-5)
     *  - override() (ASYS-4)
     *  - any future status changes.
     */
    public function update(User $user, Allocation $allocation): bool
    {
        if (! $this->view($user, $allocation)) {
            return false;
        }

        // Check-out requires the dedicated permission or elevated role.
        $canUpdate = $user->can('update allocations')
            || $user->can('switch allocations')
            || $user->hasAnyRole(['super_admin', 'admin', 'dean']);

        if (! $canUpdate) {
            return false;
        }

        // Optional: lock updates on terminal states if desired.
        // You can relax this if you need to allow corrections.
        if (in_array($allocation->status, [
            Allocation::STATUS_CHECKED_OUT,
            Allocation::STATUS_EVICTED,
            Allocation::STATUS_CANCELLED,
        ], true)) {
            return false;
        }

        return true;
    }

    /**
     * Convenience wrapper used when you want to explicitly gate overrides
     * (bed reassignment) separately from generic updates.
     *
     * Example usage in controller:
     *   $this->authorize('override', $allocation);
     */
    public function override(User $user, Allocation $allocation): bool
    {
        if (! $this->view($user, $allocation)) {
            return false;
        }

        return $user->can('switch allocations')
            || $user->hasAnyRole(['super_admin', 'admin', 'dean']);
    }

    /**
     * Allow students to view *their own* allocation via policies, if you ever
     * expose Allocation in the student portal.
     */
    public function viewOwn(User $user, Allocation $allocation): bool
    {
        // Student role + matching FK.
        return $user->hasRole('student') && $allocation->student?->user_id === $user->id;
    }
}
