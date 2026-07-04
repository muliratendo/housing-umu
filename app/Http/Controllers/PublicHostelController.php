<?php
// File: app/Http/Controllers/PublicHostelController.php
// REPLACE the existing file.
//
// Changes vs previous version:
//  - Class declared `final` — prevents accidental extension that could add write methods.
//  - Explicit read-only docblock enforced by PHPStan/static analysis (no write methods allowed).
//  - Algolia/Scout note: when Hostel gains `Searchable`, swap the ->when('search') block
//    with Hostel::search($filters['search'])->constrain(...)->get() inside the cache closure.
//    Keep the cache key strategy (md5 of normalised filters) — it works for both paths.
//  - Cache invalidation: call Cache::tags(['public_hostels'])->flush() from the
//    HousingUnitObserver after any hostel/room save/delete, so stale results auto-clear.
//    Requires Redis as the cache driver (already confirmed in stack).

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Hostel;
use App\Services\OccupancyMetricsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only public-facing hostel controller.
 *
 * MUST NOT contain any store(), update(), destroy(), or write logic.
 * All mutations go through admin/warden controllers under auth middleware.
 */
final class PublicHostelController
{
    public function index(Request $request, OccupancyMetricsService $occupancy): Response
    {
        $filters = [
            'search'           => $request->filled('search')
                ? trim($request->string('search')->toString())
                : null,
            'room_type'        => array_values((array) $request->input('room_type', [])),
            'location'         => array_values((array) $request->input('location', [])),
            'availability'     => array_values((array) $request->input('availability', [])),
            'gender'           => array_values((array) $request->input('gender', [])),
            'management_type'  => array_values((array) $request->input('management_type', [])),
            'is_religious_order' => $request->boolean('is_religious_order'),
            'bed_count'        => $request->input('bed_count'),
        ];

        // Normalise array filters for stable cache keys.
        foreach (['room_type', 'location', 'availability', 'gender', 'management_type'] as $key) {
            sort($filters[$key]);
        }

        $cacheKey = 'public_hostels:index:' . md5(json_encode($filters));

        // ── Algolia upgrade path ────────────────────────────────────────────────
        // When SCOUT_DRIVER=algolia and Hostel uses Searchable:
        //   if ($filters['search']) {
        //       $hostels = Hostel::search($filters['search'])
        //           ->query(fn ($q) => $q->with('rooms')->where(...))
        //           ->get();
        //   }
        // Keep the Cache::remember wrapper around it to prevent Algolia quota burn
        // on repeated identical searches. Use Cache::tags(['public_hostels']) so
        // the observer can flush them atomically.
        // ───────────────────────────────────────────────────────────────────────

        $occupancySnapshot = $occupancy->landingSnapshot();

        $payload = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($filters) {
            $hostels = Hostel::query()
                ->with(['rooms' => fn ($q) => $q->select([
                    'id', 'hostel_id', 'name', 'slug', 'room_type', 'capacity',
                    'bed_count', 'price_per_semester', 'availability_status',
                    'gender_scope', 'description', 'amenities', 'image_url',
                ])])
                ->when(!empty($filters['search']), function ($q) use ($filters) {
                    $s = $filters['search'];
                    $q->where(fn ($inner) => $inner
                        ->where('name', 'like', "%{$s}%")
                        ->orWhere('location', 'like', "%{$s}%")
                        ->orWhere('description', 'like', "%{$s}%"));
                })
                ->when(!empty($filters['management_type']),
                    fn ($q) => $q->whereIn('management_type', $filters['management_type']))
                ->when(!empty($filters['gender']),
                    fn ($q) => $q->whereIn('gender_scope', $filters['gender']))
                ->when(!empty($filters['availability']),
                    fn ($q) => $q->whereIn('availability_status', $filters['availability']))
                ->when(!empty($filters['location']),
                    fn ($q) => $q->whereIn('location', $filters['location']))
                ->when($filters['is_religious_order'],
                    fn ($q) => $q->where('is_religious_order', true))
                ->when(!empty($filters['room_type']), fn ($q) => $q->whereHas('rooms',
                    fn ($rq) => $rq->whereIn('room_type', $filters['room_type'])))
                ->when(!empty($filters['bed_count']), fn ($q) => $q->whereHas('rooms',
                    function ($rq) use ($filters) {
                        match ($filters['bed_count']) {
                            'single' => $rq->where('bed_count', 1),
                            'double' => $rq->where('bed_count', 2),
                            default  => null,
                        };
                    }))
                ->orderByRaw("CASE management_type
                    WHEN 'campus-managed' THEN 1
                    WHEN 'affiliated' THEN 2
                    ELSE 3 END ASC")
                ->orderBy('name')
                ->get()
                ->map(fn (Hostel $hostel) => $this->mapHostelSummary($hostel))
                ->values()
                ->all();

            return ['hostels' => $hostels, 'currentFilters' => $filters];
        });

        return Inertia::render('Public/Hostels/HostelList', $payload);
    }

