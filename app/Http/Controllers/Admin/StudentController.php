<?php
// app/Http/Controllers/Admin/StudentController.php
declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Student, VerifiedStudentRecord};
use App\Services\Admin\UserService;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};
use Spatie\Permission\Models\Permission;

class StudentController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    /** A9 — Student Registry | GET /admin/students */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Student::class);

        $students = Student::with(['user:id,name,email,email_verified_at'])
            ->with('verifiedStudentRecord:id,user_id,reg_number,matched_by,matched_at')
            ->withCount(['applications', 'allocations'])
            ->when($request->search, fn ($q, $v) =>
                $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%"))
                    ->orWhere('student_number', 'like', "%{$v}%")
                    ->orWhere('registration_number', 'like', "%{$v}%")
            )
            ->when($request->gender, fn ($q, $v) => $q->where('gender', $v))
            ->when($request->year_of_study, fn ($q, $v) => $q->where('year_of_study', $v))
            ->when($request->verified_record, function ($q, $v) {
                $v === 'yes' ? $q->whereHas('verifiedStudentRecord') : $q->whereDoesntHave('verifiedStudentRecord');
            })
            ->orderBy('created_at', 'desc')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Admin/StudentRegistry/StudentList', [
            'students' => $students,
            'filters' => $request->only(['search', 'gender', 'year_of_study', 'verified_record']),
        ]);
    }

    /** A10 — Student Detail | GET /admin/students/{student} */
    public function show(Student $student): Response
    {
        $this->authorize('view', $student);

        $student->load([
            'user:id,name,email,email_verified_at,created_at',
            'user.roles:id,name',
            'user.permissions:id,name',
            'applications.hostel:id,name,slug',
            'applications.academicTerm:id,name',
            'allocations.hostel:id,name,slug',
            'allocations.room:id,name,room_number',
            'allocations.bed:id,label',
            'allocations.academicTerm:id,name',
            'maintenanceRequests' => fn ($q) => $q->latest()->limit(5),
            'verifiedStudentRecord.matchedBy:id,name,email',
        ]);

        $verifiedRecord = VerifiedStudentRecord::where('user_id', $student->user_id)->with('matchedBy:id,name,email')->first();

        return Inertia::render('Admin/StudentRegistry/StudentDetails', [
            'student' => $student,
            'verifiedRecord' => $verifiedRecord,
            'roles' => $student->user?->getRoleNames() ?? [],
            'permissions' => $student->user?->getAllPermissions()->pluck('name') ?? [],
            'allRoles' => $student->user ? $this->userService->assignableRoles(auth()->user()) : [],
            'allPermissions' => Permission::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $this->authorize('update', $student); // registry-level check

        $validated = $request->validate([/* student_number, year_of_study, gender, programme, faculty */]);
        $student->update($validated);

        if ($student->user && $request->hasAny(['name', 'email'])) {
            // Explicit second-gate check before touching the User model
            $this->authorize('manageRoles', $student->user);

            $this->userService->updateProfile(auth()->user(), $student->user, [
                'name' => $validated['name'] ?? $student->user->name,
                'email' => $validated['email'] ?? $student->user->email,
            ]);
        }

        $validated = $request->validate([
            'student_number' => ['required', 'string', 'max:50', 'unique:students,student_number,' . $student->id],
            'registration_number' => ['nullable', 'string', 'max:50'],
            'year_of_study' => ['required', 'integer', 'between:1,7'],
            'gender' => ['required', 'in:male,female'],
            'programme' => ['nullable', 'string', 'max:255'],
            'faculty' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email:rfc,dns', 'max:255'],
        ]);

        $student->update([
            'student_number' => $validated['student_number'],
            'registration_number' => $validated['registration_number'] ?? null,
            'year_of_study' => $validated['year_of_study'],
            'gender' => $validated['gender'],
            'programme' => $validated['programme'] ?? null,
            'faculty' => $validated['faculty'] ?? null,
        ]);

        if ($student->user && $request->hasAny(['name', 'email'])) {
            $this->userService->updateProfile(auth()->user(), $student->user, [
                'name' => $validated['name'] ?? $student->user->name,
                'email' => $validated['email'] ?? $student->user->email,
            ]);
        }

        activity()->causedBy(auth()->user())
            ->performedOn($student)
            ->withProperties(['student_number' => $student->student_number])
            ->log('admin_student_updated');

        return back()->with('success', 'Student record updated.');
    }

    public function updateRoles(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $validated = $request->validate([
            'roles' => 'required|array',
            'roles.*' => ['string', 'in:' . implode(',', collect($this->userService->assignableRoles(auth()->user()))->pluck('name')->toArray())],
        ]);

        $this->userService->updateRoles(auth()->user(), $student->user, $validated['roles']);

        return back()->with('success', "Roles updated for {$student->user->name}.");
    }

    public function updatePermissions(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $this->userService->updatePermissions(auth()->user(), $student->user, $validated['permissions']);

        return back()->with('success', "Permissions updated for {$student->user->name}.");
    }

    public function updatePassword(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);

        $this->userService->updatePassword(auth()->user(), $student->user, $validated['password']);

        return back()->with('success', "Password updated for {$student->user->name}.");
    }

    public function markEmailVerified(Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $this->userService->markEmailVerified(auth()->user(), $student->user);

        return back()->with('success', "Email verified for {$student->user->name}.");
    }

    public function sendVerificationEmail(Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $this->userService->sendVerificationEmail(auth()->user(), $student->user);

        return back()->with('success', "Verification email sent to {$student->user->email}.");
    }

    public function sendPasswordReset(Student $student): RedirectResponse
    {
        abort_unless($student->user, 404, 'Student account not found.');
        $this->authorize('manageRoles', $student->user);

        $this->userService->sendPasswordReset(auth()->user(), $student->user);

        return back()->with('success', "Password reset link sent to {$student->user->email}.");
    }
}
