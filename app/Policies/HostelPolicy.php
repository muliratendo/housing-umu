<?php
// File: app/Policies/HostelPolicy.php

declare(strict_types=1);

namespace App\Policies;

use App\Models\{Hostel, User};
use Illuminate\Auth\Access\HandlesAuthorization;

class HostelPolicy
{
    use HandlesAuthorization;

    /**
     * Gate for accessing the hostel index/listing screen at all.
     * Object-level scoping (which specific hostels appear) is handled by
     * AdminScope::hostelsFor() in the controller, not here.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view hostels');
    }

    /**
     * Super admin & dean can view any hostel in the admin panel.
     * Warden can view hostels they actively manage (managedHostels() pivot).
     * Affiliated admin can view only the hostel(s) they own/manage.
     */
    public function adminView(User $user, Hostel $hostel): bool
    {
        if (! $user->can('view hostels')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $hostel->id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $hostel);
        }

        return false;
    }

    /**
     * General view: admin-tier roles fall back to adminView() with proper
     * per-hostel ownership scoping (fixes the earlier bug where warden/
     * affiliated_admin were checked only against a blanket management_type
     * string, letting a warden view ANY campus-managed hostel rather than
     * only the ones they specifically manage).
     *
     * Students can view any active hostel in the public/browsing catalogue.
     * Gender-scope and window-open filtering happen at the query level in
     * HostelController — this only gates raw record visibility.
     */
    public function view(User $user, Hostel $hostel): bool
    {
        if ($this->adminView($user, $hostel)) {
            return true;
        }

        return $user->hasRole('student') && $hostel->is_active !== false;
    }

    /**
     * Only super_admin can create new hostels — this is an MVP restriction
     * since onboarding a new hostel (campus or affiliated) requires
     * verifying legal/ownership documentation outside the system.
     */
    public function create(User $user): bool
    {
        return $user->can('create hostels') && $user->hasAnyRole(['admin', 'super_admin']);
    }

    /**
     * Update: super_admin/dean unrestricted. Warden scoped to managed
     * hostels. Affiliated admin scoped to hostels they own — this is the
     * critical ownership check: an affiliated admin must never be able to
     * edit another affiliated admin's hostel.
     */
    public function update(User $user, Hostel $hostel): bool
    {
        if (! $user->can('update hostels')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $hostel->id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $hostel);
        }

        return false;
    }

    /**
     * Delete: intentionally more restrictive than update. Affiliated
     * admins cannot delete their own hostel (would orphan students with
     * active allocations) — only super_admin can, after archival checks
     * are handled in the service layer.
     */
    public function delete(User $user, Hostel $hostel): bool
    {
        return $user->can('delete hostels') && $user->hasAnyRole(['admin', 'super_admin']);
    }

    /**
     * Gate for occupancy/report screens — kept as its own permission check
     * since 'view reports' is granted independently of 'view hostels' in
     * the role seeder (e.g. dean has 'view reports' but limited hostel CRUD).
     */
    public function viewReports(User $user): bool
    {
        return $user->can('view reports');
    }

    /**
     * Central ownership check. Supports either a direct hostel_id column
     * on User (single-hostel affiliated admins) or a managedHostels()
     * pivot (multi-hostel affiliated admins) — checks both so the policy
     * keeps working regardless of which relationship pattern the app
     * settles on.
     */
    private function ownsHostel(User $user, Hostel $hostel): bool
    {
        if (isset($user->hostel_id) && $user->hostel_id === $hostel->id) {
            return true;
        }

        if (method_exists($user, 'managedHostels')) {
            return $user->managedHostels()->where('hostels.id', $hostel->id)->exists();
        }

        return false;
    }
}
