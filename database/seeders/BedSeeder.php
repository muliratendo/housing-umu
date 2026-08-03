<?php
// database/seeders/BedSeeder.php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class BedSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * chunk() instead of all()->each() so we never hold every Room +
         * its beds in memory at once, and so each batch's queries are
         * grouped tightly together rather than interleaved across the
         * full result set. On a high-latency connection like Aiven's free
         * tier this doesn't reduce query COUNT, but it does make the
         * command's progress readable via the counter below instead of
         * appearing to hang for the full duration.
         */
        $total = Room::count();
        $processed = 0;

        Room::chunk(50, function ($rooms) use (&$processed, $total) {
            foreach ($rooms as $room) {
                $room->syncBeds();
                $room->syncAvailability();
                $processed++;
            }
            $this->command?->info("Synced beds for {$processed}/{$total} rooms...");
        });

        $this->command->info('Beds synced for ' . $total . ' rooms.');
    }
}
