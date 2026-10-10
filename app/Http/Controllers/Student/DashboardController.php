<?php
// File: app/Http/Controllers/Student/DashboardController.php
//
// =============================================================================
// CHANGES IN THIS FILE (see docs/CHANGES.md for full explanation):
//
// 1. REMOVED `recommendedHostels` and `recentActivity` from the data passed
//    to Inertia::render(). The page no longer needs them at initial load.
// 2. REMOVED `getRecommendedHostels()` and `getRecentActivity()` from this
//    controller — their logic MOVED to two new, dedicated controllers:
//    - App\Http\Controllers\Api\Student\RecommendedHostelsController
//    - App\Http\Controllers\Api\Student\RecentActivityController
//    This keeps each slow/independent query in its own small controller that
//    can be cached, rate-limited, or optimized separately without touching
//    the main dashboard page load.
// 3. Everything else (student profile check, current term resolution,
//    cached `summary` build) is UNCHANGED.
// =============================================================================
namespace App\Http\Controllers\Student;


use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Allocation, MaintenanceRequest};
use Illuminate\Http\{Request, RedirectResponse};
use Illuminate\Support\Facades\Cache;
use Inertia\{Inertia, Response};


class DashboardController extends Controller
{
    /**
     * S1 — Student Dashboard
     * Route: GET /student/dashboard
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user    = $request->user();
        $student = $user->student;
        if (!$student) {
            return redirect()->route('profile.edit')
                ->with('warning', 'Your student profile is incomplete. Please contact the Dean of Students office.');
        }


        $term = AcademicTerm::current();


        $cacheKey = "student_dashboard:{$student->id}:" . ($term?->id ?? 'no-term');
        $summary  = Cache::remember($cacheKey, 300, function () use ($student, $term) {
            return $this->buildDashboardSummary($student, $term);
        });


        return Inertia::render('Student/Dashboard', [
            'student' => [
                'id'             => $student->id,
                'name'           => $user->name,
                'student_number' => $student->student_number,
                'year_of_study'  => $student->year_of_study,
                'is_first_year'  => $student->is_first_year,
                'gender'         => $student->gender,
                'programme'      => $student->programme,
                'faculty'        => $student->faculty,
            ],
            'currentTerm' => $term ? [
                'id'                        => $term->id,
                'name'                      => $term->name,
                'semester'                  => $term->semester,
                'academic_year'             => $term->academicYear->label,
                'application_window_open'   => $term->application_window_open?->toDateString(),
                'application_window_close'  => $term->application_window_close?->toDateString(),
                'is_application_window_open'=> $term->isApplicationWindowOpen(),
                'has_ended'                 => $term->hasEnded(),
            ] : null,
            'summary' => $summary,
            // NOTE: 'recommendedHostels' and 'recentActivity' keys REMOVED.
            // The frontend now fetches these itself from:
            //   GET /api/student/dashboard/recommended-hostels
            //   GET /api/student/dashboard/recent-activity
        ]);
    }


    private function buildDashboardSummary(\App\Models\Student $student, ?AcademicTerm $term): array
    {
        if (!$term) {
            return $this->emptyDashboardSummary();
        }


        $allocation = $student->activeAllocationForTerm($term->id);


        $applications = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with(['hostel', 'allocation.room'])
            ->get();


        $maintenanceRequest = null;
        if ($allocation) {
            $maintenanceRequest = MaintenanceRequest::where('student_id', $student->id)
                ->where('academic_term_id', $term->id)
                ->whereIn('status', ['open', 'in_progress'])
                ->first();
        }


        $applicationStatus = 'not_applied';
        $waitlistPosition  = null;
        if ($allocation) {
            $applicationStatus = $allocation->status;
        } elseif ($applications->isNotEmpty()) {
            $primary = $applications->sortBy('created_at')->first();
            $applicationStatus = $primary->status;
            if ($primary->status === 'waitlisted') {
                $waitlistPosition = $primary->waitlist_position;
            }
        }


        return [
            'application_status'     => $applicationStatus,
            'allocation'             => $allocation ? [
                'id'           => $allocation->id,
                'hostel_name'  => $allocation->hostel->name,
                'hostel_type'  => $allocation->hostel->hostel_type,
                'room_number'  => $allocation->room->room_number,
                'bed_number'   => $allocation->bed_number,
                'floor'        => $allocation->room->floor,
                'status'       => $allocation->status,
                'is_retained'  => $allocation->is_retained,
                'checked_in_at'=> $allocation->checked_in_at?->toDateTimeString(),
            ] : null,
            'waitlist_position'      => $waitlistPosition,
            'applications_count'     => $applications->count(),
            'applications'           => $applications->map(fn($app) => [
                'id'               => $app->id,
                'hostel_name'      => $app->hostel->name,
                'hostel_type'      => $app->hostel->hostel_type,
                'status'           => $app->status,
                'waitlist_position'=> $app->waitlist_position,
                'created_at'       => $app->created_at->toDateString(),
            ])->values(),
            'maintenance_status'     => $maintenanceRequest?->status,
            'maintenance_request'    => $maintenanceRequest ? [
                'id'      => $maintenanceRequest->id,
                'subject' => $maintenanceRequest->subject,
                'status'  => $maintenanceRequest->status,
            ] : null,
            'can_access_maintenance' => $allocation?->canAccessMaintenance() ?? false,
        ];
    }


    private function emptyDashboardSummary(): array
    {
        return [
            'application_status'     => 'not_applied',
            'allocation'             => null,
            'waitlist_position'      => null,
            'applications_count'     => 0,
            'applications'           => [],
            'maintenance_status'     => null,
            'maintenance_request'    => null,
            'can_access_maintenance' => false,
        ];
    }
}