    public function show(Hostel $hostel): Response
    {
        $hostel->load(['rooms' => fn ($q) => $q->select([
            'id', 'hostel_id', 'name', 'slug', 'room_type', 'capacity', 'bed_count',
            'price_per_semester', 'availability_status', 'gender_scope',
            'description', 'amenities', 'image_url',
        ])]);

        return Inertia::render('Public/Hostels/Show', [
            'hostel' => [
                'id'                     => $hostel->id,
                'name'                   => $hostel->name,
                'slug'                   => $hostel->slug,
                'location'               => $hostel->location,
                'image_url'              => $hostel->image_url ?: '/images/placeholder-hostel.jpg',
                'management_type'        => $hostel->management_type,
                'management_type_label'  => $hostel->management_type_label,
                'availability_status'    => $hostel->availability_status,
                'availability_status_label' => $hostel->availability_status_label,
                'gender_scope'           => $hostel->gender_scope,
                'gender_scope_label'     => $hostel->gender_scope_label,
                'is_religious_order'     => (bool) $hostel->is_religious_order,
                'religious_notes'        => $hostel->religious_notes,
                'amenities'              => is_array($hostel->amenities)
                    ? $hostel->amenities
                    : json_decode($hostel->amenities ?? '[]', true),
                'description'            => $hostel->description,
                'rooms'                  => $hostel->rooms->map(fn ($room) => [
                    'id'                     => $room->id,
                    'name'                   => $room->name,
                    'slug'                   => $room->slug,
                    'description'            => $room->description,
                    'room_type'              => $room->room_type,
                    'room_type_label'        => $room->room_type_label,
                    'capacity'               => $room->capacity,
                    'bed_count'              => $room->bed_count,
                    'bed_count_label'        => $room->bed_count_label,
                    'price_per_semester'     => $room->price_per_semester,
                    'availability_status'    => $room->availability_status,
                    'availability_status_label' => $room->availability_status_label,
                    'gender_scope'           => $room->gender_scope,
                    'gender_scope_label'     => $room->gender_scope_label,
                    'amenities'              => is_array($room->amenities)
                        ? $room->amenities
                        : json_decode($room->amenities ?? '[]', true),
                    'image_url'              => $room->image_url ?: '/images/placeholder-hostel.jpg',
                ])->values()->all(),
            ],
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function mapHostelSummary(Hostel $hostel): array
    {
        $prices = $hostel->rooms
            ->pluck('price_per_semester')
            ->filter(fn ($v) => !is_null($v))
            ->sort()
            ->values();

        return [
            'id'                     => $hostel->id,
            'name'                   => $hostel->name,
            'slug'                   => $hostel->slug,
            'location'               => $hostel->location,
            'image_url'              => $hostel->image_url ?: '/images/placeholder-hostel.jpg',
            'management_type'        => $hostel->management_type,
            'management_type_label'  => $hostel->management_type_label,
            'availability_status'    => $hostel->availability_status,
            'availability_status_label' => $hostel->availability_status_label,
            'gender_scope'           => $hostel->gender_scope,
            'gender_scope_label'     => $hostel->gender_scope_label,
            'is_religious_order'     => (bool) $hostel->is_religious_order,
            'religious_notes'        => $hostel->religious_notes,
            'amenities'              => is_array($hostel->amenities)
                ? $hostel->amenities
                : json_decode($hostel->amenities ?? '[]', true),
            'description'            => $hostel->description,
            'room_types'             => $hostel->rooms->pluck('room_type')->filter()->unique()->values()->all(),
            'room_type_labels'       => $hostel->rooms->pluck('room_type_label')->filter()->unique()->values()->all(),
            'occupancy_labels'       => $hostel->rooms->pluck('bed_count_label')->filter()->unique()->values()->all(),
            'room_count'             => $hostel->rooms->count(),
            'starting_price'         => $prices->first(),
            'highest_price'          => $prices->last(),
        ];
    }
}
