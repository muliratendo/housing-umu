<?php
// File: app/Http/Controllers/Student/DashboardController.php
namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Allocation, Hostel, MaintenanceRequest};
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

        $recommendedHostels = $term
            ? $this->getRecommendedHostels($student, $term)
            : [];

        $recentActivity = $term
            ? $this->getRecentActivity($student, $term)
            : [];

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
            'summary'            => $summary,
            'recommendedHostels' => $recommendedHostels,
            'recentActivity'     => $recentActivity,
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

    // checks each recommended hostel against the student's existing Application/Allocation records for the current term
    private function getRecommendedHostels(\App\Models\Student $student, AcademicTerm $term): array
    {
        $appliedHostelIds = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->pluck('hostel_id')
            ->toArray();

        $hasActiveAllocation = $student->activeAllocationForTerm($term->id) !== null;

        return Hostel::active()
            ->when($student->is_first_year, fn($q) => $q->campus())
            // FIX: filter on the real column (gender_scope), not the
            // gender_policy accessor — accessors don't exist as SQL columns
            // and can't be used in where()/orWhere().
            ->where(fn($q) => $q->where('gender_scope', 'mixed')->orWhere('gender_scope', $student->gender))
            ->limit(3)
            // FIX: select real columns only (id, name, slug, management_type,
            // gender_scope, location, image_url). hostel_type/gender_policy/
            // image_path/price_per_semester are accessors — selecting them
            // literally sends invalid column names to MySQL.
            // price_per_semester also needs 'rooms' eager-loaded since its
            // accessor derives from Room::price_per_semester, not a hostels
            // column — see Hostel::getPricePerSemesterAttribute()'s N+1 warning.
            ->with(['rooms' => fn($q) => $q->where('is_active', true)])
            ->get(['id', 'name', 'slug', 'management_type', 'gender_scope', 'location', 'image_url'])
            ->map(function ($h) use ($term, $appliedHostelIds, $hasActiveAllocation, $student) {
                $alreadyApplied = in_array($h->id, $appliedHostelIds, true);
                // These now resolve via the model's accessors — hostel_type
                // reads management_type, gender_policy reads gender_scope,
                // image_path reads image_url, price_per_semester derives
                // from the eager-loaded rooms relation above.
                $requiresRenewal = !$student->is_first_year && $h->hostel_type === 'campus-managed';
                return [
                    'id' => $h->id, 'name' => $h->name, 'slug' => $h->slug,
                    'hostel_type' => $h->hostel_type, 'gender_policy' => $h->gender_policy,
                    'location' => $h->location, 'price_per_semester' => $h->price_per_semester,
                    'image_path' => $h->image_path,
                    'available_beds' => $h->availableBedCount($term->id),
                    'total_capacity' => $h->total_capacity,
                    'window_open' => $h->isApplicationWindowOpen($term),
                    'already_applied' => $alreadyApplied,
                    'requires_renewal' => $requiresRenewal,
                    'can_apply' => !$hasActiveAllocation && !$alreadyApplied && $h->isApplicationWindowOpen($term),
                    'has_active_allocation' => $hasActiveAllocation,
                ];
            })
            ->toArray();
    }

    private function getRecentActivity(\App\Models\Student $student, AcademicTerm $term): array
    {
        $apps = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with('hostel')
            ->orderByDesc('updated_at')
            ->limit(3)
            ->get()
            ->map(fn($a) => [
                'type'        => 'application',
                'description' => "Application to {$a->hostel->name}",
                'status'      => $a->status,
                'timestamp'   => $a->updated_at->toDateTimeString(),
                'link'        => route('student.applications.show', $a->id),
            ]);

        $allocs = Allocation::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with(['hostel', 'room'])
            ->orderByDesc('updated_at')
            ->limit(2)
            ->get()
            ->map(fn($al) => [
                'type'        => 'allocation',
                'description' => "Room {$al->room->room_number} at {$al->hostel->name}",
                'status'      => $al->status,
                'timestamp'   => $al->updated_at->toDateTimeString(),
                'link'        => route('student.allocation.show'),
            ]);

        return $apps->concat($allocs)
            ->sortByDesc('timestamp')
            ->values()
            ->toArray();
    }
}
