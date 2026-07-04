<?php
// File: app/Policies/RoomPolicy.php  NEW.
// Register in AppServiceProvider: Gate::policy(Room::class, RoomPolicy::class);
//
// Students can only view rooms they are currently allocated to.
// room_number is filtered out at controller level — never passed to student Inertia props.
declare(strict_types=1);
namespace App\Policies;
use App\Models\{Allocation, Room, User};

class RoomPolicy {
    /** Admin/warden/dean can view any room including room_number. */
    public function adminView(User $user, Room $room): bool {
        return $user->hasAnyRole(['admin','super_admin','warden','affiliated_admin','dean']);
    }
    /** Students: only their actively allocated room. room_number still filtered in controller. */
    public function view(User $user, Room $room): bool {
        if ($user->hasAnyRole(['admin','super_admin','warden','affiliated_admin','dean'])) return true;
        return Allocation::where('room_id', $room->id)
            ->whereHas('student', fn($q) => $q->where('user_id', $user->id))
            ->whereIn('status',['allocated','checked_in'])
            ->exists();
    }
    public function update(User $user, Room $room): bool {
        return $user->hasAnyRole(['admin','super_admin','warden','affiliated_admin']);
    }
}
