<?php
// File: app/Http/Controllers/Student/ApplicationController.php
namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Hostel, Room};
use App\Services\Housing\ApplicationService;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Cache;
use Inertia\{Inertia, Response};

class ApplicationController extends Controller
{
    public function __construct(private ApplicationService $applicationService) {}

    /**
     * S5a — Application List
     * Route: GET /student/applications
     */
    public function index(Request $request): Response
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        $applications = Application::where('student_id', $student->id)
            ->when($term, fn($q) => $q->where('academic_term_id', $term->id))
            ->with(['hostel', 'academicTerm.academicYear', 'allocation.room'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($app) => [
                'id'               => $app->id,
                'hostel_id'        => $app->hostel_id,
                'hostel_name'      => $app->hostel->name,
                'hostel_type'      => $app->hostel->hostel_type,
                'term_name'        => $app->academicTerm->name,
                'academic_year'    => $app->academicTerm->academicYear->label,
                'status'           => $app->status,
                'waitlist_position'=> $app->waitlist_position,
                'created_at'       => $app->created_at->toDateString(),
            ]);

        return Inertia::render('Student/Application/Index', [
            'applications' => $applications,
            'currentTerm'  => $term ? ['id' => $term->id, 'name' => $term->name] : null,
        ]);
    }

    /**
     * S5b — Application Detail
     * Route: GET /student/applications/{application}
     */
    public function show(Request $request, Application $application): Response
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);

        $application->load([
            'hostel', 'academicTerm.academicYear',
            'preferredRoom', 'allocation.room', 'allocation.hostel',
        ]);

        return Inertia::render('Student/Application/Show', [
            'application' => [
                'id'                      => $application->id,
                'form_id'                 => $application->form_id,
                'hostel_id'               => $application->hostel_id,
                'hostel_name'             => $application->hostel->name,
                'hostel_type'             => $application->hostel->hostel_type,
                'hostel_location'         => $application->hostel->location,
                'term_name'               => $application->academicTerm->name,
                'academic_year'           => $application->academicTerm->academicYear->label,
                'status'                  => $application->status,
                'waitlist_position'       => $application->waitlist_position,
                'notes'                   => $application->notes,
                'preferences'             => $application->preferences,
                'special_needs'           => $application->special_needs,
                'dean_permission_granted' => $application->dean_permission_granted,
                'permission_notes'        => $application->permission_notes,
                'created_at'              => $application->created_at->toDateTimeString(),
                'updated_at'              => $application->updated_at->toDateTimeString(),
                'allocation'              => $application->allocation ? [
                    'id'          => $application->allocation->id,
                    'hostel_name' => $application->allocation->hostel->name,
                    'room_number' => $application->allocation->room->room_number,
                    'bed_number'  => $application->allocation->bed_number,
                    'status'      => $application->allocation->status,
                ] : null,
            ],
        ]);
    }

    /**
     * S4 — New Application Form
     * Route: GET /student/applications/create?hostel_id={id}&room_id={id}
     * D0 redirect, D2 redirect, D7 flag, plus draft recovery
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $student  = $request->user()->student;
        $term     = AcademicTerm::current();
        $hostelId = $request->query('hostel_id');
        $roomId   = $request->query('room_id');

        abort_if(!$term, 404, 'No active academic term found.');

        $hostel = Hostel::active()->findOrFail($hostelId); //throws 404 error page in certain cases

        // D0: Active allocation check
        $activeAllocation = $student->activeAllocationForTerm($term->id);
        if ($activeAllocation) {
            return redirect()->route('student.allocation.show')
                ->with('warning', 'You already have an active allocation this semester.');
        }

        // D2: Already applied to this hostel?
        $existingApplication = $student->applicationForHostel($hostel->id, $term->id);
        if ($existingApplication) {
            return redirect()->route('student.applications.show', $existingApplication->id)
                ->with('info', 'You have already applied to this hostel this term.');
        }

        $windowOpen = $hostel->isApplicationWindowOpen($term);

        // D7: Non-first-year + campus hostel
        $requiresRenewal = !$student->is_first_year && $hostel->hostel_type === 'campus-managed';

        $rooms = Room::where('hostel_id', $hostel->id)
            ->where('is_active', true)
            ->where(fn($q) => $q
                ->whereNull('gender_override')
                ->orWhere('gender_override', 'mixed')
                ->orWhere('gender_override', $student->gender)
            )
            ->get(['id', 'room_number', 'floor', 'room_type', 'capacity', 'gender_override']);

        $campusBedsAvailable = $hostel->hostel_type === 'affiliated'
            ? Hostel::active()->campus()->get()->sum(fn($h) => $h->availableBedCount($term->id))
            : null;

        $draft = null;
        if ($request->query('form_id')) {
            $draftApp = Application::where('form_id', $request->query('form_id'))
                ->where('student_id', $student->id)
                ->first();
            $draft = $draftApp?->draft_data;
        }

        return Inertia::render('Student/Application/Create', [
            'hostel' => [
                'id'                        => $hostel->id,
                'name'                      => $hostel->name,
                'slug'                      => $hostel->slug,
                'hostel_type'               => $hostel->hostel_type,
                'gender_policy'             => $hostel->gender_policy,
                'location'                  => $hostel->location,
                'price_per_semester'        => $hostel->price_per_semester,
                'image_path'                => $hostel->image_path,
                'is_application_window_open'=> $windowOpen,
            ],
            'rooms'               => $rooms,
            'currentTerm'         => [
                'id'           => $term->id,
                'name'         => $term->name,
                'academic_year'=> $term->academicYear->label,
            ],
            'student'             => [
                'id'            => $student->id,
                'gender'        => $student->gender,
                'is_first_year' => $student->is_first_year,
                'year_of_study' => $student->year_of_study,
            ],
            'windowOpen'          => $windowOpen,
            'requiresRenewal'     => $requiresRenewal,
            'campusBedsAvailable' => $campusBedsAvailable,
            'draft'               => $draft,
            'selectedRoomId'      => $roomId ? (int) $roomId : null,
        ]);
    }

    /**
     * SYS-1 — Submit Application
     * Route: POST /student/applications
     */
    public function store(Request $request): RedirectResponse
    {
        $hostel  = Hostel::findOrFail($request->integer('hostel_id'));
        $student = $request->user()->student;

        // BR-G: Gender policy enforcement (hostel scope is authoritative)
        if ($hostel->gender_scope !== 'mixed' && $hostel->gender_scope !== $student->gender) {
            abort(403, 'This hostel does not accept students of your gender.');
        }

        $request->validate([
            'hostel_id'         => 'required|integer|exists:hostels,id',
            'preferred_room_id' => 'nullable|integer|exists:rooms,id',
            'notes'             => 'nullable|string|max:1000',
            'preferences'       => 'nullable|array',
            'special_needs'     => 'nullable|string|max:500',
        ]);

        $student = $request->user()->student;
        $term    = AcademicTerm::current();
        abort_if(!$term, 422, 'No active academic term.');

        $hostel = Hostel::active()->findOrFail($request->hostel_id);

        $application = $this->applicationService->create($student, $hostel, $term, $request->all());

        Cache::forget("student_dashboard:{$student->id}:{$term->id}");

        return redirect()->route('student.applications.show', $application->id)
            ->with('success', 'Your application has been submitted successfully.');
    }

    /**
     * Auto-save draft
     * Route: PATCH /student/applications/draft/{formId}
     */
    public function saveDraft(Request $request, string $formId): \Illuminate\Http\JsonResponse
    {
        $student = $request->user()->student;

        Application::firstOrCreate(
            ['form_id' => $formId, 'student_id' => $student->id],
            [
                'hostel_id'        => $request->hostel_id,
                'academic_term_id' => AcademicTerm::current()?->id,
                'status'           => Application::STATUS_PENDING,
                'draft_data'       => $request->all(),
                'last_saved_at'    => now(),
            ]
        );

        if (isset($request->hostel_id)) {
            $this->applicationService->saveDraft($formId, $request->all());
        }

        return response()->json(['saved_at' => now()->toTimeString()]);
    }
}
