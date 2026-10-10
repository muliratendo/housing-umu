<?php
// app/Policies/Concerns/ChecksHostelAccess.php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Models\Hostel;
use App\Models\User;

trait ChecksHostelAccess
{
    /**
     * High-trust roles can access every hostel and every record under it.
     */
    protected function canAccessAllHostels(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'dean']);
    }

    /**
     * Determines whether an administrator can access one particular hostel.
     *
     * Warden:
     * - Can manage only campus-managed hostels assigned to them.
     *
     * Affiliated admin:
     * - Can manage only affiliated hostels explicitly assigned to them.
     *
     * IMPORTANT:
     * `managedHostels()` must be a real User relationship backed by a pivot
     * table or another persisted assignment mechanism. Do not replace this
     * with only management_type checks: every affiliated admin would then be
     * able to access every affiliated hostel.
     */
    protected function managesHostel(User $user, Hostel $hostel): bool
    {
        if ($this->canAccessAllHostels($user)) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $hostel->management_type === Hostel::TYPE_CAMPUS
                && $user->managedHostels()
                    ->whereKey($hostel->getKey())
                    ->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $hostel->management_type === Hostel::TYPE_AFFILIATED
                && $user->managedHostels()
                    ->whereKey($hostel->getKey())
                    ->exists();
        }

        return false;
    }
}
