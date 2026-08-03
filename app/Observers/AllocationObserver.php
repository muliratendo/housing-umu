<?php
// File: app/Observers/AllocationObserver.php
//
// This single observer class serves THREE observer targets:
//   1. Hostel + Room models  → flush public hostel cache + sync Scout/Algolia search
//   2. Allocation model      → bed status transitions, waitlist promotion (BR-8),
//                              and flushing the OccupancyMetricsService landing snapshot
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

use App\Models\{AcademicTerm, Allocation, Bed, Hostel};
use App\Services\Housing\AllocationService;
use App\Services\OccupancyMetricsService;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AllocationObserver
{
    public function __construct(private readonly AllocationService $allocationService) {}

    // ── Shared "saved" hook (Hostel / Room / Allocation) ──────────────────────
    // Fires for any model this observer is attached to. flushPublicCache() and
    // syncSearch() are both idempotent/no-op safe when irrelevant to the model,
    // so this is harmless when triggered by an Allocation save.

    public function saved(object $model): void
    {
        $this->flushPublicCache();
        $this->syncSearch($model);
    }

    // ── Shared "created" hook (Hostel / Room / Allocation) ─────────────────────
    // Loosely typed to `object` because this observer is attached to three
    // different models — Laravel's dispatcher calls created() for ANY of
    // them, so a strict Allocation type hint here throws a TypeError the
    // moment a Hostel or Room is created (e.g. during seeding).
    // Only Allocation creation needs real handling; Hostel/Room creation
    // is a harmless no-op fallthrough.

    public function created(object $model): void
    {
        if (! $model instanceof Allocation) {
            return;
        }

        if ($model->status === Allocation::STATUS_ALLOCATED && $model->bed_id) {
            Bed::where('id', $model->bed_id)->update(['status' => Bed::STATUS_OCCUPIED]);
            $model->bed?->room?->syncAvailability();
        }

        $this->flushOccupancy();
    }

    // ── Shared "updated" hook (Hostel / Room / Allocation) ─────────────────────
    // Same TypeError risk as created() — this observer is attached to
    // Hostel/Room too, so the parameter must accept `object` and narrow
    // internally rather than being strictly typed to Allocation.
    // When status flips to checked_out|evicted|cancelled: free the bed, promote
    // the next waitlisted applicant (DA5/BR-8), and flush cached occupancy
    // metrics. Any other status change still triggers an occupancy flush so
    // admin dashboards stay accurate without needing a bed-status transition.

    public function updated(object $model): void
    {
        if (! $model instanceof Allocation) {
            return;
        }

        $allocation = $model;

        if (! $allocation->wasChanged('status')) {
            return;
        }

        $old = $allocation->getOriginal('status');
        $new = $allocation->status;

        $terminalStatuses = [
            Allocation::STATUS_CHECKED_OUT,
            Allocation::STATUS_EVICTED,
            Allocation::STATUS_CANCELLED,
        ];

        if (in_array($new, $terminalStatuses, true) && $old !== $new) {
            if ($allocation->bed_id) {
                Bed::where('id', $allocation->bed_id)->update(['status' => Bed::STATUS_AVAILABLE]);
                $allocation->bed?->room?->syncAvailability();
            }

            $this->promoteWaitlistFor($allocation);
        }

        $this->flushOccupancy();
    }

    // ── Shared "deleted" hook (Hostel / Room / Allocation) ─────────────────────
    // Handles cache/search cleanup for Hostel/Room, and additionally frees the
    // bed + flushes occupancy metrics if an Allocation record is hard-deleted
    // (e.g. via admin cleanup tooling) rather than soft-transitioned to
    // checked_out/evicted/cancelled.

    public function deleted(object $model): void
    {
        $this->flushPublicCache();
        $this->unsyncSearch($model);

        if ($model instanceof Allocation) {
            if ($model->bed_id) {
                Bed::where('id', $model->bed_id)->update(['status' => Bed::STATUS_AVAILABLE]);
                $model->bed?->room?->syncAvailability();
            }

            $this->promoteWaitlistFor($model);
            $this->flushOccupancy();
        }
    }

    // ── Waitlist promotion helper ───────────────────────────────────────────────
    // AllocationService::promoteNextWaitlisted() expects a Hostel model
    // instance (not a raw hostel_id int) as its first argument. Resolving
    // via the hostel() relation also guards against a stale/missing
    // hostel_id silently promoting against the wrong hostel.

    private function promoteWaitlistFor(Allocation $allocation): void
    {
        $hostel = $allocation->hostel ?? Hostel::find($allocation->hostel_id);
        $term   = $allocation->academicTerm ?? AcademicTerm::find($allocation->academic_term_id);

        if (! $hostel instanceof Hostel) {
            Log::warning('AllocationObserver: could not resolve Hostel for waitlist promotion.', [
                'allocation_id' => $allocation->id,
                'hostel_id'     => $allocation->hostel_id,
            ]);

            return;
        }

        if (! $term instanceof AcademicTerm) {
            Log::warning('AllocationObserver: could not resolve AcademicTerm for waitlist promotion.', [
                'allocation_id'    => $allocation->id,
                'academic_term_id' => $allocation->academic_term_id,
            ]);

            return;
        }

        $this->allocationService->promoteNextWaitlisted($hostel, $term);
    }

    // ── Cache helpers ───────────────────────────────────────────────────────────

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

    // ── Scout / Algolia sync ─────────────────────────────────────────────────────

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
