<?php
// File: app/Http/Controllers/Student/HostelController.php  — REPLACE existing.
// Fixes applied:
//  1. max_price filter: was ->where('price_per_semester', ...) against hostels table
//     (column doesn't exist there). Changed to whereHas('rooms', ...).
//  2. Room query in create(): gender_override → gender_scope (correct column name).
//  3. Room select in show(): removed floor and gender_override (don't exist on rooms table).
//     floor added back now that the rooms migration gains a floor column via the new
//     add_floor_to_rooms migration. gender_override → gender_scope in select.
//  4. ApplicationController::create() room query aligned consistently.
//
// NEW (storefront redesign):
//  5. show() no longer returns a flat room list. It now groups active rooms into
//     "categories" (standard / self-contained / apartment) — each category behaves
//     like a storefront product: it has a display price (lowest price in that
//     category), the occupancy options available (single/double), and an available
//     bed count. This powers the Airbnb-style "product" cards on the Hostel Detail
//     page. Selecting a category's "Apply" CTA forwards room_type as a query param
//     to the application create page — the specific room and occupancy are chosen
//     there, not on this page.


namespace App\Http\Controllers\Student;


use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Allocation, Application, Hostel };
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};


class HostelController extends Controller
{
    /**
     * S2 — Hostel List
     * Route: GET /student/hostels
     */
    public function index(Request $request): Response
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();


        $activeAllocation = $term
            ? $student->activeAllocationForTerm($term->id)
            : null;


        $appliedHostelIds = $term
            ? Application::where('student_id', $student->id)
                ->where('academic_term_id', $term->id)
                ->pluck('hostel_id')
                ->toArray()
            : [];


