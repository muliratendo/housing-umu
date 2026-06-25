<?php

namespace App\Http\Controllers;

use App\Models\Hostel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class PublicHostelController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->filled('search')
                ? trim($request->string('search')->toString())
                : null,
            'room_type' => array_values((array) $request->input('room_type', [])),
            'location' => array_values((array) $request->input('location', [])),
            'availability' => array_values((array) $request->input('availability', [])),
            'gender' => array_values((array) $request->input('gender', [])),
            'management_type' => array_values((array) $request->input('management_type', [])),
            'is_religious_order' => $request->boolean('is_religious_order'),
            'bed_count' => $request->input('bed_count'),
        ];

        sort($filters['room_type']);
        sort($filters['location']);
        sort($filters['availability']);
        sort($filters['gender']);
        sort($filters['management_type']);

        $cacheKey = 'public_hostels:index:' . md5(json_encode($filters));

        $payload = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($filters) {
            $hostels = Hostel::query()
                ->with(['rooms' => function ($query) {
                    $query->select([
                        'id',
                        'hostel_id',
                        'name',
                        'slug',
                        'room_type',
                        'capacity',
                        'bed_count',
                        'price_per_semester',
                        'availability_status',
                        'gender_scope',
                        'description',
                        'amenities',
                        'image_url',
                    ]);
                }])
                ->when(!empty($filters['search']), function ($query) use ($filters) {
                    $search = $filters['search'];

                    $query->where(function ($inner) use ($search) {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhere('location', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                })
                ->when(!empty($filters['management_type']), function ($query) use ($filters) {
                    $query->whereIn('management_type', $filters['management_type']);
                })
                ->when(!empty($filters['gender']), function ($query) use ($filters) {
                    $query->whereIn('gender_scope', $filters['gender']);
                })
                ->when(!empty($filters['availability']), function ($query) use ($filters) {
                    $query->whereIn('availability_status', $filters['availability']);
                })
                ->when(!empty($filters['location']), function ($query) use ($filters) {
                    $query->whereIn('location', $filters['location']);
                })
                ->when($filters['is_religious_order'], function ($query) {
                    $query->where('is_religious_order', true);
                })
                ->when(!empty($filters['room_type']), function ($query) use ($filters) {
                    $query->whereHas('rooms', function ($roomQuery) use ($filters) {
                        $roomQuery->whereIn('room_type', $filters['room_type']);
                    });
                })
                ->when(!empty($filters['bed_count']), function ($query) use ($filters) {
                    $query->whereHas('rooms', function ($roomQuery) use ($filters) {
                        if ($filters['bed_count'] === 'single') {
                            $roomQuery->where('bed_count', 1);
                        }

                        if ($filters['bed_count'] === 'double') {
                            $roomQuery->where('bed_count', 2);
                        }
                    });
                })
                ->orderByRaw("
                    CASE management_type
                        WHEN 'campus-managed' THEN 1
                        WHEN 'affiliated' THEN 2
                        ELSE 3
                    END asc
                ")
                ->orderBy('name', 'asc')
                ->get()
                ->map(function (Hostel $hostel) {
                    $roomTypes = $hostel->rooms
                        ->pluck('room_type')
                        ->filter()
                        ->unique()
                        ->values();

                    $roomTypeLabels = $hostel->rooms
                        ->pluck('room_type_label')
                        ->filter()
                        ->unique()
                        ->values();

                    $occupancyLabels = $hostel->rooms
                        ->pluck('bed_count_label')
                        ->filter()
                        ->unique()
                        ->values();

                    $prices = $hostel->rooms
                        ->pluck('price_per_semester')
                        ->filter(fn ($value) => !is_null($value))
                        ->sort()
                        ->values();

                    return [
                        'id' => $hostel->id,
                        'name' => $hostel->name,
                        'slug' => $hostel->slug,
                        'location' => $hostel->location,
                        'image_url' => $hostel->image_url ?: '/images/placeholder-hostel.jpg',
                        'management_type' => $hostel->management_type,
                        'management_type_label' => $hostel->management_type_label,
                        'availability_status' => $hostel->availability_status,
                        'availability_status_label' => $hostel->availability_status_label,
                        'gender_scope' => $hostel->gender_scope,
                        'gender_scope_label' => $hostel->gender_scope_label,
                        'is_religious_order' => (bool) $hostel->is_religious_order,
                        'religious_notes' => $hostel->religious_notes,
                        'amenities' => is_array($hostel->amenities)
                            ? $hostel->amenities
                            : json_decode($hostel->amenities ?? '[]', true),
                        'description' => $hostel->description,
                        'room_types' => $roomTypes->all(),
                        'room_type_labels' => $roomTypeLabels->all(),
                        'occupancy_labels' => $occupancyLabels->all(),
                        'room_count' => $hostel->rooms->count(),
                        'starting_price' => $prices->first(),
                        'highest_price' => $prices->last(),
                    ];
                })
                ->values()
                ->all();

            return [
                'hostels' => $hostels,
                'currentFilters' => $filters,
            ];
        });

        return Inertia::render('Public/Hostels/HostelList', $payload);
    }

    public function show(Hostel $hostel): Response
    {
        $hostel->load([
            'rooms' => fn ($query) => $query->select([
                'id',
                'hostel_id',
                'name',
                'slug',
                'room_type',
                'capacity',
                'bed_count',
                'price_per_semester',
                'availability_status',
                'gender_scope',
                'description',
                'amenities',
                'image_url',
            ]),
        ]);

        return Inertia::render('Public/Hostels/Show', [
            'hostel' => [
                'id' => $hostel->id,
                'name' => $hostel->name,
                'slug' => $hostel->slug,
                'location' => $hostel->location,
                'image_url' => $hostel->image_url ?: '/images/placeholder-hostel.jpg',
                'management_type' => $hostel->management_type,
                'management_type_label' => $hostel->management_type_label,
                'availability_status' => $hostel->availability_status,
                'availability_status_label' => $hostel->availability_status_label,
                'gender_scope' => $hostel->gender_scope,
                'gender_scope_label' => $hostel->gender_scope_label,
                'is_religious_order' => (bool) $hostel->is_religious_order,
                'religious_notes' => $hostel->religious_notes,
                'amenities' => is_array($hostel->amenities)
                    ? $hostel->amenities
                    : json_decode($hostel->amenities ?? '[]', true),
                'description' => $hostel->description,
                'rooms' => $hostel->rooms->map(fn ($room) => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'slug' => $room->slug,
                    'description' => $room->description,
                    'room_type' => $room->room_type,
                    'room_type_label' => $room->room_type_label,
                    'capacity' => $room->capacity,
                    'bed_count' => $room->bed_count,
                    'bed_count_label' => $room->bed_count_label,
                    'price_per_semester' => $room->price_per_semester,
                    'availability_status' => $room->availability_status,
                    'availability_status_label' => $room->availability_status_label,
                    'gender_scope' => $room->gender_scope,
                    'gender_scope_label' => $room->gender_scope_label,
                    'amenities' => is_array($room->amenities)
                        ? $room->amenities
                        : json_decode($room->amenities ?? '[]', true),
                    'image_url' => $room->image_url ?: '/images/placeholder-hostel.jpg',
                ])->values()->all(),
            ],
        ]);
    }
}
