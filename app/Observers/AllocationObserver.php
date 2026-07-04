<?php
// File: app/Observers/AllocationObserver.php
//
// This observer handles TWO observer targets:
//   1. Hostel + Room models  → flushes public hostel cache + syncs Scout/Algolia
//   2. Allocation model      → flushes OccupancyMetricsService landing snapshot cache
//
// Register ALL THREE in AppServiceProvider::boot():
//
//   use App\Models\{Hostel, Room, Allocation};
//   use App\Observers\AllocationObserver;
//
//   Hostel::observe(AllocationObserver::class);
//   Room::observe(AllocationObserver::class);
//   Allocation::observe(AllocationObserver::class);

declare(strict_types=1);

namespace App\Observers;

use App\Models\Allocation;
use App\Services\OccupancyMetricsService;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AllocationObserver
{
    // ── Hostel / Room hooks ───────────────────────────────────────────────────
    // These fire for any model this observer is attached to.
    // When attached to Allocation they are harmless — flushPublicCache() is
    // idempotent and syncSearch() no-ops when the model has no searchable().

    public function saved(object $model): void
    {
        $this->flushPublicCache();
        $this->syncSearch($model);
    }

    // ── Allocation-specific hooks ─────────────────────────────────────────────
    // Typed against App\Models\Allocation so Laravel only dispatches these
    // when the observer is attached to the Allocation model.

    public function created(Allocation $allocation): void
    {
        $this->flushOccupancy();
    }

    public function updated(Allocation $allocation): void
    {
        if ($allocation->wasChanged('status')) {
            $this->flushOccupancy();
        }
    }

    // ── Shared deleted hook ───────────────────────────────────────────────────
    // Handles both Hostel/Room (cache + unsync) and Allocation (occupancy flush).
    // The `object` type hint accepts any model.

    public function deleted(object $model): void
    {
        $this->flushPublicCache();
        $this->unsyncSearch($model);

        if ($model instanceof Allocation) {
            $this->flushOccupancy();
        }
    }

    // ── Cache helpers ─────────────────────────────────────────────────────────

    private function flushPublicCache(): void
    {
        try {
            Cache::tags(['public_hostels'])->flush();
        } catch (Exception) {
            // Tagged cache unavailable (e.g. array driver in tests) — safe to skip.
        }
    }

    private function flushOccupancy(): void
    {
        app(OccupancyMetricsService::class)->flush();
    }

    // ── Scout / Algolia sync ──────────────────────────────────────────────────

    private function syncSearch(object $model): void
    {
        try {
            if (method_exists($model, 'searchable')) {
                $model->searchable();
            }
        } catch (Exception $e) {
            $this->handleSearchSyncError($e);
        }
    }

    private function unsyncSearch(object $model): void
    {
        try {
            if (method_exists($model, 'unsearchable')) {
                $model->unsearchable();
            }
        } catch (Exception $e) {
            $this->handleSearchSyncError($e);
        }
    }

    private function handleSearchSyncError(Exception $e): void
    {
        Log::error('Algolia/Scout Search Indexing Failed: ' . $e->getMessage(), [
            'exception' => $e,
        ]);

        $message = (config('app.debug') === true)
            ? 'Scout Sync Error: ' . $e->getMessage() . ' in ' . $e->getFile()
            : 'Your data was saved successfully, but the search index is currently updating. Changes may take a moment to appear.';

        session()->flash('error', $message);
    }
}
