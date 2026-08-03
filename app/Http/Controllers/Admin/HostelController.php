<?php
// app/Http/Controllers/Admin/HostelController.php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Hostel, Room};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Validation\Rule;
use Inertia\{Inertia, Response};

class HostelController extends Controller
{
    /** A5 — Hostels List | GET /admin/hostels */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Hostel::class);

        $hostels = Hostel::query()
            ->withCount([
                'rooms',
                'rooms as total_beds_count'    => fn($q) => $q->join('beds','rooms.id','=','beds.room_id'),
                'rooms as occupied_beds_count' => fn($q) => $q->join('beds','rooms.id','=','beds.room_id')->where('beds.status','occupied'),
            ])
            ->when($request->management_type, fn($q,$v) => $q->where('management_type',$v))
            ->when($request->gender_scope,    fn($q,$v) => $q->where('gender_scope',$v))
            ->when($request->campus_location, fn($q,$v) => $q->where('campus_location',$v))
            ->when($request->search,          fn($q,$v) => $q->where('name','like',"%{$v}%"))
            ->orderBy('management_type')->orderBy('name')
            ->paginate(20)->withQueryString();

        return Inertia::render('Admin/Hostels/Index', [
            'hostels' => $hostels,
            'filters' => $request->only(['management_type','gender_scope','campus_location','search']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Hostel::class);
        return Inertia::render('Admin/Hostels/Form', ['hostel' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Hostel::class);
        $validated = $this->validateHostel($request);
        $hostel = Hostel::create($validated);
        return redirect()->route('admin.hostels.rooms', $hostel)->with('success', "Hostel '{$hostel->name}' created.");
    }

    public function edit(Hostel $hostel): Response
    {
        $this->authorize('update', $hostel);
        return Inertia::render('Admin/Hostels/Form', [
            'hostel' => $hostel->only([
                'id','name','slug','management_type','gender_scope','campus_location',
                'location','description','applications_open',
            ]),
        ]);
    }

    public function update(Request $request, Hostel $hostel): RedirectResponse
    {
        $this->authorize('update', $hostel);
        $validated = $this->validateHostel($request, $hostel);
        $hostel->update($validated);
        return redirect()->route('admin.hostels.index')->with('success', "Hostel '{$hostel->name}' updated.");
    }

    /**
     * NEW: PATCH /admin/hostels/{hostel}/toggle-applications
     * Dedicated endpoint so the list page's switch is a single,
     * low-friction action independent of the full edit form.
     */
    public function toggleApplications(Hostel $hostel): RedirectResponse
    {
        $this->authorize('update', $hostel);
        $hostel->update(['applications_open' => !$hostel->applications_open]);
        $state = $hostel->applications_open ? 'open' : 'closed';
        return back()->with('success', "'{$hostel->name}' is now {$state} for applications.");
    }

    /** A6 — Hostel Rooms | GET /admin/hostels/{hostel}/rooms */
    public function showRooms(Request $request, Hostel $hostel): Response
    {
        $this->authorize('view', $hostel);

        $rooms = $hostel->rooms()
            ->withCount([
                'beds',
                'beds as available_beds_count' => fn($q) => $q->where('status','available'),
                'beds as occupied_beds_count'  => fn($q) => $q->where('status','occupied'),
            ])
            ->when($request->room_type,           fn($q,$v) => $q->where('room_type',$v))
            ->when($request->availability_status, fn($q,$v) => $q->where('availability_status',$v))
            ->orderBy('room_number')
            ->paginate(30)->withQueryString();

        return Inertia::render('Admin/Hostels/Rooms', [
            'hostel'  => $hostel->only(['id','name','slug','management_type','gender_scope','campus_location','location','applications_open']),
            'rooms'   => $rooms,
            'filters' => $request->only(['room_type','availability_status']),
        ]);
    }

    private function validateHostel(Request $request, ?Hostel $hostel = null): array
    {
        return $request->validate([
            'name'               => ['required','string','max:150'],
            'slug'               => ['nullable','string','max:150', Rule::unique('hostels','slug')->ignore($hostel?->id)],
            'management_type'    => ['required', Rule::in(['campus-managed','affiliated'])],
            'gender_scope'       => ['required', Rule::in(['male','female','mixed'])],
            'campus_location'    => ['required', Rule::in(['on-campus','off-campus'])],
            'location'           => ['nullable','string','max:255'],
            'description'        => ['nullable','string','max:2000'],
            'applications_open'  => ['sometimes','boolean'],
        ]);
    }
}
