<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    /**
     * Determine whether the user can view the specific application record.
     */
    public function view(User $user, Application $application): bool
    {
        // 1. If they don't have the baseline permission at all, block them immediately
        if (! $user->can('view applications')) {
            return false;
        }

        // 2. High-level roles can view ANY application record
        if ($user->hasAnyRole(['admin', 'super_admin', 'warden', 'dean'])) {
            return true;
        }

        // 3. Private admins can view if it belongs to an affiliated hostel they manage
        if ($user->hasRole('affiliated_admin')) {
            return $user->id === $application->hostel->managed_by;
        }

        // 4. Students can ONLY view their own application profile records
        return $user->id === $application->user_id;
    }

    /**
     * Determine whether the user can modify the application.
     */
    public function update(User $user, Application $application): bool
    {
        if (! $user->can('update applications')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'warden'])) {
            return true;
        }

        // Students can only update their own file if it hasn't been locked or processed yet
        return $user->id === $application->user_id && $application->status === 'pending';
    }
}
