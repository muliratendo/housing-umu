<?php
// File: app/Http/Controllers/Student/ApplicationController.php  — REPLACE existing.
// Fixes applied:
//  1. Room query in create(): gender_override → gender_scope (correct column name)
//  2. Room select in create(): removed gender_override, added gender_scope
//  3. 'floor' remains in select — valid now that migration adds it
//
// NEW (storefront redesign):
//  4. create() now requires ?room_type= (forwarded from the Hostel Detail "product"
//     card) instead of an optional ?room_id=. The room *category* (standard /
//     self-contained / apartment) is chosen on the Hostel Detail page; occupancy
//     (single/double) and, optionally, up to 3 preferred specific rooms are chosen
//     here on the application form.
//  5. Eligible rooms are still fetched here (scoped to hostel + room_type + gender)
//     so the frontend can render the "preferred rooms" picker once the student
//     toggles it on and selects an occupancy — no extra round trip is needed.
//  6. store() now validates `room_type`, `capacity` (occupancy), and an optional
//     `preferred_room_ids` array capped at 3 entries. Each preferred room id is
//     re-validated server-side against hostel/type/capacity/gender eligibility to
//     prevent a tampered request from attaching an ineligible room.


namespace App\Http\Controllers\Student;


use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Hostel, Room};
use App\Services\Housing\ApplicationService;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Cache;
use Inertia\{Inertia, Response};


class ApplicationController extends Controller
{
    /** NEW: preferred rooms are capped at 3 — mirrors a "contact card" add-up-to-N pattern on the frontend. */
    private const MAX_PREFERRED_ROOMS = 3;


    public function __construct(private ApplicationService $applicationService) {}


    /**
     * S5a — Application List
     * Route: GET /student/applications
     */
    public function index(Request $request): Response
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();


        // Subitted applications
        $submitted = Application::where('student_id', $student->id)
            ->submitted() // NEW: is_draft = false
            ->when($term, fn($q) => $q->where('academic_term_id', $term->id))
            ->with(['hostel', 'academicTerm.academicYear', 'allocation.room'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($app) => [
                'id'                => $app->id,
                'hostel_id'         => $app->hostel_id,
                'hostel_slug'       => $app->hostel->slug,
                'hostel_name'       => $app->hostel->name,
                'hostel_type'       => $app->hostel->hostel_type,
                'term_name'         => $app->academicTerm->name,
                'academic_year'     => $app->academicTerm->academicYear->label,
                'status'            => $app->status,
                'waitlist_position' => $app->waitlist_position,
                'created_at'        => $app->created_at->toDateString(),
                // NEW: drives which action buttons render per row
                'can_be_withdrawn'  => $app->canBeWithdrawn(),
                'can_be_resubmitted'=> $app->canBeResubmitted(),
            ]);

        // NEW: auto-saved drafts — resumable or deletable, shown in a separate section
        $drafts = Application::where('student_id', $student->id)
            ->drafts() // NEW: is_draft = true
            ->when($term, fn($q) => $q->where('academic_term_id', $term->id))
            ->with(['hostel'])
            ->orderByDesc('last_saved_at')
            ->get()
            ->map(fn($app) => [
                'id'            => $app->id,
                'form_id'       => $app->form_id,
                'hostel_name'   => $app->hostel?->name,
                'room_type'     => $app->draft_data['room_type'] ?? null,
                'last_saved_at' => $app->last_saved_at?->diffForHumans(),
            ]);

        return Inertia::render('Student/Application/Index', [
            'applications' => $submitted,
            'drafts'       => $drafts, // NEW
            'currentTerm'  => $term ? ['id' => $term->id, 'name' => $term->name] : null,
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
            'preferredRoom', 'preferredRooms', 'allocation.room', 'allocation.hostel',
        ]);


        return Inertia::render('Student/Application/Show', [
            'application' => [
                'id'                      => $application->id,
                'form_id'                 => $application->form_id,
                'hostel_id'               => $application->hostel_id,
                // NEW: slug is required for the "View Hostel" link on this page
                // to build a valid student.hostels.show route — hostel_id alone
                // is not guaranteed to be what that route expects if it binds
                // by slug (see public.hostels.show for the equivalent pattern).
                'hostel_slug'             => $application->hostel->slug,
                'hostel_name'             => $application->hostel->name,
                'hostel_type'             => $application->hostel->hostel_type, // accessor
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
                // NEW: room category + occupancy chosen on the application form
                'room_type'               => $application->room_type,
                'capacity'                => $application->capacity,
                // NEW: up to 3 preferred rooms, in priority order (primary first)
                'preferred_rooms'         => $application->preferredRooms
                    ->map(fn($r) => [
                        'id'          => $r->id,
                        'room_number' => $r->room_number,
                        'floor'       => $r->floor,
                        'is_primary'  => (bool) $r->pivot->is_primary,
                        'priority'    => $r->pivot->priority,
                    ])
                    ->values(),
                'created_at'              => $application->created_at->toDateTimeString(),
                'updated_at'              => $application->updated_at->toDateTimeString(),
                'allocation' => $application->allocation ? [
                    'id'          => $application->allocation->id,
                    'hostel_name' => $application->allocation->hostel->name,
                    'room_number' => $application->allocation->room->room_number,
                    'bed_number'  => $application->allocation->bed_number,
                    'status'      => $application->allocation->status,
                ] : null,
                'is_draft'           => $application->is_draft,          // NEW
                'can_be_withdrawn'   => $application->canBeWithdrawn(),  // NEW
                'can_be_resubmitted' => $application->canBeResubmitted(),// NEW
                'can_be_edited'      => $application->canBeEdited(),     // NEW
            ],
        ]);
    }


