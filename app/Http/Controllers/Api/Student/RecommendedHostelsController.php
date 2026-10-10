<?php
/**
 * =============================================================================
 * FILE: app/Http/Controllers/Api/Student/RecommendedHostelsController.php
 * PURPOSE: NEW controller. Moved wholesale (logic UNCHANGED) out of
 * DashboardController::getRecommendedHostels(). Serves ONLY this one
 * dataset as JSON, at its own route, so:
 *   - it can be cached independently (see the Cache::remember addition below,
 *     which was NOT in the original — a 2-minute cache reduces the cost of
 *     the per-hostel availableBedCount() N+1 risk on every dashboard visit).
 *   - a slow/broken query here returns a clean JSON error instead of
 *     crashing the whole Inertia page render.
 * Route: GET /api/student/dashboard/recommended-hostels
 * =============================================================================
 */

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Application, Hostel};
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\Cache;

class RecommendedHostelsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user    = $request->user();
        $student = $user->student;

        if (!$student) {
            // Matches the same guard as DashboardController::index() —
            // a student without a profile has nothing to recommend.
            return response()->json([]);
        }

        $term = AcademicTerm::current();
        if (!$term) {
            return response()->json([]);
        }

        // NEW: cache this independently from the main dashboard summary cache,
        // since this query is the heaviest one on the page (rooms join +
        // per-hostel bed-count calculation).
        $cacheKey = "student_recommended_hostels:{$student->id}:{$term->id}";
        $hostels  = Cache::remember($cacheKey, 120, fn () => $this->buildRecommendations($student, $term));

        return response()->json($hostels);
    }

    /**
     * UNCHANGED logic from the original getRecommendedHostels(), just moved
     * into its own controller/method.
     */
    private function buildRecommendations(\App\Models\Student $student, AcademicTerm $term): array
    {
        $appliedHostelIds = Application::where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->pluck('hostel_id')
            ->toArray();

        $hasActiveAllocation = $student->activeAllocationForTerm($term->id) !== null;

        return Hostel::active()
            ->when($student->is_first_year, fn ($q) => $q->campus())
            ->where(fn ($q) => $q->where('gender_scope', 'mixed')->orWhere('gender_scope', $student->gender))
            ->limit(3)
            ->with(['rooms' => fn ($q) => $q->where('is_active', true)])
            ->get(['id', 'name', 'slug', 'management_type', 'gender_scope', 'location', 'image_url'])
            ->map(function ($h) use ($term, $appliedHostelIds, $hasActiveAllocation, $student) {
                $alreadyApplied  = in_array($h->id, $appliedHostelIds, true);
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
}
