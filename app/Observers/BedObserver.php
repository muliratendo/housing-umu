<?php
// app/Observers/BedObserver.php — NEW FILE

declare(strict_types=1);

namespace App\Observers;

use App\Models\Bed;
use Illuminate\Support\Facades\Cache;

class BedObserver
{
    /** After any bed change, re-sync the parent room's availability. */
    public function updated(Bed $bed): void
    {
        // Only re-sync when status actually changed
        if ($bed->wasChanged('status')) {
            $bed->room->syncAvailability();
            $this->flushRoomCache($bed->room_id);
        }
    }

    public function created(Bed $bed): void
    {
        $this->flushRoomCache($bed->room_id);
    }

    public function deleted(Bed $bed): void
    {
        $this->flushRoomCache($bed->room_id);
    }

    private function flushRoomCache(int $roomId): void
    {
        Cache::forget("room_detail:{$roomId}");
        Cache::forget('occupancy_metrics:landing'); // invalidate landing page cache
    }
}
