<?php
// File: app/Http/Controllers/Admin/RoomController.php  NEW.
//
// Add to routes/web.php admin group:
//   use App\Http\Controllers\Admin\RoomController;
//   Route::resource('rooms', RoomController::class)->only(['show']);
//   Route::post('rooms/{room}/toggle-capacity', [RoomController::class, 'toggleCapacity'])->name('rooms.toggle-capacity');
//   Route::get('rooms/{room}/beds', [RoomController::class, 'beds'])->name('rooms.beds');
//   Route::patch('beds/{bed}/status', [RoomController::class, 'updateBedStatus'])->name('beds.update-status');

declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Bed, Room};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Inertia\{Inertia, Response};

class RoomController extends Controller {

    /** Admin room detail — all beds, statuses, current allocations. */
    public function show(Room $room): Response {
        $this->authorize('adminView', $room);
        $room->load(['hostel','beds.allocations' => fn($q) => $q->with('student')->latest()]);
        return Inertia::render('Admin/Rooms/Show', ['room' => $this->adminRoomShape($room)]);
    }

    /**
     * Toggle room capacity 1<->2 (single <-> double).
     * Cannot downgrade while both beds are occupied/reserved.
     */
    public function toggleCapacity(Request $request, Room $room): RedirectResponse {
        $this->authorize('update', $room);
        $newCapacity = $room->capacity === 1 ? 2 : 1;
        if ($newCapacity === 1) {
            $occupiedCount = $room->beds()
                ->whereIn('status',[Bed::STATUS_OCCUPIED, Bed::STATUS_RESERVED])
                ->count();
            if ($occupiedCount > 1)
                return back()->with('error','Cannot convert to single: multiple beds occupied or reserved.');
        }
        DB::transaction(function() use ($room, $newCapacity) {
            $room->update(['capacity' => $newCapacity]);
            $room->syncBeds();
            $room->syncAvailability();
        });
        return back()->with('success', "Room converted to {$newCapacity}-bed occupancy.");
    }

    /** Admin beds overview for a room. */
    public function beds(Room $room): Response {
        $this->authorize('adminView', $room);
        $room->load(['beds' => fn($q) => $q->with([
            'allocations' => fn($q2) => $q2->whereIn('status',['allocated','checked_in'])->with('student.user')->latest()->limit(1),
        ])]);
        return Inertia::render('Admin/Rooms/Beds', [
            'room' => $room->only(['id','name','room_number','capacity','bed_count']),
            'beds' => $room->beds->map(fn(Bed $bed) => [
                'id'           => $bed->id,
                'label'        => $bed->label,
                'status'       => $bed->status,
                'status_label' => $bed->status_label,
                'sort_order'   => $bed->sort_order,
                'occupant'     => $bed->allocations->first()?->student?->user?->only(['id','name','email']),
            ]),
        ]);
    }

    /** Admin updates a single bed status (e.g. available -> maintenance). */
    public function updateBedStatus(Request $request, Bed $bed): RedirectResponse {
        $this->authorize('update', $bed->room);
        $request->validate(['status' => ['required','in:'.implode(',', Bed::STATUSES)]]);
        if ($bed->status === Bed::STATUS_OCCUPIED && $request->status !== Bed::STATUS_OCCUPIED)
            return back()->with('error','Cannot change status of an occupied bed. Checkout the student first.');
        DB::transaction(function() use ($bed, $request) {
            $bed->update(['status' => $request->status]);
            $bed->room->syncAvailability();
        });
        return back()->with('success', "Bed {$bed->label} status updated.");
    }

    private function adminRoomShape(Room $room): array {
        return [
            'id'                        => $room->id,
            'name'                      => $room->name,
            'room_number'               => $room->room_number,   // admin only
            'room_type'                 => $room->room_type,
            'room_type_label'           => $room->room_type_label,
            'capacity'                  => $room->capacity,
            'bed_count'                 => $room->bed_count,
            'price_per_semester'        => $room->price_per_semester,
            'price_per_bed'             => $room->price_per_bed,
            'availability_status'       => $room->availability_status,
            'availability_status_label' => $room->availability_status_label,
            'gender_scope'              => $room->gender_scope,
            'hostel' => ['id'=>$room->hostel->id,'name'=>$room->hostel->name,'slug'=>$room->hostel->slug],
            'beds' => $room->beds->map(fn(Bed $bed) => [
                'id'=>$bed->id,'label'=>$bed->label,'status'=>$bed->status,
                'status_label'=>$bed->status_label,'sort_order'=>$bed->sort_order,
                'current_allocation'=>$bed->allocations->where('status','checked_in')->first()?->only(['id','student_id','status']),
            ]),
        ];
    }
}
