<?php
// File: app/Http/Controllers/Student/MaintenanceController.php
namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Allocation, MaintenanceComment, MaintenanceRequest};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class MaintenanceController extends Controller
{
    /** BR-10 gate: student must have an active allocation. */
    private function enforceMaintenanceAccess(Request $request): \App\Models\Student
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        if (!$term) abort(403, 'No active academic term.');

        $allocation = $student->activeAllocationForTerm($term->id);

        if (!$allocation || !$allocation->canAccessMaintenance()) {
            abort(403, 'BR-10: You must have an active allocation to access maintenance features.');
        }

        return $student;
    }

    /**
     * S8 — Maintenance List (SYS-0c)
     * Route: GET /student/maintenance
     */
    public function index(Request $request): Response
    {
        $student    = $this->enforceMaintenanceAccess($request);
        $term       = AcademicTerm::current();
        $allocation = $student->activeAllocationForTerm($term->id);

        $requests = MaintenanceRequest::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with(['hostel', 'room'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'subject'     => $r->subject,
                'status'      => $r->status,
                'priority'    => $r->priority,
                'hostel_name' => $r->hostel->name,
                'room_number' => $r->room->room_number,
                'created_at'  => $r->created_at->toDateString(),
                'resolved_at' => $r->resolved_at?->toDateString(),
            ]);

        return Inertia::render('Student/Maintenance/Index', [
            'requests'    => $requests,
            'allocation'  => [
                'hostel_name' => $allocation->hostel->name,
                'room_number' => $allocation->room->room_number,
            ],
            'currentTerm' => ['id' => $term->id, 'name' => $term->name],
        ]);
    }

    /**
     * S7 — Maintenance Create Form
     * Route: GET /student/maintenance/create
     */
    public function create(Request $request): Response
    {
        $student    = $this->enforceMaintenanceAccess($request);
        $term       = AcademicTerm::current();
        $allocation = $student->activeAllocationForTerm($term->id);

        return Inertia::render('Student/Maintenance/Create', [
            'allocation'  => [
                'id'          => $allocation->id,
                'hostel_id'   => $allocation->hostel_id,
                'hostel_name' => $allocation->hostel->name,
                'room_number' => $allocation->room->room_number,
            ],
            'currentTerm' => ['id' => $term->id, 'name' => $term->name],
        ]);
    }

    /**
     * SYS-3 — Submit Maintenance Request
     * Route: POST /student/maintenance
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'subject'     => 'required|string|max:255',
            'description' => 'required|string|max:3000',
            'priority'    => 'nullable|in:low,medium,high,urgent',
        ]);

        $student    = $this->enforceMaintenanceAccess($request);
        $term       = AcademicTerm::current();
        $allocation = $student->activeAllocationForTerm($term->id);

        $mr = MaintenanceRequest::create([
            'student_id'       => $student->id,
            'allocation_id'    => $allocation->id,
            'hostel_id'        => $allocation->hostel_id,
            'room_id'          => $allocation->room_id,
            'academic_term_id' => $term->id,
            'subject'          => $request->subject,
            'description'      => $request->description,
            'priority'         => $request->priority ?? 'medium',
            'status'           => MaintenanceRequest::STATUS_OPEN,
        ]);

        return redirect()->route('student.maintenance.show', $mr->id)
            ->with('success', 'Maintenance request submitted successfully.');
    }

    /**
     * S9 — Maintenance Detail
     * Route: GET /student/maintenance/{maintenanceRequest}
     */
    public function show(Request $request, MaintenanceRequest $maintenanceRequest): Response
    {
        $student = $this->enforceMaintenanceAccess($request);
        abort_if($maintenanceRequest->student_id !== $student->id, 403);

        $maintenanceRequest->load(['hostel', 'room', 'comments.user']);

        return Inertia::render('Student/Maintenance/Show', [
            'maintenanceRequest' => [
                'id'          => $maintenanceRequest->id,
                'subject'     => $maintenanceRequest->subject,
                'description' => $maintenanceRequest->description,
                'status'      => $maintenanceRequest->status,
                'priority'    => $maintenanceRequest->priority,
                'hostel_name' => $maintenanceRequest->hostel->name,
                'room_number' => $maintenanceRequest->room->room_number,
                'created_at'  => $maintenanceRequest->created_at->toDateTimeString(),
                'resolved_at' => $maintenanceRequest->resolved_at?->toDateTimeString(),
                'closed_at'   => $maintenanceRequest->closed_at?->toDateTimeString(),
                'comments'    => $maintenanceRequest->comments
                    ->where('is_internal', false)
                    ->map(fn($c) => [
                        'id'         => $c->id,
                        'body'       => $c->body,
                        'user_name'  => $c->user->name,
                        'is_mine'    => $c->user_id === $request->user()->id,
                        'created_at' => $c->created_at->toDateTimeString(),
                        'updated_at' => $c->updated_at->toDateTimeString(),
                    ]),
            ],
        ]);
    }

    /**
     * Add Comment — Route: POST /student/maintenance/{maintenanceRequest}/comments
     */
    public function addComment(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $request->validate(['body' => 'required|string|max:1000']);
        $student = $this->enforceMaintenanceAccess($request);
        abort_if($maintenanceRequest->student_id !== $student->id, 403);

        MaintenanceComment::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id'                => $request->user()->id,
            'body'                   => $request->body,
        ]);

        return back()->with('success', 'Comment added.');
    }

    /**
     * Edit Comment — Route: PATCH /student/maintenance/comments/{comment}
     */
    public function updateComment(Request $request, MaintenanceComment $comment): RedirectResponse
    {
        $request->validate(['body' => 'required|string|max:1000']);
        abort_if($comment->user_id !== $request->user()->id, 403, 'You can only edit your own comments.');
        $comment->update(['body' => $request->body]);
        return back()->with('success', 'Comment updated.');
    }

    /**
     * Delete Comment — Route: DELETE /student/maintenance/comments/{comment}
     */
    public function destroyComment(Request $request, MaintenanceComment $comment): RedirectResponse
    {
        abort_if($comment->user_id !== $request->user()->id, 403, 'You can only delete your own comments.');
        $comment->delete();
        return back()->with('success', 'Comment deleted.');
    }
}
