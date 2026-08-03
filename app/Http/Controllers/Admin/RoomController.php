<?php
// File: app/Http/Controllers/Admin/RoomController.php
declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Bed, Hostel, Room};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\{Inertia, Response};

class RoomController extends Controller
{
    /** Admin room detail — all beds, statuses, current allocations. */
    public function show(Room $room): Response
    {
        $this->authorize('adminView', $room);

        $room->load([
            'hostel',
            'beds.allocations' => fn ($q) => $q->with('student.user')->latest(),
        ]);

        return Inertia::render('Admin/Rooms/Show', [
            'room' => $this->adminRoomShape($room),
        ]);
    }

    public function create(Hostel $hostel): Response
    {
        $this->authorize('create', Room::class);

        return Inertia::render('Admin/Rooms/Form', [
            'hostel' => $hostel->only(['id', 'name', 'slug']),
            'room'   => null,
        ]);
    }

    public function store(Request $request, Hostel $hostel): RedirectResponse
    {
        $this->authorize('create', Room::class);

        $validated = $this->validateRoom($request);

        $room = DB::transaction(function () use ($hostel, $validated) {
            $room = $hostel->rooms()->create($validated);
            // syncBeds() creates exactly `capacity` beds (Bed A, Bed B, ...)
            // — see Room model. This is what ties bed count to capacity
            // structurally rather than letting them drift apart.
            $room->syncBeds();
            $room->syncAvailability();
            return $room;
        });

        return redirect()->route('admin.rooms.show', $room)->with('success', "Room '{$room->name}' created.");
    }

    public function edit(Room $room): Response
    {
        $this->authorize('update', $room);

        $room->load('hostel:id,name,slug');

        return Inertia::render('Admin/Rooms/Form', [
            'hostel' => $room->hostel->only(['id', 'name', 'slug']),
            'room'   => $room->only([
                'id', 'name', 'room_number', 'room_type', 'capacity',
                'price_per_semester', 'gender_scope', 'description', 'amenities', 'is_active',
            ]),
        ]);
    }

    public function update(Request $request, Room $room): RedirectResponse
    {
        $this->authorize('update', $room);

        $validated = $this->validateRoom($request, $room);
        $capacityChanged = $validated['capacity'] !== $room->capacity;

        DB::transaction(function () use ($room, $validated, $capacityChanged) {
            $room->update($validated);
            if ($capacityChanged) {
                // syncBeds() only ADDS beds when growing capacity, and
                // only removes trailing beds when shrinking IF they
                // aren't occupied/reserved — see Room model — so this
                // can't silently orphan an occupied bed.
                $room->syncBeds();
                $room->syncAvailability();
            }
        });

        return redirect()->route('admin.rooms.show', $room)->with('success', "Room '{$room->name}' updated.");
    }

    /**
     * Toggle room capacity 1 ↔ 2 (single ↔ double).
     * Cannot downgrade while more than one bed is occupied/reserved.
     */
    public function toggleCapacity(Request $request, Room $room): RedirectResponse
    {
        $this->authorize('update', $room);

        $newCapacity = $room->capacity === 1 ? 2 : 1;

        if ($newCapacity === 1) {
            $occupiedCount = $room->beds()
                ->whereIn('status', [Bed::STATUS_OCCUPIED, Bed::STATUS_RESERVED])
                ->count();

            if ($occupiedCount > 1) {
                return back()->with('error', 'Cannot convert to single: multiple beds are occupied or reserved.');
            }
        }

        DB::transaction(function () use ($room, $newCapacity) {
            $room->update(['capacity' => $newCapacity]);
            $room->syncBeds();
            $room->syncAvailability();
        });

        return back()->with('success', "Room converted to {$newCapacity}-bed occupancy.");
    }

