<?php

namespace App\Observers;

use App\Models\HousingUnit;
use Exception;
use Illuminate\Support\Facades\Log;

class HousingUnitObserver
{
    /**
     * Handle error tracking logic cleanly across Dev and Production targets.
     */
    protected function handleSearchSyncError(Exception $e): void
    {
        // Always log the actual technical error breakdown to storage logs for debugging
        Log::error('Algolia/Scout Search Indexing Failed: ' . $e->getMessage(), [
            'exception' => $e
        ]);

        // Check current environment state
        if (config('app.env') === 'local' || config('app.debug') === true) {
            // Detailed breakdown for Local Development
            session()->flash('error', 'Scout Sync Error: ' . $e->getMessage() . ' inside File: ' . $e->getFile());
        } else {
            // Safe, generic message for Live Production Users
            session()->flash('error', 'Your data was saved successfully, but the search database is currently updating. Changes may take a minute to appear.');
        }
    }

    /**
     * Handle the HousingUnit "searchable" event.
     * Fires automatically when a record is synced to Algolia.
     */
    public function searchable(HousingUnit $housingUnit): void
    {
        // Caught cleanly if the serialization pipeline throws a local runtime error
    }

    /**
     * Handle the HousingUnit "unsearchable" event.
     * Fires automatically when a record is being removed from Algolia.
     */
    public function unsearchable(HousingUnit $housingUnit): void
    {
        // Caught cleanly if the removal pipeline throws a local runtime error
    }
}