    /**
     * S4 — New Application Form
     * Route: GET /student/applications/create?hostel_id={id}&room_type={type}
     *
     * NEW: room_type is now required — it identifies which storefront "product"
     * category (standard / self-contained / apartment) the student clicked "Apply"
     * on from the Hostel Detail page. This page is where occupancy (single/double)
     * is chosen, and where the student may optionally toggle on a "request specific
     * rooms" section to pick up to 3 preferred rooms matching their chosen category
     * and occupancy.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $student  = $request->user()->student;
        $term     = AcademicTerm::current();
        $hostelId = $request->query('hostel_id');
        $roomType = $request->query('room_type');


        abort_if(! $term, 404, 'No active academic term found.');
        abort_if(! $roomType, 422, 'A room category must be selected from the hostel page.');


        $hostel = Hostel::active()->findOrFail($hostelId);


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
        $requiresRenewal = ! $student->is_first_year
            && $hostel->hostel_type === Hostel::TYPE_CAMPUS; // accessor-safe


        // FIX: gender_override → gender_scope (correct column name)
        // NEW: scoped to the chosen room_type category as well, since occupancy and
        // preferred-room selection both happen within a single category on this page.
        $rooms = Room::where('hostel_id', $hostel->id)
            ->where('room_type', $roomType)
            ->where('is_active', true)
            ->where(fn($q) => $q
                ->whereNull('gender_scope')
                ->orWhere('gender_scope', 'mixed')
                ->orWhere('gender_scope', $student->gender)
            )
            // FIX: select uses gender_scope and floor (floor now exists via migration)
            ->get(['id', 'room_number', 'floor', 'room_type', 'capacity', 'gender_scope', 'price_per_semester']);


        abort_if($rooms->isEmpty(), 404, 'No eligible rooms found in this category.');


        // NEW: occupancy options available within this category, each with its price —
        // powers the "single / double" selector on the application form.
        $occupancyOptions = $rooms
            ->pluck('capacity')
            ->unique()
            ->sort()
            ->values()
            ->map(fn($c) => [
                'capacity' => $c,
                'label'    => $c === 1 ? 'Single' : 'Double',
                'price'    => $rooms->where('capacity', $c)->min('price_per_semester'),
            ]);


        $campusBedsAvailable = $hostel->hostel_type === Hostel::TYPE_AFFILIATED
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
                'id'                         => $hostel->id,
                'name'                       => $hostel->name,
                'slug'                       => $hostel->slug,
                'hostel_type'                => $hostel->hostel_type,   // accessor
                'gender_policy'              => $hostel->gender_policy, // accessor
                'location'                   => $hostel->location,
                'price_per_semester'         => $hostel->price_per_semester, // accessor
                'image_path'                 => $hostel->image_path,    // accessor
                'is_application_window_open' => $windowOpen,
            ],
            // NEW: the chosen storefront category, carried through from the hostel page
            'roomType'            => $roomType,
            // NEW: occupancy choices within this category (drives the single/double step)
            'occupancyOptions'    => $occupancyOptions,
            // NEW: eligible rooms in this category — the frontend filters these by the
            // selected occupancy when the student toggles on "request specific rooms"
            'rooms'               => $rooms,
            'maxPreferredRooms'   => self::MAX_PREFERRED_ROOMS,
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
        ]);
    }


    /**
     * SYS-1 — Submit Application
     * Route: POST /student/applications
     *
     * FIX: store() previously never looked up the draft row created by
     * saveDraft() under the same form_id — it always called
     * applicationService->create() as a pure insert. This left every
     * autosaved draft permanently orphaned at is_draft: true, since nothing
     * ever flipped it to a real submission. That orphaned draft (id 2, per
     * Tinker inspection) is what an admin later approved with no finalized
     * preferences, crashing AllocationService::resolveAvailableBed().
     *
     * The fix: resolve the existing draft by form_id + student BEFORE
     * calling the service, and pass its id through as
     * existing_application_id so the service updates that SAME row in
     * place. Submitting is now always a finalize-in-place operation, never
     * a parallel insert — draft and submission can no longer diverge.
     */
    public function store(Request $request): RedirectResponse
    {
        $hostel  = Hostel::findOrFail($request->integer('hostel_id'));
        $student = $request->user()->student;

        // BR-G: Gender policy enforcement (hostel scope is authoritative)
        if ($hostel->gender_scope !== 'mixed' && $hostel->gender_scope !== $student->gender) {
            abort(403, 'This hostel does not accept students of your gender.');
        }

        $validated = $request->validate([
            'hostel_id'            => 'required|integer|exists:hostels,id',
            'room_type'            => 'required|string|in:standard,self-contained,apartment',
            'capacity'             => 'required|integer|min:1|max:2',
            'preferred_room_ids'   => 'nullable|array|max:' . self::MAX_PREFERRED_ROOMS,
            'preferred_room_ids.*' => 'integer|exists:rooms,id',
            'notes'                => 'nullable|string|max:1000',
            'preferences'          => 'nullable|array',
            'special_needs'        => 'nullable|string|max:500',
            // NEW: accept the form's tracked draft identifier, sent alongside
            // the final submit payload from Create.tsx's formId.current.
            'form_id'            => ['nullable', 'string'],
        ]);

        $student = $request->user()->student;
        $term    = AcademicTerm::current();
        abort_if(! $term, 422, 'No active academic term.');

        $hostel = Hostel::active()->findOrFail($request->hostel_id);

        // NEW: server-side re-validation of each preferred room against the chosen
        // hostel, category, occupancy, and the student's gender eligibility. Any
        // room id that fails this check is silently dropped rather than trusted.
        $eligiblePreferredRooms = collect();
        if (! empty($validated['preferred_room_ids'])) {
            $eligiblePreferredRooms = Room::where('hostel_id', $hostel->id)
                ->where('room_type', $validated['room_type'])
                ->where('capacity', $validated['capacity'])
                ->where('is_active', true)
                ->where(fn ($q) => $q
                    ->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender)
                )
                ->whereIn('id', $validated['preferred_room_ids'])
                ->get(['id']);
        }

