<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\{Allocation, Room, User};

class RoomPolicy
{
    /**
     * Super admin & dean can view any room in the admin panel.
     * Warden / affiliated admin only see rooms in hostels they manage/own.
     * Role name fixed to 'affiliated_admin' to match RolePermissionSeeder
     * (previously 'affiliated_hostel_admin', which does not exist as a
     * seeded role and silently evaluated to false for every check).
     */
    public function adminView(User $user, Room $room): bool
    {
        if (! $user->can('view rooms')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $room->hostel_id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $room->hostel_id);
        }

        return false;
    }

    /**
     * Students: can only view a room they are currently/actively allocated to.
     * Admin-tier roles fall back to adminView rules.
     * room_number must still be stripped at controller level for student payloads.
     */
    public function view(User $user, Room $room): bool
    {
        if ($this->adminView($user, $room)) {
            return true;
        }

        return Allocation::where('room_id', $room->id)
            ->whereHas('student', fn ($q) => $q->where('user_id', $user->id))
            ->whereIn('status', ['allocated', 'checked_in'])
            ->exists();
    }

    /**
     * Only super_admin, dean, and the warden/affiliated admin of that specific
     * hostel may update a room. Hostel-scoping mirrors adminView to prevent
     * cross-hostel writes.
     */
    public function update(User $user, Room $room): bool
    {
        if (! $user->can('update rooms')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $room->hostel_id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $room->hostel_id);
        }

        return false;
    }

    /**
     * Delete restricted further than update — an affiliated admin can edit
     * their own rooms freely but deleting one risks orphaning active
     * allocations/beds, so it's gated behind the stricter 'delete rooms'
     * permission (granted to warden/affiliated_admin in the seeder, but
     * kept as a distinct policy method for future tightening).
     */
    public function delete(User $user, Room $room): bool
    {
        if (! $user->can('delete rooms')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin'])) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $user->managedHostels()->where('hostels.id', $room->hostel_id)->exists();
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->ownsHostel($user, $room->hostel_id);
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
