<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\{Application, User};

class ApplicationPolicy
{
    /**
     * Determine whether the user can view the specific application record.
     */
    public function view(User $user, Application $application): bool
    {
        if (! $user->can('view applications')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $application->hostel_id)->exists();
        }

        // Fixed: original checked $application->hostel->managed_by against
        // $user->id, but Hostel has no 'managed_by' column in the schema —
        // ownership is derived the same way as HostelPolicy/RoomPolicy.
        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $application->hostel_id);
        }

        // Students can ONLY view their own application records.
        return $user->id === $application->student?->user_id;
    }

    /**
     * Determine whether the user can modify the application.
     */
    public function update(User $user, Application $application): bool
    {
        if (! $user->can('update applications')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $application->hostel_id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $application->hostel_id);
        }

        // Students can only update their own application while it's still
        // pending — once processed/allocated/rejected it's locked.
        return $user->id === $application->student?->user_id
            && $application->status === 'pending';
    }

    /**
     * Process (approve/reject/waitlist) is a distinct, higher-privilege
     * action from a generic update — separated so routes can gate on the
     * 'process applications' permission specifically.
     */
    public function process(User $user, Application $application): bool
    {
        if (! $user->can('process applications')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $application->hostel_id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $application->hostel_id);
        }

        return false;
    }

    private function ownsHostel(User $user, int $hostelId): bool
    {
        if (isset($user->hostel_id) && $user->hostel_id === $hostelId) {
            return true;
        }

        if (method_exists($user, 'managedHostels')) {
            return $user->managedHostels()->where('hostels.id', $hostelId)->exists();
        }

        return false;
    }
}
