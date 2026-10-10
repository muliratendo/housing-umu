<?php
// app/Http/Controllers/Admin/HostelController.php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Hostel, Room, User};
use Illuminate\Http\{RedirectResponse, Request, JsonResponse};
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Inertia\{Inertia, Response};

class HostelController extends Controller
{
    /** A5 — Hostels List | GET /admin/hostels */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Hostel::class);

        /** @var User $user */
        $user = $request->user();

        $query = Hostel::query()
            // NEW: avoids N+1 queries when the admin UI displays manager names.
            ->with('managers:id,name,email')
            ->withCount([
                'rooms',
                'rooms as total_beds_count' => fn ($q) => $q
                    ->join('beds', 'rooms.id', '=', 'beds.room_id'),

                'rooms as occupied_beds_count' => fn ($q) => $q
                    ->join('beds', 'rooms.id', '=', 'beds.room_id')
                    ->where('beds.status', 'occupied'),
            ])
            ->when(
                ! $user->hasAnyRole(['super_admin', 'dean']),
                // CRITICAL: viewAny() authorizes access to the listing screen;
                // this limits the returned records to hostels assigned
                // through the hostel_managers pivot table, without scoping
                // only warden and affiliated_admin.
                fn ($q) => $q->whereHas(
                    'managers',
                    fn ($managerQuery) => $managerQuery->whereKey($user->id)
                )
                // This means if a non-global user reaches /admin/hostels manually,
                // the query still returns only assigned hostels.
            )
            ->when(
                $request->management_type,
                fn ($q, $value) => $q->where('management_type', $value)
            )
            ->when(
                $request->gender_scope,
                fn ($q, $value) => $q->where('gender_scope', $value)
            )
            ->when(
                $request->campus_location,
                fn ($q, $value) => $q->where('campus_location', $value)
            )
            ->when(
                $request->search,
                fn ($q, $value) => $q->where('name', 'like', "%{$value}%")
            )
            ->orderBy('management_type')
            ->orderBy('name');

        $hostels = $query
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Hostels/Index', [
            'hostels' => $hostels,
            'filters' => $request->only([
                'management_type',
                'gender_scope',
                'campus_location',
                'search',
            ]),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Hostel::class);

        return Inertia::render('Admin/Hostels/Form', [
            'hostel' => null,

            // A hostel does not yet exist, so there can be no pivot assignment.
            // Managers can be assigned after creation from the edit screen.
            'eligibleManagers' => [],

            'can' => [
                'manageManagers' => false,
            ],
        ]);
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

        /** @var User $user */
        $user = auth()->user();

        $hostel->load('managers:id,name,email');

        $canManageManagers = $user->can('manageManagers', $hostel);

        $eligibleManagers = $canManageManagers
            ? User::query()
                ->select('id', 'name', 'email')
                ->whereHas(
                    'roles',
                    fn ($query) => $query->whereIn('name', [
                        'warden',
                        'affiliated_admin',
                        'admin',
                        'super_admin',
                        'dean',
                    ])
                )
                ->with('roles:id,name')
                ->orderBy('name')
                ->get()
            : collect();

        return Inertia::render('Admin/Hostels/Form', [
            'hostel' => [
                ...$hostel->only([
                    'id',
                    'name',
                    'slug',
                    'management_type',
                    'gender_scope',
                    'campus_location',
                    'location',
                    'description',
                    'applications_open',
                ]),

                // Existing selected managers, preselected in the form.
                'manager_ids' => $hostel->managers->pluck('id')->values(),
            ],

            'eligibleManagers' => $eligibleManagers,

            'can' => [
                'manageManagers' => $canManageManagers,
            ],
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
     * GET /admin/hostels/managed
     *
     * Manager-specific entry point used by admin, warden, and affiliated_admin.
     * It always uses managedHostels(), never a client-provided hostel ID.
     */
    public function managed(Request $request): Response|RedirectResponse
    {
        $this->authorize('viewAny', Hostel::class);

        /** @var User $user */
        $user = $request->user();

        // Global administrators should use the full catalogue instead.
        if ($user->hasAnyRole(['super_admin', 'dean'])) {
            return redirect()->route('admin.hostels.index');
        }

        $hostels = $user->managedHostels()
            ->withCount([
                'rooms',
                'rooms as total_beds_count' => fn ($query) => $query
                    ->join('beds', 'rooms.id', '=', 'beds.room_id'),

                'rooms as occupied_beds_count' => fn ($query) => $query
                    ->join('beds', 'rooms.id', '=', 'beds.room_id')
                    ->where('beds.status', 'occupied'),
            ])
            ->with('managers:id,name,email')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        // UX optimization: most wardens / affiliated admins will have one
        // assigned hostel. Send them straight to its management profile rather
        // than displaying an unnecessary one-card selection page.
        if ($hostels->total() === 1) {
            return redirect()->route('admin.hostels.manage', [
                'hostel' => $hostels->first()->id,
            ]);
        }

        return Inertia::render('Admin/Hostels/Managed', [
            'hostels' => $hostels,
        ]);
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

    // /** A6 — Hostel Rooms | GET /admin/hostels/{hostel}/rooms */
    // public function showRooms(Request $request, Hostel $hostel): Response
    // {
    //     $this->authorize('view', $hostel);

    //     $rooms = $hostel->rooms()
    //         ->withCount([
    //             'beds',
    //             'beds as available_beds_count' => fn($q) => $q->where('status','available'),
    //             'beds as occupied_beds_count'  => fn($q) => $q->where('status','occupied'),
    //         ])
    //         ->when($request->room_type,           fn($q,$v) => $q->where('room_type',$v))
    //         ->when($request->availability_status, fn($q,$v) => $q->where('availability_status',$v))
    //         ->orderBy('room_number')
    //         ->paginate(30)->withQueryString();

    //     return Inertia::render('Admin/Hostels/Rooms', [
    //         'hostel'  => $hostel->only(['id','name','slug','management_type','gender_scope','campus_location','location','applications_open']),
    //         'rooms'   => $rooms,
    //         'filters' => $request->only(['room_type','availability_status']),
    //     ]);
    // }

    /**
     * Legacy route retained temporarily for existing bookmarks and redirects.
     *
     * The new account-style hostel management experience is available through
     * admin.hostels.manage instead of the previous rooms-only page.
     */
    public function showRooms(Hostel $hostel): RedirectResponse
    {
        $this->authorize('update', $hostel);

        return redirect()->route('admin.hostels.manage', [
            'hostel' => $hostel->id,
        ]);
    }

    /**
     * GET /admin/hostels/{hostel}/manage
     *
     * Hostel profile-management workspace: hostel identity/details at the top,
     * a clear Edit Hostel Details action, and the rooms inventory underneath.
     */
    public function manage(Request $request, Hostel $hostel): Response
    {
        $this->authorize('update', $hostel);

        $rooms = $hostel->rooms()
            ->withCount([
                'beds',
                'beds as available_beds_count' => fn ($query) => $query
                    ->where('status', 'available'),

                'beds as occupied_beds_count' => fn ($query) => $query
                    ->where('status', 'occupied'),
            ])
            ->when(
                $request->room_type,
                fn ($query, $value) => $query->where('room_type', $value)
            )
            ->when(
                $request->availability_status,
                fn ($query, $value) => $query->where('availability_status', $value)
            )
            ->orderBy('room_number')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Admin/Hostels/Manage', [
            'hostel' => $hostel->only([
                'id',
                'name',
                'slug',
                'management_type',
                'gender_scope',
                'campus_location',
                'location',
                'applications_open',
                'is_religious_order',
                'religious_notes',
                'amenities',
                'description',
                'image_url',
            ]),

            'rooms' => $rooms,

            'filters' => $request->only([
                'room_type',
                'availability_status',
            ]),

            'can' => [
                'editDetails' => $request->user()->can('update', $hostel),
                'createRooms' => $request->user()->can('update', $hostel),
            ],
        ]);
    }

    private function validateHostel(Request $request, ?Hostel $hostel = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:150'],

            'slug' => [
                'required',
                'string',
                'max:180',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('hostels', 'slug')->ignore($hostel?->id),
            ],

            'location' => ['nullable', 'string', 'max:250'],

            'management_type' => [
                'required',
                Rule::in(['campus-managed', 'affiliated']),
            ],

            'campus_location' => [
                'required',
                Rule::in(['on-campus', 'off-campus']),
            ],

            'gender_scope' => [
                'required',
                Rule::in(['male', 'female', 'mixed']),
            ],

            'applications_open' => ['sometimes', 'boolean'],

            'is_religious_order' => ['sometimes', 'boolean'],

            // required_if deliberately permits null if the toggle is false.
            'religious_notes' => [
                'nullable',
                'string',
                'max:2000',
                'required_if:is_religious_order,true',
            ],

            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'max:100', 'distinct'],

            'description' => ['nullable', 'string', 'max:2000'],

            'image_url' => ['nullable', 'url', 'max:500'],
        ]);
    }

    /**
     * GET /admin/hostels/slug-availability?slug=example-hostel&ignore=12
     *
     * Lightweight JSON endpoint for live UX feedback. Final uniqueness is still
     * enforced by validateHostel() during store/update, because browser checks
     * can be bypassed or become stale in another user's concurrent request.
     */
    public function slugAvailability(Request $request)
    {
        $this->authorize('viewAny', Hostel::class);

        $validated = $request->validate([
            'slug' => [
                'required',
                'string',
                'max:180',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            ],
            'ignore' => ['nullable', 'integer', 'exists:hostels,id'],
        ]);

        $exists = Hostel::query()
            ->where('slug', $validated['slug'])
            ->when(
                $validated['ignore'] ?? null,
                fn ($query, $id) => $query->whereKeyNot($id)
            )
            ->exists();

        return response()->json([
            'available' => ! $exists,
        ]);
    }

    /**
     * PATCH /admin/hostels/{hostel}/managers
     *
     * Replaces the full list of explicitly assigned hostel managers.
     * Authorization happens server-side; hiding the UI alone is never security.
     */
    public function syncManagers(Request $request, Hostel $hostel): RedirectResponse
    {
        $this->authorize('manageManagers', $hostel);

        $validated = $request->validate([
            'manager_ids' => ['nullable', 'array'],
            'manager_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        $managerIds = collect($validated['manager_ids'] ?? [])
            ->map(fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();

        // Only users with a role that may manage a hostel can be assigned.
        // Never trust role eligibility sent by the browser.
        $eligibleIds = User::query()
            ->whereIn('id', $managerIds)
            ->whereHas(
                'roles',
                fn ($query) => $query->whereIn('name', [
                    'warden',
                    'affiliated_admin',
                    'admin',
                    'super_admin',
                    'dean',
                ])
            )
            ->pluck('id');

        $invalidIds = $managerIds->diff($eligibleIds);

        if ($invalidIds->isNotEmpty()) {
            throw ValidationException::withMessages([
                'manager_ids' => 'One or more selected users cannot be assigned as hostel managers.',
            ]);
        }

        DB::transaction(function () use ($hostel, $eligibleIds): void {
            // sync() is intentional: the submitted manager list is the complete
            // desired state, including removing users unchecked in the UI.
            $hostel->managers()->sync($eligibleIds->all());
        });

        return back()->with(
            'success',
            "Manager assignments for '{$hostel->name}' were updated."
        );
    }
}
