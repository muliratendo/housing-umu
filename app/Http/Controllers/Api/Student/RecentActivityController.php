<?php
/**
 * =============================================================================
 * FILE: app/Http/Controllers/Api/Student/RecentActivityController.php
 * PURPOSE: NEW controller. Moved wholesale (logic UNCHANGED) out of
 * DashboardController::getRecentActivity(). Serves ONLY this dataset as JSON,
 * so a slow/broken query here never blocks the rest of the dashboard from
 * rendering.
 * Route: GET /api/student/dashboard/recent-activity
 * =============================================================================
 */

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Allocation};
use Illuminate\Http\{Request, JsonResponse};

class RecentActivityController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user    = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([]);
        }

        $term = AcademicTerm::current();
        if (!$term) {
            return response()->json([]);
        }

        return response()->json($this->buildActivity($student, $term));
    }

    /**
     * UNCHANGED logic from the original getRecentActivity(), just moved into
     * its own controller/method.
     */
    private function buildActivity(\App\Models\Student $student, AcademicTerm $term): array
    {
        $apps = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->with('hostel')
            ->orderByDesc('updated_at')
            ->limit(3)
            ->get()
            ->map(fn ($a) => [
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
            ->map(fn ($al) => [
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
