<?php
//app/HTTP/Controllers/Admin/ApplicationController.php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\Allocation;
use App\Models\Application;
use App\Services\Housing\{ AllocationService, ApplicationService };
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function __construct(
        private readonly AllocationService $allocationService,
        private readonly ApplicationService $applicationService,
    ) {}

    /** A2 — Applications List */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Application::class);

        $termId = $request->integer('term_id') ?: AcademicTerm::current()?->id;

        $applications = Application::query()
            ->with(['student.user', 'hostel', 'academicTerm'])
            // GUARD: never surface auto-saved drafts in the admin queue — a
            // draft has no finalized preferences/room selections yet, and
            // Tinker confirmed at least one draft (id 2) reached admin
            // review only because this scope was missing here.
            ->submitted()
            ->when($termId, fn ($q) => $q->where('academic_term_id', $termId))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('gender'), fn ($q) =>
                $q->whereHas('student', fn ($s) => $s->where('gender', $request->string('gender'))))
            ->when($request->filled('hostel_preference'), fn ($q) =>
                $q->whereHas('hostel', fn ($h) =>
                    $h->where('name', 'like', '%' . $request->string('hostel_preference') . '%')))
            ->scopeByAdminRole($request->user())
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $pendingCount = Application::where('status', 'pending')
            ->submitted() // GUARD: same reasoning — drafts are never "pending" in the admin sense
            ->when($termId, fn ($q) => $q->where('academic_term_id', $termId))
            ->count();

        return Inertia::render('Admin/Applications/Index', [
            'applications' => $applications,
            'filters'      => $request->only(['status', 'term_id', 'gender', 'hostel_preference']),
            'pendingCount' => $pendingCount,
            'canRunBatch'  => $request->user()->can('process applications'),
        ]);
    }

    /** Application detail */
    public function show(Application $application): Response
    {
        $this->authorize('view', $application);

        // GUARD: block navigating to a draft's admin detail page directly by
        // URL/id — mirrors the same protection applied to index() and approve().
        abort_if($application->is_draft, 404, 'This application has not been submitted yet.');

        $application->load([
            'student.user',
            'hostel',
            'academicTerm',
            'allocation.bed',
            'allocation.room',
        ]);

        return Inertia::render('Admin/Applications/Show', [
            'application' => [
                'id'               => $application->id,
                'status'           => $application->status,
                'waitlist_position'=> $application->waitlist_position,
                'created_at'       => $application->created_at->toIso8601String(),
                'updated_at'       => $application->updated_at->toIso8601String(),
                'student' => [
                    'id'             => $application->student->id,
                    'student_number' => $application->student->student_number,
                    'gender'         => $application->student->gender,
                    'year_of_study'  => $application->student->year_of_study,
                    'programme'      => $application->student->programme,
                    'user'           => [
                        'id'    => $application->student->user->id,
                        'name'  => $application->student->user->name,
                        'email' => $application->student->user->email,
                    ],
                ],
                'hostel' => [
                    'id'              => $application->hostel->id,
                    'name'            => $application->hostel->name,
                    'slug'            => $application->hostel->slug,
                    'location'        => $application->hostel->location,
                    'gender_scope'    => $application->hostel->gender_scope,
                    'management_type' => $application->hostel->management_type,
                ],
                'academic_term' => [
                    'id'   => $application->academicTerm->id,
                    'name' => $application->academicTerm->name,
                ],
                'allocation' => $application->allocation ? [
                    'id'           => $application->allocation->id,
                    'status'       => $application->allocation->status,
                    'bed_label'    => $application->allocation->bed?->label,
                    'room_number'  => $application->allocation->room?->room_number,
                    'checked_in_at'=> $application->allocation->checked_in_at?->toIso8601String(),
                ] : null,
                'room_type' => $application->room_type,
            ],
            'canProcess' => auth()->user()->can('process applications'),
        ]);
    }

    /** ASYS-2 — Approve */
    /** UPDATED: approve() now delegates the bed decision entirely to
     *  AllocationService::create() — this controller never decides random
     *  vs specific vs waitlist itself. */
    public function approve(Request $request, Application $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $validated = $request->validate([
            'notes'                => ['nullable', 'string', 'max:1000'],
            'bed_id'                => ['nullable', 'integer', 'exists:beds,id'],
            'include_other_types'  => ['boolean'],
        ]);

        $application->update([
            'permission_notes' => $validated['notes'] ?? $application->permission_notes,
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
            ? 'Application approved and student allocated.'
            : 'Application approved — no compatible bed available, student moved to the waitlist.';

        return back()->with('success', $message);
    }

    /** ASYS-3 — Reject */
    /** UPDATED: reject() now delegates to ApplicationService::reject(),
     *  which itself delegates allocation cancellation to AllocationService —
     *  the controller performs zero allocation logic directly. */
    public function reject(Request $request, Application $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);

        $this->applicationService->reject($application, $validated['reason']);

        return back()->with('success', 'Application rejected.');
    }
}