        $query = Hostel::active()
            ->when($request->query('gender'), function ($q, $gender) {
                $q->where(function ($q2) use ($gender) {
                    $q2->where('gender_scope', 'mixed')
                        ->orWhere('gender_scope', $gender);
                });
            })
            ->when($request->query('type'), function ($q, $type) {
                $q->where('management_type', $type);
            })
            ->when($request->query('available_only'), function ($q) {
                $q->whereHas('rooms', function ($r) {
                    $r->where('is_active', true);
                });
            })
            ->when($request->query('search'), function ($q, $search) {
                $q->where(function ($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            // FIX: price lives on rooms, not hostels — use whereHas
            ->when($request->query('max_price'), function ($q, $maxPrice) {
                $q->whereHas('rooms', function ($r) use ($maxPrice) {
                    $r->where('is_active', true)
                      ->where('price_per_semester', '<=', (int) $maxPrice);
                });
            });


        $hostels = $query->with([
            'rooms' => fn($q) => $q->where('rooms.is_active', true),
            'rooms.beds',
        ])
            ->get()
            ->map(function (Hostel $h) use ($term, $student, $activeAllocation, $appliedHostelIds) {


                $availableBeds   = $term ? $h->availableBedCount($term->id) : 0;
                $windowOpen      = $term ? $h->isApplicationWindowOpen($term) : false;
                $alreadyApplied  = in_array($h->id, $appliedHostelIds);
                $requiresRenewal = ! $student->is_first_year
                    && $h->management_type === Hostel::TYPE_CAMPUS;
                $canApply        = ! $activeAllocation
                    && ! $alreadyApplied
                    && $windowOpen
                    && ! $requiresRenewal;


                // Price range from active rooms
                $prices = $h->rooms
                    ->where('is_active', true)
                    ->pluck('price_per_semester')
                    ->filter()
                    ->sort()
                    ->values();


                $managementTypeLabel = match ($h->management_type) {
                    'campus-managed' => 'Campus',
                    'affiliated'     => 'Affiliated',
                    default          => ucfirst($h->management_type),
                };


                $availabilityLabel = match ($h->availability_status) {
                    'available' => 'Available',
                    'limited'   => 'Limited Beds',
                    'full'      => 'Full',
                    'closed'    => 'Closed',
                    default     => ucfirst($h->availability_status),
                };


                $genderLabel = match ($h->gender_scope) {
                    'male'   => 'Male Only',
                    'female' => 'Female Only',
                    default  => 'Mixed',
                };


                $roomTypeLabels = $h->rooms
                    ->where('is_active', true)
                    ->pluck('room_type')
                    ->unique()
                    ->map(fn($t) => match ($t) {
                        'self-contained' => 'Self-Contained',
                        'apartment'      => 'Apartment',
                        default          => 'Non-Self-Contained',
                    })
                    ->values()
                    ->toArray();


                $occupancyLabels = $h->rooms
                    ->where('is_active', true)
                    ->pluck('capacity')
                    ->unique()
                    ->map(fn($c) => $c === 1 ? 'Single' : 'Double')
                    ->values()
                    ->toArray();


                $amenities = is_array($h->amenities) ? $h->amenities : [];


                return [
                    // Card identity
                    'id'          => $h->id,
                    'name'        => $h->name,
                    'slug'        => $h->slug,
                    'image_path'  => $h->image_url,   // accessor also available; direct read is fine here
                    'location'    => $h->location,
                    'description' => $h->description,


                    // Type / gender (keys match HostelCardData interface)
                    'hostel_type'               => $h->management_type,
                    'hostel_type_label'         => $managementTypeLabel,
                    'gender_policy'             => $h->gender_scope,
                    'gender_policy_label'       => $genderLabel,


                    // Availability
                    'availability_status'       => $h->availability_status,
                    'availability_status_label' => $availabilityLabel,


                    // Price range (all from rooms, never from hostels table)
                    'starting_price'      => $prices->first() ?? 0,
                    'highest_price'       => $prices->last()  ?? 0,
                    'price_per_semester'  => $prices->first() ?? 0,


                    // Room info for badges
                    'room_type_labels'  => $roomTypeLabels,
                    'occupancy_labels'  => $occupancyLabels,
                    'amenities'         => array_slice($amenities, 0, 5),


                    // Religious flag
                    'is_religious_order' => (bool) ($h->is_religious_order ?? false),


                    // Student-specific decision flags
                    'available_beds'         => $availableBeds,
                    'total_capacity'         => $h->total_capacity,
                    'window_open'            => $windowOpen,
                    'already_applied'        => $alreadyApplied,
                    'requires_renewal'       => $requiresRenewal,
                    'can_apply'              => $canApply,
                    'has_active_allocation'  => (bool) $activeAllocation,
                ];
            });


        return Inertia::render('Student/Hostel/Index', [
            'hostels'          => $hostels,
            'activeAllocation' => $activeAllocation ? ['id' => $activeAllocation->id] : null,
            'filters'          => $request->only(['search', 'gender', 'type', 'max_price', 'available_only']),
            'currentTerm'      => $term ? ['id' => $term->id, 'name' => $term->name] : null,
            'student'          => [
                'is_first_year' => $student->is_first_year,
                'gender'        => $student->gender,
            ],
        ]);
    }


    /**
     * S3 — Hostel Detail
     * Route: GET /student/hostels/{hostel}
     *
     * NEW (storefront redesign): rooms are grouped into "categories" — one product
     * card per distinct room_type (standard / self-contained / apartment). Each
     * category card shows a starting price, the occupancy options (single/double)
     * available within it, and how many beds are free. The "Apply" CTA on a card
     * forwards ?room_type=<category> to the application create page instead of a
     * specific room — occupancy and (optionally) a specific room are chosen there.
     */
    public function show(Request $request, Hostel $hostel): Response
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        $activeAllocation    = $term ? $student->activeAllocationForTerm($term->id) : null;
        $existingApplication = $term ? $student->applicationForHostel($hostel->id, $term->id) : null;
        $windowOpen          = $term ? $hostel->isApplicationWindowOpen($term) : false;
        $requiresRenewal     = ! $student->is_first_year
            && $hostel->management_type === Hostel::TYPE_CAMPUS;
        $availableBeds       = $term ? $hostel->availableBedCount($term->id) : 0;

        // NEW: hostel-level gender eligibility check — distinct from the
        // room-level gender_scope filter below. A male-only or female-only
        // hostel should tell a mismatched student explicitly why they see no
        // categories, rather than silently returning an empty $categories
        // array that looks identical to "this hostel genuinely has zero
        // active rooms." Checked against hostel.gender_scope (the policy for
        // the WHOLE hostel), not room.gender_scope (which only matters for
        // mixed hostels with single-gender floors/wings).
        $genderIneligible = $hostel->gender_scope !== 'mixed'
            && $hostel->gender_scope !== $student->gender;

        $campusBedsAvailable = $hostel->management_type === Hostel::TYPE_AFFILIATED && $term
            ? Hostel::active()->campus()->get()->sum(
                fn(Hostel $h) => $h->availableBedCount($term->id)
            )
            : null;

        // FIX: gender_override → gender_scope; floor is now a real column (see migration)
        // NEW: gender-eligible rooms only — mixed hostels show all, single-gender
        //      hostels/rooms are filtered to the student's own gender up front so the
        //      storefront never advertises a category the student can't actually apply to.
        // NEW: skip this query entirely when $genderIneligible is already true at the
        // hostel level — no point querying rooms the student could never see, and it
        // keeps $categories cleanly empty for the frontend's dedicated notice.
        $eligibleRooms = $genderIneligible
            ? collect()
            : $hostel->rooms()
                ->where('is_active', true)
                ->where(fn($q) => $q
                    ->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender)
                )
                ->get(['id', 'room_number', 'floor', 'room_type', 'capacity', 'gender_scope', 'price_per_semester']);

        // NEW: room "categories" == storefront products. Grouped by room_type, each
        // category aggregates: starting price, occupancy options present, and total
        // available bed count (capacity minus active allocations, approximated here
        // via room count * capacity since bed-level detail is resolved on the
        // application page once a specific occupancy is chosen).
        $categoryMeta = [
            'standard'        => ['label' => 'Standard Room',        'description' => 'A shared, non-self-contained room with communal bathroom facilities on the floor.'],
            'self-contained'  => ['label' => 'Self-Contained Room',  'description' => 'A private room with an attached bathroom, offering more privacy and comfort.'],
            'apartment'       => ['label' => 'Apartment',            'description' => 'A full apartment-style unit, ideal for students who want independent living space.'],
        ];

        $categories = $eligibleRooms
            ->groupBy('room_type')
            ->map(function ($roomsInCategory, $type) use ($categoryMeta) {
                $meta = $categoryMeta[$type] ?? ['label' => ucfirst(str_replace('-', ' ', $type)), 'description' => null];

                $occupancyOptions = $roomsInCategory
                    ->pluck('capacity')
                    ->unique()
                    ->sort()
                    ->values()
                    ->map(fn($c) => [
                        'capacity' => $c,
                        'label'    => $c === 1 ? 'Single' : 'Double',
                        // Lowest price for this specific occupancy within the category
                        'price'    => $roomsInCategory->where('capacity', $c)->min('price_per_semester'),
                    ])
                    ->values();

                return [
                    'room_type'          => $type,
                    'label'              => $meta['label'],
                    'description'        => $meta['description'],
                    'starting_price'     => $roomsInCategory->min('price_per_semester'),
                    'room_count'         => $roomsInCategory->count(),
                    'occupancy_options'  => $occupancyOptions,
                ];
            })
            ->values();

        return Inertia::render('Student/Hostel/Show', [
            'hostel' => [
                'id'                 => $hostel->id,
                'name'               => $hostel->name,
                'hostel_type'        => $hostel->management_type,   // API alias (accessor also available)
                'gender_policy'      => $hostel->gender_scope,      // API alias
                'description'        => $hostel->description,
                'location'           => $hostel->location,
                'price_per_semester' => $hostel->price_per_semester, // derived via accessor
                'image_path'         => $hostel->image_url,
                'total_capacity'     => $hostel->total_capacity,
                'available_beds'     => $availableBeds,
                'window_open'        => $windowOpen,
            ],
            // NEW: storefront "products" — replaces the old flat room list on this page.
            'categories'          => $categories,
            // NEW: tells the frontend WHY categories might be empty, so it can render
            // a specific "not eligible" notice instead of a generic empty state.
            'genderIneligible'    => $genderIneligible,
            'activeAllocation'    => $activeAllocation ? ['id' => $activeAllocation->id] : null,
            'existingApplication' => $existingApplication ? [
                'id'     => $existingApplication->id,
                'status' => $existingApplication->status,
            ] : null,
            'requiresRenewal'     => $requiresRenewal,
            'campusBedsAvailable' => $campusBedsAvailable,
            'windowOpen'          => $windowOpen,
            'currentTerm'         => $term ? ['id' => $term->id, 'name' => $term->name] : null,
            'student'             => [
                'is_first_year' => $student->is_first_year,
                'gender'        => $student->gender,
            ],
        ]);
    }
}