        // NEW: preserve the student's chosen priority order (primary first) even
        // though the eligibility query above may reorder results.
        $orderedPreferredRoomIds = collect($validated['preferred_room_ids'] ?? [])
            ->filter(fn ($id) => $eligiblePreferredRooms->pluck('id')->contains($id))
            ->take(self::MAX_PREFERRED_ROOMS)
            ->values()
            ->toArray();

        // NEW: this is the actual fix — resolve the student's own autosaved
        // draft for THIS hostel/term (by form_id if provided, else by the
        // natural student+hostel+term+is_draft key) and forward its id as
        // existing_application_id so create() finalizes it in place instead
        // of tripping BR-2 against its own draft row.
        $existingDraftId = Application::where('student_id', $student->id)
            ->where('hostel_id', $hostel->id)
            ->where('academic_term_id', $term->id)
            ->where('is_draft', true)
            ->when(
                ! empty($validated['form_id']),
                fn ($q) => $q->where('form_id', $validated['form_id'])
            )
            ->value('id');

        $application = $this->applicationService->create($student, $hostel, $term, [
            'room_type'               => $validated['room_type'],
            'capacity'                => $validated['capacity'],
            'preferred_room_ids'      => $orderedPreferredRoomIds,
            'notes'                   => $validated['notes'] ?? null,
            'preferences'             => $validated['preferences'] ?? null,
            'special_needs'           => $validated['special_needs'] ?? null,
            'existing_application_id' => $existingDraftId, // NEW — the missing link for passing BR2 check
        ]);

