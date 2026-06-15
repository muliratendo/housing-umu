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

    public function saved(HousingUnit $housingUnit): void
    {
        try {
            // Triggers asynchronous queue serialization
            $housingUnit->queueMakeSearchable();
        } catch (Exception $e) {
            $this->handleSearchSyncError($e);
        }
    }


    /**
     * Handle the HousingUnit "created" event.
     */
    public function created(HousingUnit $housingUnit): void
    {
        //
    }

    /**
     * Handle the HousingUnit "updated" event.
     */
    public function updated(HousingUnit $housingUnit): void
    {
        //
    }

    /**
     * Handle the HousingUnit "deleted" event.
     */
    public function deleted(HousingUnit $housingUnit): void
    {
        try {
            $housingUnit->queueRemoveFromSearch();
        } catch (Exception $e) {
            $this->handleSearchSyncError($e);
        }
    }

    /**
     * Handle the HousingUnit "restored" event.
     */
    public function restored(HousingUnit $housingUnit): void
    {
        //
    }

    /**
     * Handle the HousingUnit "force deleted" event.
     */
    public function forceDeleted(HousingUnit $housingUnit): void
    {
        //
    }
}
