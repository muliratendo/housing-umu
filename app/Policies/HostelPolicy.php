<?php
// app/Policies/HostelPolicy.php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Hostel;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class HostelPolicy
{
    use HandlesAuthorization;

    /**
     * Gate for accessing a hostel listing screen.
     *
     * This only permits the screen itself. Controllers must still scope their
     * queries for manager-level users through managedHostels()/managers().
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view hostels');
    }

    /**
     * View a specific hostel.
     *
     * Only super_admin and dean can view every hostel. admin, warden, and
     * affiliated_admin must be explicitly assigned through hostel_managers.
     * Students retain public catalogue access to hostels not marked closed.
     */
    public function view(User $user, Hostel $hostel): bool
    {
        if (! $user->can('view hostels')) {
            return false;
        }

        if ($this->canManageAllHostels($user)) {
            return true;
        }

        if ($user->hasAnyRole(['admin', 'warden', 'affiliated_admin'])) {
            return $this->managesHostel($user, $hostel);
        }

        return $user->hasRole('student')
            && $hostel->availability_status !== 'closed';
    }

    /**
     * Hostel creation is restricted to global catalogue managers.
     *
     * Do not include ordinary `admin` here when the product rule says that
     * only super_admin and dean manage the full hostel catalogue.
     */
    public function create(User $user): bool
    {
        return $user->can('create hostels')
            && $this->canManageAllHostels($user);
    }

    /**
     * Update one hostel.
     *
     * Global catalogue managers may update every hostel. Other admin-tier
     * users require an explicit hostel_managers assignment.
     */
    public function update(User $user, Hostel $hostel): bool
    {
        if (! $user->can('update hostels')) {
            return false;
        }

        if ($this->canManageAllHostels($user)) {
            return true;
        }

        return $user->hasAnyRole(['admin', 'warden', 'affiliated_admin'])
            && $this->managesHostel($user, $hostel);
    }

    /**
     * Delete remains deliberately more restrictive than updating a hostel.
     */
    public function delete(User $user, Hostel $hostel): bool
    {
        return $user->can('delete hostels')
            && $user->hasRole('super_admin');
    }

    /**
     * Occupancy/report access can be granted independently of hostel CRUD.
     */
    public function viewReports(User $user): bool
    {
        return $user->can('view reports');
    }

    /**
     * Only full-catalogue managers may grant, change, or remove manager
     * assignments. A warden/admin must never be able to grant themselves
     * access to another hostel by forging a PATCH request.
     */
    public function manageManagers(User $user, Hostel $hostel): bool
    {
        return $user->can('update hostels')
            && $this->canManageAllHostels($user);
    }

    /**
     * The deliberately narrow global role list.
     *
     * `admin` is excluded intentionally. It behaves like a manager-level
     * user and must have a hostel_managers pivot assignment.
     */
    private function canManageAllHostels(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'dean']);
    }

    /**
     * Database-level existence check for the manager-to-hostel assignment.
     *
     * exists() avoids loading every managed hostel into memory simply to
     * authorize one request.
     */
    private function managesHostel(User $user, Hostel $hostel): bool
    {
        return $user->managedHostels()
            ->whereKey($hostel->id)
            ->exists();
    }
}