        Cache::forget("student_dashboard:{$student->id}:{$term->id}");

        return redirect()->route('student.applications.show', $application->id)
            ->with('success', 'Your application has been submitted successfully.');
    }


    /**
     * Auto-save draft
     * Route: PATCH /student/applications/draft/{formId}
     *
     * FIX: previously threw an unguarded QueryException whenever
     * AcademicTerm::current() returned null (no active term), since
     * academic_term_id is NOT NULL on the applications table — this
     * surfaced to the frontend only as a generic Axios 500 with no detail.
     * Now explicitly checks for a current term and returns a clean JSON
     * error instead of letting the DB throw.
     */
    public function saveDraft(Request $request, string $formId): \Illuminate\Http\JsonResponse
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        if (! $term) {
            return response()->json([
                'error' => 'No active academic term. Draft could not be saved.',
            ], 422);
        }

        try {
            // FIX: lookup must match the table's actual unique constraint
            // (student_id, hostel_id, academic_term_id) — NOT form_id.
            // form_id changes every time the Create page mounts fresh (no
            // draft resumed), so matching on it let firstOrCreate attempt a
            // second INSERT for the same student+hostel+term and collide
            // with uq_student_hostel_term. Matching on the real constraint
            // means a second autosave always finds and updates the SAME
            // row, and form_id itself just gets refreshed onto it.
            $application = Application::where('student_id', $student->id)
                ->where('hostel_id', $request->hostel_id)
                ->where('academic_term_id', $term->id)
                ->where('is_draft', true)
                ->first();

            if ($application) {
                $application->update([
                    'form_id'       => $formId, // keep client's formId as source of truth going forward
                    'draft_data'    => $request->all(),
                    'last_saved_at' => now(),
                ]);
            } else {
                $application = Application::create([
                    'form_id'          => $formId,
                    'student_id'       => $student->id,
                    'hostel_id'        => $request->hostel_id,
                    'academic_term_id' => $term->id,
                    'status'           => Application::STATUS_PENDING,
                    'is_draft'         => true,
                    'draft_data'       => $request->all(),
                    'last_saved_at'    => now(),
                ]);
            }

            return response()->json([
                'saved_at' => now()->toTimeString(),
                // FIX: hand the canonical form_id back to the frontend in
                // case it just adopted an existing draft's id instead of
                // its own freshly-generated one (see Create.tsx change below).
                'form_id'  => $application->form_id,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Draft auto-save failed', [
                'form_id' => $formId,
                'error'   => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Failed to save draft.'], 500);
        }
    }

    /**
     * NEW: resume an auto-saved draft — redirects back to the Create form
     * carrying the draft's form_id so its autosaved state is reloaded, plus
     * the hostel_id/room_type needed to satisfy create()'s required params.
     * Route: GET /student/applications/{application}/resume
     */
    public function resume(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);
        abort_unless($application->is_draft, 404, 'This application has already been submitted.');

        return redirect()->route('student.applications.create', [
            'hostel_id' => $application->hostel_id,
            'room_type' => $application->draft_data['room_type'] ?? null,
            'form_id'   => $application->form_id,
        ]);
    }

    /**
     * NEW: finalizes a draft directly from the Edit page. Mirrors store()'s
     * create() call, but pulls room_type/capacity from draft_data (already
     * chosen at Create.tsx time and locked/read-only on this page) instead of
     * from the request body, and always passes existing_application_id so
     * create() finalizes THIS row rather than inserting a new one.
     * Route: POST student/applications/{application}/submit
     */
    public function submitDraft(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);
        abort_unless($application->is_draft, 404, 'This application has already been submitted.');

        $validated = $request->validate([
            'notes'                 => ['nullable', 'string', 'max:1000'],
            'special_needs'         => ['nullable', 'string', 'max:500'],
            'preferred_room_ids'    => ['nullable', 'array', 'max:' . self::MAX_PREFERRED_ROOMS],
            'preferred_room_ids.*'  => ['integer', 'exists:rooms,id'],
        ]);

        $hostel = $application->hostel;
        $term   = $application->academicTerm;

        // room_type/capacity were chosen on Create.tsx and only ever live in
        // draft_data until finalization — never on the real columns yet.
        $roomType = $application->draft_data['room_type'] ?? null;
        $capacity = $application->draft_data['capacity'] ?? null;

        abort_if(
            ! $roomType || ! $capacity,
            422,
            'Incomplete draft — room category and occupancy were never selected. Please start a new application.'
        );

        if ($hostel->gender_scope !== 'mixed' && $hostel->gender_scope !== $student->gender) {
            abort(403, 'This hostel does not accept students of your gender.');
        }

        $eligiblePreferredRooms = collect();
        if (! empty($validated['preferred_room_ids'])) {
            $eligiblePreferredRooms = Room::where('hostel_id', $hostel->id)
                ->where('room_type', $roomType)
                ->where('capacity', $capacity)
                ->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender))
                ->whereIn('id', $validated['preferred_room_ids'])
                ->pluck('id');
        }

        $orderedPreferredRoomIds = collect($validated['preferred_room_ids'] ?? [])
            ->filter(fn ($id) => $eligiblePreferredRooms->contains($id))
            ->take(self::MAX_PREFERRED_ROOMS)
            ->values()
            ->toArray();

        try {
            $result = $this->applicationService->create($student, $hostel, $term, [
                'room_type'               => $roomType,
                'capacity'                => $capacity,
                'preferred_room_ids'      => $orderedPreferredRoomIds,
                'notes'                   => $validated['notes'] ?? null,
                'special_needs'           => $validated['special_needs'] ?? null,
                'existing_application_id' => $application->id, // NEW — finalizes THIS row
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        return redirect()->route('student.applications.show', $result->id)
            ->with('success', 'Your application has been submitted successfully.');
    }


    /**
     * NEW: delete (soft delete) an auto-saved draft. Never permitted on a
     * formally submitted application — those must go through withdraw().
     * Route: DELETE /student/applications/{application}/draft
     */
    public function destroyDraft(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);

        $this->applicationService->deleteDraft($application);

        return redirect()->route('student.applications.index')
            ->with('success', 'Draft deleted.');
    }

    /**
     * NEW: withdraw a submitted application. Row is never deleted — status
     * flips to 'withdrawn' and remains visible/re-submittable.
     * Route: POST /student/applications/{application}/withdraw
     */
    public function withdraw(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);

        try {
            $this->applicationService->withdraw($application);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        return redirect()->route('student.applications.show', $application->id)
            ->with('success', 'Your application has been withdrawn.');
    }

    /**
     * NEW: re-submit a previously withdrawn application.
     * Route: POST /student/applications/{application}/resubmit
     * extend to persist edits before flipping status
     */
    public function resubmit(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);

        // NEW: accept the same editable fields Edit.tsx sends alongside the
        // resubmit action — without this, edits made on this page before
        // clicking "Re-submit" would be silently discarded, since resubmit()
        // on its own only ever flips status/waitlist_position.
        $validated = $request->validate([
            'notes'                => ['nullable', 'string', 'max:1000'],
            'special_needs'        => ['nullable', 'string', 'max:500'],
            'preferred_room_ids'   => ['nullable', 'array'],
            'preferred_room_ids.*' => ['integer', 'exists:rooms,id'],
        ]);

        try {
            if (! empty($validated)) {
                $this->applicationService->edit($application, $validated);
            }
            $this->applicationService->resubmit($application->refresh());
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        return redirect()->route('student.applications.show', $application->id)
            ->with('success', 'Your application has been re-submitted.');
    }

    /**
     * NEW: update a draft, pending, or withdrawn application's editable
     * fields (notes, preferences, special needs, preferred rooms).
     * Route: PATCH /student/applications/{application}
     */
    public function update(Request $request, Application $application): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);

        $validated = $request->validate([
            'notes'                => 'nullable|string|max:1000',
            'preferences'          => 'nullable|array',
            'special_needs'        => 'nullable|string|max:500',
            'preferred_room_ids'   => 'nullable|array|max:' . self::MAX_PREFERRED_ROOMS,
            'preferred_room_ids.*' => 'integer|exists:rooms,id',
        ]);

        try {
            $this->applicationService->edit($application, $validated);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        return redirect()->route('student.applications.show', $application->id)
            ->with('success', 'Your application has been updated.');
    }

    /**
     * NEW: dedicated edit form for a draft, pending, or withdrawn application.
     * Reuses the same rooms/occupancy data shape as create(), but scoped to
     * the application's ALREADY-CHOSEN hostel + room_type + capacity — those
     * three fields are locked once an application exists; only notes,
     * special_needs, and preferred_room_ids remain editable (see
     * Application::canBeEdited() and ApplicationService::edit()).
     * Route: GET /student/applications/{application}/edit
     */
    public function edit(Request $request, Application $application): Response
    {
        $student = $request->user()->student;
        abort_if($application->student_id !== $student->id, 403);
        abort_unless($application->canBeEdited(), 403, 'This application can no longer be edited.');

        $application->load(['hostel', 'preferredRooms', 'academicTerm.academicYear']);

        // NEW: room_type/capacity are read from the application itself (or its
        // draft_data if it's still a draft that never finished checkout) rather
        // than from the query string, since those choices are locked at this point.
        $roomType = $application->is_draft
            ? ($application->draft_data['room_type'] ?? null)
            : $application->preferredRooms->first()?->room_type
                ?? $application->preferredRoom?->room_type;

        $capacity = $application->is_draft
            ? ($application->draft_data['capacity'] ?? null)
            : $application->preferredRooms->first()?->capacity
                ?? $application->preferredRoom?->capacity;

        // FIX: gender_override → gender_scope; scoped to the application's own
        // locked room_type + capacity so the preferred-rooms picker only offers
        // rooms consistent with what was already chosen at checkout.
        $rooms = Room::where('hostel_id', $application->hostel_id)
            ->where('room_type', $roomType)
            ->where('capacity', $capacity)
            ->where('is_active', true)
            ->where(fn($q) => $q
                ->whereNull('gender_scope')
                ->orWhere('gender_scope', 'mixed')
                ->orWhere('gender_scope', $student->gender)
            )
            ->get(['id', 'room_number', 'floor', 'room_type', 'capacity', 'gender_scope', 'price_per_semester']);

        return Inertia::render('Student/Application/Edit', [
            'application' => [
                'id'                 => $application->id,
                'hostel_name'        => $application->hostel->name,
                'hostel_slug'        => $application->hostel->slug,
                'room_type'          => $roomType,
                'capacity'           => $capacity,
                'notes'              => $application->notes,
                'special_needs'      => $application->special_needs,
                // NEW: existing preferred room ids, in saved priority order
                'preferred_room_ids' => $application->preferredRooms->pluck('id')->values(),
                'is_draft'           => $application->is_draft,
                'status'             => $application->status,
            ],
            // NEW: same shape as Create.tsx's `rooms` prop, locked to this application's category
            'rooms'             => $rooms,
            'maxPreferredRooms' => self::MAX_PREFERRED_ROOMS,
        ]);
    }
}
