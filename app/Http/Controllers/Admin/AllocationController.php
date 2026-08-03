<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Allocation, Student, Application, Bed, Hostel};
use App\Services\Housing\AllocationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AllocationController extends Controller
{
    public function __construct(private readonly AllocationService $allocationService) {}

    /** A3 — Allocations Index */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Allocation::class);

        $allocations = Allocation::with(['student.user', 'hostel', 'room', 'bed', 'academicTerm'])
            ->scopeByAdminRole($request->user())
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->where('status', '!=', 'waitlisted')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Allocations/Index', [
            'allocations'   => $allocations,
            'filters'       => $request->only(['status']),
            // REMOVED: 'availableBeds' => $this->availableBedOptions() — a
            // single global list can't be correct across rows with different
            // student genders; each row now fetches its own scoped list
            // on-demand when the admin opens Override for that specific row.
            'canCheckOut'   => $request->user()->can('update allocations'),
            'canOverride'   => $request->user()->can('switch allocations'),
        ]);
    }

    /** Allocation Detail */
    public function show(Allocation $allocation): Response
    {
        $this->authorize('view', $allocation);

        $allocation->load(['student.user', 'hostel', 'room', 'bed', 'academicTerm', 'application']);

        $user = auth()->user();

        return Inertia::render('Admin/Allocations/Show', [
            'allocation' => [
                'id'                => $allocation->id,
                'status'            => $allocation->status,
                'admin_notes'       => $allocation->admin_notes,
                'is_admin_override' => (bool) $allocation->is_admin_override,
                'override_by'       => $allocation->override_by,
                'checked_in_at'     => $allocation->checked_in_at?->toIso8601String(),
                'checked_out_at'    => $allocation->checked_out_at?->toIso8601String(),
                'created_at'        => $allocation->created_at->toIso8601String(),
                'student' => [
                    'id'             => $allocation->student->id,
                    'student_number' => $allocation->student->student_number,
                    'gender'         => $allocation->student->gender,
                    'year_of_study'  => $allocation->student->year_of_study,
                    'programme'      => $allocation->student->programme,
                    'user'           => [
                        'id'    => $allocation->student->user->id,
                        'name'  => $allocation->student->user->name,
                        'email' => $allocation->student->user->email,
                    ],
                ],
                'hostel' => [
                    'id'              => $allocation->hostel->id,
                    'name'            => $allocation->hostel->name,
                    'slug'            => $allocation->hostel->slug,
                    'location'        => $allocation->hostel->location,
                    'management_type' => $allocation->hostel->management_type,
                ],
                'room' => [
                    'id'          => $allocation->room->id,
                    'room_number' => $allocation->room->room_number,
                    'room_type'   => $allocation->room->room_type,
                    'floor'       => $allocation->room->floor,
                ],
                'bed' => $allocation->bed ? [
                    'id'    => $allocation->bed->id,
                    'label' => $allocation->bed->label,
                ] : null,
                'academic_term' => [
                    'id'   => $allocation->academicTerm->id,
                    'name' => $allocation->academicTerm->name,
                ],
                'application' => $allocation->application ? [
                    'id' => $allocation->application->id,
                ] : null,
            ],
            'canCheckOut'   => $user->can('update allocations'),
            'canOverride'   => $user->can('switch allocations'),
        ]);
    }

    /** A4 — Waitlist (Applications where status=waitlisted) */
    public function waitlist(Request $request): Response
    {
        $this->authorize('viewAny', Allocation::class);

        $termId = $request->integer('term_id') ?: AcademicTerm::current()?->id;

        $waitlist = Application::with(['student.user', 'hostel', 'academicTerm'])
            ->where('status', 'waitlisted')
            ->scopeByAdminRole($request->user())
            ->when($termId, fn ($q) => $q->where('academic_term_id', $termId))
            ->when($request->filled('hostel'), fn ($q) =>
                $q->where('hostel_id', $request->integer('hostel')))
            ->when($request->filled('gender'), fn ($q) =>
                $q->whereHas('student', fn ($s) => $s->where('gender', $request->string('gender'))))
            ->when($request->filled('search'), fn ($q) =>
                $q->whereHas('student.user', fn ($u) =>
                    $u->where('name', 'like', '%' . $request->string('search') . '%'))
                  ->orWhereHas('student', fn ($s) =>
                    $s->where('student_number', 'like', '%' . $request->string('search') . '%'))
            )
            ->orderBy('waitlist_position')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Waitlist/Index', [
            'waitlist'    => $waitlist,
            'hostels'     => Hostel::active()->get(['id', 'name']),
            'canPromote'  => $request->user()->can('manage waitlists'),
        ]);
    }

    /** ASYS-1 — Batch Allocation */
    public function runBatch(Request $request): RedirectResponse
    {
        $this->authorize('create', Allocation::class);

        $term = AcademicTerm::current();
        abort_if(!$term, 422, 'No active academic term.');

        $pending = Application::with(['student', 'hostel'])
            ->where('academic_term_id', $term->id)
            ->where('status', 'pending')
            ->get();

        $allocated = 0; $waitlisted = 0; $skipped = 0;

        DB::transaction(function () use ($pending, $term, &$allocated, &$waitlisted, &$skipped) {
            foreach ($pending as $app) {
                try {
                    $result = $this->allocationService->create(
                        $app->student, $app->hostel, $term,
                        ['application_id' => $app->id],
                    );
                    $result->status === 'waitlisted' ? $waitlisted++ : $allocated++;
                } catch (\Throwable) {
                    $skipped++;
                }
            }
        });

        return back()->with('success', "Batch complete: {$allocated} allocated, {$waitlisted} waitlisted, {$skipped} skipped.");
    }

    /** ASYS-4 — Override */
    public function override(Request $request, Allocation $allocation): RedirectResponse
    {
        $this->authorize('update', $allocation);

        $validated = $request->validate([
            'bed_id'      => ['required', 'integer', 'exists:beds,id'],
            'admin_notes' => ['required', 'string', 'max:1000'],
        ]);

        $allocation->update([
            'bed_id'            => $validated['bed_id'],
            'is_admin_override' => true,
            'admin_notes'       => $validated['admin_notes'],
            'override_by'       => $request->user()->id,
        ]);

        return back()->with('success', 'Allocation overridden successfully.');
    }

    /** ASYS-5 — Check Out */
    public function checkOut(Allocation $allocation): RedirectResponse
    {
        $this->authorize('update', $allocation);

        $allocation->checkOut();

        return back()->with('success', 'Student checked out successfully.');
    }

    /** ASYS-6 — Promote Waitlisted Application */
    public function promote(Request $request, Application $application): RedirectResponse
    {
        $this->authorize('create', Allocation::class);

        // NEW: accepts the same bed_id/include_other_types payload
        // AllocationsDialog's promote mode sends — previously this method
        // took no Request param at all, so any manual bed choice was
        // silently discarded and every promotion fell back to random.
        $validated = $request->validate([
            'bed_id'               => ['nullable', 'integer', 'exists:beds,id'],
            'include_other_types' => ['boolean'],
        ]);

        $result = $this->allocationService->create(
            $application->student,
            $application->hostel,
            $application->academicTerm,
            [
                'application_id'      => $application->id,
                'bed_id'               => $validated['bed_id'] ?? null,
                'include_other_types' => $validated['include_other_types'] ?? false,
            ],
        );

        $message = $result instanceof Allocation
            ? 'Student promoted and allocated successfully.'
            : 'No compatible bed available — application remains on the waitlist.';

        return back()->with('success', $message);
    }

    /** NEW: fetches available beds for the manual-allocate dialog, grouped
     *  by whether they match the application's room_type. */
    public function availableBedsForApplication(Application $application): \Illuminate\Http\JsonResponse
    {
        $this->authorize('create', Allocation::class);

        $application->loadMissing(['student', 'hostel', 'academicTerm']);

        $beds = $this->allocationService->listAvailableBeds(
            $application->student,
            $application->hostel,
            $application->academicTerm,
            $application->room_type,
        );

        return response()->json($beds);
    }

    /** NEW: manual allocation trigger — bed_id null means "Random" (default),
     *  which resolves within the application's own room_type unless
     *  include_other_types is true. */
    public function manualAllocate(Request $request, Application $application): RedirectResponse
    {
        $this->authorize('create', Allocation::class);

        $validated = $request->validate([
            'bed_id'               => ['nullable', 'integer', 'exists:beds,id'],
            'include_other_types'  => ['boolean'],
        ]);

        $result = $this->allocationService->create(
            $application->student,
            $application->hostel,
            $application->academicTerm,
            [
                'application_id'       => $application->id,
                'bed_id'                => $validated['bed_id'] ?? null,
                'include_other_types'  => $validated['include_other_types'] ?? false,
            ],
        );

        $message = $result instanceof Allocation
            ? 'Student allocated successfully.'
            : 'No compatible bed available — application moved to the waitlist.';

        return back()->with('success', $message);
    }

    /** NEW: on-demand, per-allocation bed list for the override dialog —
     *  scoped to this allocation's student gender and active rooms only. */
    public function availableBedsForAllocation(Allocation $allocation): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $allocation);

        $allocation->loadMissing('student');

        return response()->json(
            $this->availableBedOptions($allocation->student)
        );
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * UPDATED: now accepts an optional Student to scope results — when
     * provided, excludes beds whose room gender_scope is incompatible with
     * that student, and excludes inactive rooms. Without a student (index()'s
     * current usage), returns the unfiltered global list — see index() below
     * for why that call site needs a different approach entirely.
     */
    private function availableBedOptions(?Student $student = null): array
    {
        return Bed::where('status', 'available')
            ->with(['room.hostel'])
            ->whereHas('room', function ($query) use ($student) {
                $query->where('is_active', true);

                if ($student) {
                    $query->where(function ($q) use ($student) {
                        $q->whereNull('gender_scope')
                            ->orWhere('gender_scope', 'mixed')
                            ->orWhere('gender_scope', $student->gender);
                    });
                }
            })
            ->get()
            ->map(fn ($b) => [
                'id'          => $b->id,
                'label'       => $b->label,
                'room_number' => $b->room->room_number,
                'hostel_name' => $b->room->hostel->name,
            ])
            ->toArray();
    }
}
