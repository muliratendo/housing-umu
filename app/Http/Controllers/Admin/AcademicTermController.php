<?php
// app/Http/Controllers/Admin/AcademicTermController.php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, AcademicYear, Hostel};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class AcademicTermController extends Controller
{
    /** A11 — Academic Terms | GET /admin/academic-terms */
    public function index(): Response
    {
        $this->authorize('manage', AcademicTerm::class);

        $terms = AcademicTerm::with('academicYear:id,name')
            ->withCount(['applications', 'allocations'])
            ->orderBy('created_at', 'desc')->paginate(20);

        return Inertia::render('Admin/AcademicTerms/Index', [
            'terms'         => $terms,
            'academicYears' => AcademicYear::orderBy('start_year', 'desc')->get(['id', 'name', 'start_year', 'end_year']),
            'currentTermId' => AcademicTerm::current()?->id,
        ]);
    }

    private function windowRules(): array
    {
        return [
            'name'                       => 'required|string|max:100',
            'start_date'                 => 'required|date',
            'end_date'                   => 'required|date|after:start_date',
            'is_application_window_open' => 'required|boolean',
            // FIX: application_window_opens is now its own field with NO
            // lower bound tying it to start_date — this is what lets an
            // admin open applications before the semester itself begins.
            // application_deadline is only checked against
            // application_window_opens (not start_date), so the window
            // itself stays internally consistent without being pinned to
            // the term's dates.
            'application_window_opens'   => 'nullable|date|required_if:is_application_window_open,true',
            'application_deadline'       => 'nullable|date|after_or_equal:application_window_opens|required_if:is_application_window_open,true',
        ];
    }

    private function windowColumns(array $validated): array
    {
        $open = $validated['is_application_window_open'];

        return [
            'name'                     => $validated['name'],
            'start_date'               => $validated['start_date'],
            'end_date'                 => $validated['end_date'],
            // FIX: previously hard-coded to $validated['start_date'],
            // which made it structurally impossible to open applications
            // early even once validation allowed it. Now uses the admin's
            // own chosen opens-date.
            'application_window_open'  => $open ? $validated['application_window_opens'] : null,
            'application_window_close' => $open ? $validated['application_deadline'] : null,
        ];
    }

    /** POST /admin/academic-terms */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage', AcademicTerm::class);

        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            ...$this->windowRules(),
        ]);

        AcademicTerm::create([
            'academic_year_id' => $validated['academic_year_id'],
            ...$this->windowColumns($validated),
        ]);

        return back()->with('success', "Term '{$validated['name']}' created.");
    }

    /** PATCH /admin/academic-terms/{term} */
    public function update(Request $request, AcademicTerm $term): RedirectResponse
    {
        $this->authorize('manage', AcademicTerm::class);

        $validated = $request->validate($this->windowRules());

        $term->update($this->windowColumns($validated));

        return back()->with('success', "Term '{$term->name}' updated.");
    }

    /** PATCH /admin/academic-terms/{term}/activate */
    public function activate(AcademicTerm $term): RedirectResponse
    {
        $this->authorize('manage', AcademicTerm::class);

        AcademicTerm::where('id', '!=', $term->id)->update(['is_current' => false]);
        $term->update(['is_current' => true]);

        // NEW: activating a term is the trigger for a fresh application
        // cycle, so every hostel's applications_open flag is bulk-set to
        // true here — a single UPDATE, not a loop over Hostel::all()/save(),
        // to avoid N+1 writes when there are dozens of hostels.
        // This intentionally does NOT check each hostel's individual
        // availability_status (e.g. 'closed' or 'full') — that's a separate
        // concept from applications_open (see Hostel::isApplicationWindowOpen()),
        // and admins can still flip a specific hostel back to closed
        // afterwards via the per-hostel toggle if it shouldn't accept
        // applications this term.
        $hostelsOpened = Hostel::query()->update(['applications_open' => true]);

        return back()->with(
            'success',
            "'{$term->name}' is now active. {$hostelsOpened} hostel(s) marked open for applications."
        );
    }

    /**
     * PATCH /admin/academic-terms/{term}/deactivate
     *
     * NEW: previously the only way to change is_current was activate(),
     * which always sets exactly one term to true — there was no way to
     * turn a term OFF without immediately naming a replacement. Some
     * admin workflows (rolling back a mistaken activation, pausing the
     * "current" designation while fixing data) need exactly that. The
     * frontend gates this action behind a shadcn AlertDialog confirmation
     * since it affects whatever downstream logic keys off
     * AcademicTerm::current().
     */
    public function deactivate(AcademicTerm $term): RedirectResponse
    {
        $this->authorize('manage', AcademicTerm::class);

        if (!$term->is_current) {
            return back()->with('error', "'{$term->name}' is not currently active.");
        }

        $term->update(['is_current' => false]);

        // OPTIONAL — mirrors activate()'s bulk-open with a bulk-close, so
        // "no active term" never leaves hostels silently accepting
        // applications. Left out unless you confirm this is wanted, since
        // the user only asked for the activate-side behavior.
        // Hostel::query()->update(['applications_open' => false]);

        return back()->with('success', "'{$term->name}' has been deactivated. No term is currently active.");
    }
}
