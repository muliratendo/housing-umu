<?php
// app/Http/Controllers/Admin/AcademicYearController.php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use Illuminate\Http\{RedirectResponse, Request};

/*
 * NEW: previously there was no way to create an AcademicYear from the
 * admin UI at all — AcademicTermsIndex.tsx expects `academicYears` to be
 * pre-populated, and if that list was ever empty (e.g. right after
 * migrate:fresh --seed, before any year exists), the "Academic Year"
 * Select in the New Term dialog rendered with no options and no way to
 * add one. That dead-end is part of what made the selector feel "buggy".
 * This controller lets an admin add a year inline from that same dialog.
 *
 * UPDATED: added update() and destroy() so years can be renamed/removed
 * from the new AcademicYearManager popover, without needing a dedicated
 * full admin page for what is a very small, low-frequency management task.
 */
class AcademicYearController extends Controller
{
    /** POST /admin/academic-years */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage', AcademicYear::class);

        $validated = $request->validate([
            'start_year' => 'required|integer|min:2000|max:2100',
            'end_year'   => 'required|integer|gt:start_year',
        ]);

        $label = "{$validated['start_year']}/{$validated['end_year']}";

        AcademicYear::create([
            'name'       => $label,
            'label'      => $label,
            'start_year' => $validated['start_year'],
            'end_year'   => $validated['end_year'],
            'start_date' => "{$validated['start_year']}-08-01",
            'end_date'   => "{$validated['end_year']}-07-31",
        ]);

        return back()->with('success', "Academic year '{$label}' created.");
    }

    /** PATCH /admin/academic-years/{academicYear} */
    public function update(Request $request, AcademicYear $academicYear): RedirectResponse
    {
        $this->authorize('manage', AcademicYear::class);

        $validated = $request->validate([
            'start_year' => 'required|integer|min:2000|max:2100',
            'end_year'   => 'required|integer|gt:start_year',
        ]);

        $label = "{$validated['start_year']}/{$validated['end_year']}";

        $academicYear->update([
            'name'       => $label,
            'label'      => $label,
            'start_year' => $validated['start_year'],
            'end_year'   => $validated['end_year'],
            'start_date' => "{$validated['start_year']}-08-01",
            'end_date'   => "{$validated['end_year']}-07-31",
        ]);

        return back()->with('success', "Academic year '{$label}' updated.");
    }

    /** DELETE /admin/academic-years/{academicYear} */
    public function destroy(AcademicYear $academicYear): RedirectResponse
    {
        $this->authorize('manage', AcademicYear::class);

        // Guard against deleting a year that still has terms attached —
        // this would otherwise orphan academic_terms rows or fail on the
        // foreignId('academic_year_id')->constrained() FK constraint with
        // a much less readable SQL error.
        if ($academicYear->terms()->exists()) {
            return back()->with('error', 'Cannot delete a year that has academic terms. Remove its terms first.');
        }

        $label = $academicYear->name;
        $academicYear->delete();

        return back()->with('success', "Academic year '{$label}' deleted.");
    }
}
