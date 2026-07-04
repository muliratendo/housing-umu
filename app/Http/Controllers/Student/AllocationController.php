<?php
// File: app/Http/Controllers/Student/AllocationController.php
namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Allocation, Application, Hostel};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Cache;
use Inertia\{Inertia, Response};

class AllocationController extends Controller
{
    /**
     * S6 — Allocation Status (SYS-0b snapshot)
     * Route: GET /student/allocation
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $student = $request->user()->student;
        $term    = AcademicTerm::current();

        if (!$term) {
            return Inertia::render('Student/Allocation/Show', [
                'allocation'  => null,
                'currentTerm' => null,
                'message'     => 'No active academic term found.',
                'needsCheckIn'         => false,
                'canAccessMaintenance' => false,
                'retentionInfo'        => null,
                'deanPermission'       => null,
                'applications'         => [],
                'termEnded'            => false,
            ]);
        }

        $allocation = $student->activeAllocationForTerm($term->id);
        $canAccessMaintenance = $allocation?->canAccessMaintenance() ?? false;
        $needsCheckIn = $allocation && $allocation->status === Allocation::STATUS_ALLOCATED;
        $termEnded    = $term->hasEnded();

        $applications = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with('hostel')
            ->get();

        $retentionInfo = null;
        if ($allocation?->is_retained) {
            $retentionInfo = [
                'is_retained'      => true,
                'retention_notes'  => $allocation->retention_notes,
                'retained_for_year'=> $term->academicYear->label ?? null,
            ];
        }

        $application = $applications->where('hostel_id', $allocation?->hostel_id)->first();

        return Inertia::render('Student/Allocation/Show', [
            'allocation' => $allocation ? [
                'id'               => $allocation->id,
                'hostel_id'        => $allocation->hostel_id,
                'hostel_name'      => $allocation->hostel->name,
                'hostel_type'      => $allocation->hostel->hostel_type,
                'hostel_location'  => $allocation->hostel->location,
                'room_number'      => $allocation->room->room_number,
                'room_type'        => $allocation->room->room_type,
                'floor'            => $allocation->room->floor,
                'bed_number'       => $allocation->bed_number,
                'status'           => $allocation->status,
                'is_retained'      => $allocation->is_retained,
                'checked_in_at'    => $allocation->checked_in_at?->toDateTimeString(),
                'checked_out_at'   => $allocation->checked_out_at?->toDateTimeString(),
                'is_admin_override'=> $allocation->is_admin_override,
            ] : null,
            'currentTerm' => [
                'id'           => $term->id,
                'name'         => $term->name,
                'academic_year'=> $term->academicYear->label,
                'has_ended'    => $termEnded,
            ],
            'needsCheckIn'         => $needsCheckIn,
            'canAccessMaintenance' => $canAccessMaintenance,
            'retentionInfo'        => $retentionInfo,
            'deanPermission' => $application ? [
                'granted'    => $application->dean_permission_granted,
                'notes'      => $application->permission_notes,
                'granted_at' => $application->permission_granted_at?->toDateString(),
            ] : null,
            'applications' => $applications->map(fn($a) => [
                'id'          => $a->id,
                'hostel_name' => $a->hostel->name,
                'status'      => $a->status,
            ]),
            'termEnded' => $termEnded,
        ]);
    }

    /**
     * SYS-2 — Confirm Check-In
     * Route: POST /student/allocation/{allocation}/check-in
     */
    public function checkIn(Request $request, Allocation $allocation): RedirectResponse
    {
        $student = $request->user()->student;
        abort_if($allocation->student_id !== $student->id, 403);

        $allocation->checkIn();

        Cache::forget("student_dashboard:{$student->id}:{$allocation->academic_term_id}");

        return redirect()->route('student.allocation.show')
            ->with('success', 'Check-in confirmed! Welcome to your room.');
    }

    /**
     * SYS-4 — Request Checkout / Renewal Gate
     * Route: POST /student/allocation/request/{type}
     */
    public function requestAction(Request $request, string $type): RedirectResponse
    {
        $request->validate([
            'allocation_id'    => 'required|integer|exists:allocations,id',
            'hostel_id'        => 'required|integer|exists:hostels,id',
            'academic_term_id' => 'required|integer|exists:academic_terms,id',
        ]);

        $student    = $request->user()->student;
        $allocation = Allocation::findOrFail($request->allocation_id);
        abort_if($allocation->student_id !== $student->id, 403);

        $term   = AcademicTerm::findOrFail($request->academic_term_id);
        $hostel = Hostel::findOrFail($request->hostel_id);

        match ($type) {
            'checkout_now'     => $this->handleCheckout($allocation, $student, $term, $hostel),
            'renewal_request'  => $this->handleRenewalRequest($allocation, $student, $term, $hostel),
            default            => abort(400, 'Invalid action type.'),
        };

        Cache::forget("student_dashboard:{$student->id}:{$term->id}");

        return redirect()->route('student.allocation.show')
            ->with('success', match($type) {
                'checkout_now'    => 'Checkout confirmed. Your bed has been released.',
                'renewal_request' => 'Renewal request submitted. Awaiting Dean approval.',
                default           => 'Action completed.',
            });
    }

    private function handleCheckout(
        Allocation $allocation,
        \App\Models\Student $student,
        AcademicTerm $term,
        Hostel $hostel
    ): void {
        $isNonFirstYearCampus = !$student->is_first_year
            && $hostel->hostel_type === 'campus-managed';

        if ($isNonFirstYearCampus && !$term->hasEnded()) {
            abort(422, 'Contact administration to request early checkout from an on-campus hostel.');
        }
        $allocation->checkOut();
    }

    private function handleRenewalRequest(
        Allocation $allocation,
        \App\Models\Student $student,
        AcademicTerm $term,
        Hostel $hostel
    ): void {
        $nextTerm = AcademicTerm::where('academic_year_id', $term->academic_year_id)
            ->where('id', '>', $term->id)
            ->orderBy('id')
            ->first();

        Application::firstOrCreate(
            [
                'student_id'       => $student->id,
                'hostel_id'        => $hostel->id,
                'academic_term_id' => $nextTerm?->id ?? $term->id,
            ],
            [
                'status' => Application::STATUS_PENDING,
                'notes'  => 'Renewal request from student for on-campus room.',
            ]
        );
    }
}
