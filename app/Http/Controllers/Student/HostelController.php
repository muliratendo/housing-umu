<?php
// File: app/Http/Controllers/Student/HostelController.php
namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Allocation, Application, Hostel};
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

        // D0 - Active allocation in this term? (BR‑1)
        $activeAllocation = $term ? $student->activeAllocationForTerm($term->id) : null;

        $appliedHostelIds = $term
            ? Application::where('student_id', $student->id)
                ->where('academic_term_id', $term->id)
                ->pluck('hostel_id')
                ->toArray()
            : [];

        // NOTE: fields aligned to Hostel model: gender_scope, management_type
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
            ->when($request->query('max_price'), function ($q, $maxPrice) {
                $q->where('price_per_semester', '<=', $maxPrice);
            });

            $hostels = $query->with([
                'rooms' => fn($q) => $q->where('rooms.is_active', true),
                'rooms.beds',   // ← load beds too, avoiding N+1 inside availableBedCount()
            ])
                ->get()
                ->map(function (Hostel $h) use ($term, $student, $activeAllocation, $appliedHostelIds) {

                    $availableBeds  = $term ? $h->availableBedCount($term->id) : 0;
                    $windowOpen     = $term ? $h->isApplicationWindowOpen($term) : false;
                    $alreadyApplied = in_array($h->id, $appliedHostelIds);
                    $requiresRenewal = !$student->is_first_year
                        && $h->management_type === Hostel::TYPE_CAMPUS;
                    $canApply = !$activeAllocation && !$alreadyApplied && $windowOpen && !$requiresRenewal;

                    // Price range from active rooms
                    $prices = $h->rooms
                        ->where('is_active', true)
                        ->pluck('price_per_semester')
                        ->filter()
                        ->sort()
                        ->values();

                    $managementTypeLabel = match($h->management_type) {
                        'campus-managed' => 'Campus',
                        'affiliated'     => 'Affiliated',
                        default          => ucfirst($h->management_type),
                    };

                    $availabilityLabel = match($h->availability_status) {
                        'available' => 'Available',
                        'limited'   => 'Limited Beds',
                        'full'      => 'Full',
                        'closed'    => 'Closed',
                        default     => ucfirst($h->availability_status),
                    };

                    $genderLabel = match($h->gender_scope) {
                        'male'   => 'Male Only',
                        'female' => 'Female Only',
                        default  => 'Mixed',
                    };

                    $roomTypeLabels = $h->rooms
                        ->where('is_active', true)
                        ->pluck('room_type')
                        ->unique()
                        ->map(fn($t) => match($t) {
                            'self-contained'     => 'Self-Contained',
                            'apartment'          => 'Apartment',
                            default              => 'Non-Self-Contained',
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
                        'id'                        => $h->id,
                        'name'                      => $h->name,
                        'slug'                      => $h->slug,
                        'image_path'                => $h->image_url,          // ← was image_url
                        'location'                  => $h->location,
                        'description'               => $h->description,

                        // Type / gender — keys now match HostelCardData interface
                        'hostel_type'               => $h->management_type,    // ← was management_type
                        'hostel_type_label'         => $managementTypeLabel,
                        'gender_policy'             => $h->gender_scope,       // ← was gender_scope
                        'gender_policy_label'       => $genderLabel,

                        // Availability
                        'availability_status'       => $h->availability_status,
                        'availability_status_label' => $availabilityLabel,

                        // Price range
                        'starting_price'            => $prices->first() ?? $h->price_per_semester,
                        'highest_price'             => $prices->last()  ?? $h->price_per_semester,
                        'price_per_semester'        => $prices->first() ?? $h->price_per_semester,

                        // Room info for badges
                        'room_type_labels'          => $roomTypeLabels,
                        'occupancy_labels'          => $occupancyLabels,
                        'amenities'                 => array_slice($amenities, 0, 5),

                        // Religious flag
                        'is_religious_order'        => (bool) ($h->is_religious_order ?? false),

                        // Student-specific decision flags
                        'available_beds'            => $availableBeds,
                        'total_capacity'            => $h->total_capacity,
                        'window_open'               => $windowOpen,
                        'already_applied'           => $alreadyApplied,
                        'requires_renewal'          => $requiresRenewal,
                        'can_apply'                 => $canApply,
                        'has_active_allocation'     => (bool) $activeAllocation,
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
     * D0, D1, D2, D7 evaluated
     */
    public function show(Request $request, Hostel $hostel): Response
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        $activeAllocation    = $term ? $student->activeAllocationForTerm($term->id) : null;
        $existingApplication = $term ? $student->applicationForHostel($hostel->id, $term->id) : null;
        $windowOpen          = $term ? $hostel->isApplicationWindowOpen($term) : false;
        $requiresRenewal     = !$student->is_first_year && $hostel->management_type === Hostel::TYPE_CAMPUS;
        $availableBeds       = $term ? $hostel->availableBedCount($term->id) : 0;

        // campusBedsAvailable uses the scopeCampus() defined on Hostel
        $campusBedsAvailable = $hostel->management_type === Hostel::TYPE_AFFILIATED && $term
            ? Hostel::active()->campus()->get()->sum(
                fn (Hostel $h) => $h->availableBedCount($term->id)
            )
            : null;

        $rooms = $hostel->rooms()
            ->where('is_active', true)
            ->get(['id', 'room_number', 'floor', 'room_type', 'capacity', 'gender_override']);

        return Inertia::render('Student/Hostel/Show', [
            'hostel' => [
                'id'                 => $hostel->id,
                'name'               => $hostel->name,
                // again, API field hostel_type backed by management_type
                'hostel_type'        => $hostel->management_type,
                'gender_policy'      => $hostel->gender_scope,
                'description'        => $hostel->description,
                'location'           => $hostel->location,
                'price_per_semester' => $hostel->price_per_semester,
                'image_path'         => $hostel->image_url,
                'total_capacity'     => $hostel->total_capacity,
                'available_beds'     => $availableBeds,
                'window_open'        => $windowOpen,
            ],
            'rooms'              => $rooms,
            'activeAllocation'   => $activeAllocation ? ['id' => $activeAllocation->id] : null,
            'existingApplication'=> $existingApplication ? [
                'id'     => $existingApplication->id,
                'status' => $existingApplication->status,
            ] : null,
            'requiresRenewal'    => $requiresRenewal,
            'campusBedsAvailable'=> $campusBedsAvailable,
            'windowOpen'         => $windowOpen,
            'currentTerm'        => $term ? ['id' => $term->id, 'name' => $term->name] : null,
            'student'            => [
                'is_first_year' => $student->is_first_year,
                'gender'        => $student->gender,
            ],
        ]);
    }
}