    /**
     * A7 — Beds List | GET /admin/rooms/{room}/beds
     * Feeds Admin/Rooms/Beds.tsx. Uses activeAllocation (single current
     * occupant) rather than the full allocation history loaded by show().
     */
    public function beds(Room $room): Response
    {
        $this->authorize('adminView', $room);

        $room->load(['hostel:id,name,slug,management_type']);

        $beds = $room->beds()
            ->with(['activeAllocation.student.user:id,name,email'])
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Bed $b) => [
                'id'           => $b->id,
                'label'        => $b->label,
                'status'       => $b->status,
                'status_label' => $b->status_label,
                'sort_order'   => $b->sort_order,
                'occupant'     => $b->activeAllocation?->student?->user
                    ? [
                        'id'    => $b->activeAllocation->student->user->id,
                        'name'  => $b->activeAllocation->student->user->name,
                        'email' => $b->activeAllocation->student->user->email,
                    ]
                    : null,
            ]);

        return Inertia::render('Admin/Rooms/Beds', [
            'room' => array_merge(
                $room->only(['id', 'name', 'room_number', 'room_type', 'capacity', 'bed_count', 'price_per_semester', 'availability_status']),
                ['hostel' => $room->hostel->only(['id', 'name', 'slug'])],
            ),
            'beds'     => $beds,
            'statuses' => Bed::STATUSES,
            // NEW: server-authoritative "can this room accept one more
            // bed" flag — true only while beds.count() < room.capacity.
            'canAddBed' => $beds->count() < $room->capacity,
        ]);
    }

    /**
     * NEW: POST /admin/rooms/{room}/beds — hard-capped at room.capacity.
     * This is what actually enforces "beds limited to room capacity"
     * server-side, regardless of what the client sends; the frontend
     * disabling the button is only a UX convenience on top of this.
     */
    public function storeBed(Room $room): RedirectResponse
    {
        $this->authorize('update', $room);

        $currentCount = $room->beds()->count();
        if ($currentCount >= $room->capacity) {
            return back()->with('error', "Room capacity is {$room->capacity}; cannot add another bed. Increase room capacity first.");
        }

        $nextLabel = chr(ord('A') + $currentCount);

        $room->beds()->create([
            'label'      => "Bed {$nextLabel}",
            'status'     => Bed::STATUS_AVAILABLE,
            'sort_order' => $currentCount,
        ]);

        $room->syncAvailability();

        return back()->with('success', "Bed {$nextLabel} added.");
    }

    /** NEW: DELETE /admin/beds/{bed} — blocked if occupied/reserved. */
    public function destroyBed(Bed $bed): RedirectResponse
    {
        $this->authorize('update', $bed);

        if (in_array($bed->status, [Bed::STATUS_OCCUPIED, Bed::STATUS_RESERVED], true)) {
            return back()->with('error', "Cannot remove {$bed->label}: it is currently {$bed->status}.");
        }

        $room = $bed->room;
        $label = $bed->label;
        $bed->delete();
        $room->syncAvailability();

        return back()->with('success', "{$label} removed.");
    }

    /**
     * Admin updates a single bed status (e.g. available → maintenance).
     * Merged from BedController::updateStatus — kept the richer variant
     * (Rule::in, notes field, activity log) but fixed the room-sync call
     * (syncAvailabilityStatus() does not exist on Room; syncAvailability()
     * does — see Room model) and guarded the activity log so a missing
     * spatie/laravel-activitylog install doesn't hard-crash the request.
     */
    public function updateStatus(Request $request, Bed $bed): RedirectResponse
    {
        $this->authorize('update', $bed);

        $request->validate([
            'status' => ['required', Rule::in(Bed::STATUSES)],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        if ($bed->status === Bed::STATUS_OCCUPIED && $request->status !== Bed::STATUS_OCCUPIED) {
            return back()->with('error', 'Cannot change status of an occupied bed. Check out the student first.');
        }

        $old = $bed->status;

        DB::transaction(function () use ($bed, $request) {
            $bed->update(['status' => $request->status]);
            $bed->room->syncAvailability();
        });

        $this->logBedStatusChange($bed, $old, $request->status, $request->input('notes'));

        return back()->with('success', "Bed {$bed->label} updated to {$request->status}.");
    }

    // ── Private ───────────────────────────────────────────────────────────────
    private function validateRoom(Request $request, ?Room $room = null): array
    {
        return $request->validate([
            'name'                => ['required', 'string', 'max:150'],
            'room_number'         => ['required', 'string', 'max:50', Rule::unique('rooms', 'room_number')->ignore($room?->id)],
            'room_type'           => ['required', 'string', 'max:50'],
            // NEW: capped at 2 to match toggleCapacity()'s single/double
            // semantics — syncBeds() uses this value as the authoritative
            // bed count, which is the actual enforcement point.
            'capacity'            => ['required', 'integer', 'min:1', 'max:2'],
            'price_per_semester'  => ['required', 'numeric', 'min:0'],
            'gender_scope'        => ['required', Rule::in(['male', 'female', 'mixed'])],
            'description'         => ['nullable', 'string', 'max:2000'],
            'amenities'           => ['nullable', 'array'],
            'amenities.*'         => ['string', 'max:100'],
            'is_active'           => ['sometimes', 'boolean'],
        ]);
    }

    private function adminRoomShape(Room $room): array
    {
        return [
            'id'                        => $room->id,
            'name'                      => $room->name,
            'room_number'               => $room->room_number,
            'room_type'                 => $room->room_type,
            'room_type_label'           => $room->room_type_label,
            'capacity'                  => $room->capacity,
            'bed_count'                 => $room->bed_count,
            'price_per_semester'        => $room->price_per_semester,
            'price_per_bed'             => $room->price_per_bed,
            'availability_status'       => $room->availability_status,
            'availability_status_label' => $room->availability_status_label,
            'gender_scope'              => $room->gender_scope,
            'is_active'                 => $room->is_active,
            'hostel' => [
                'id'   => $room->hostel->id,
                'name' => $room->hostel->name,
                'slug' => $room->hostel->slug,
            ],
            'beds' => $room->beds->map(fn (Bed $bed) => [
                'id'                 => $bed->id,
                'label'              => $bed->label,
                'status'             => $bed->status,
                'status_label'       => $bed->status_label,
                'sort_order'         => $bed->sort_order,
                'current_allocation' => $bed->allocations
                    ->where('status', 'checked_in')
                    ->first()
                    ?->only(['id', 'student_id', 'status']),
            ]),
        ];
    }

    /**
     * Logs a bed status change via spatie/laravel-activitylog if the
     * package is installed; otherwise falls back to the standard log
     * channel so admin actions are never silently dropped.
     */
    private function logBedStatusChange(Bed $bed, string $old, string $new, ?string $notes): void
    {
        $properties = ['old' => $old, 'new' => $new, 'notes' => $notes];

        if (function_exists('activity')) {
            activity()
                ->causedBy(auth()->user())
                ->performedOn($bed)
                ->withProperties($properties)
                ->log('admin_bed_status_update');

            return;
        }

        Log::info('admin_bed_status_update', array_merge($properties, [
            'bed_id'  => $bed->id,
            'user_id' => auth()->id(),
        ]));
    }
}
