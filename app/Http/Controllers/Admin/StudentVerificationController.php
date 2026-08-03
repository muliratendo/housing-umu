<?php
//app\Http\Controller\Admin\StudentVerificationController.php
declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Student, User, VerifiedStudentRecord};
use App\Services\Admin\UserService;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Inertia\{Inertia, Response};

class StudentVerificationController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    /** Verification | GET /admin/student-registry/verification */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Student::class);

        $unmatched = VerifiedStudentRecord::unmatched()
            ->search($request->string('search')->toString() ?: null)
            ->orderBy('last_name')
            ->paginate(40)
            ->withQueryString();

        $matched = VerifiedStudentRecord::matched()
            ->with(['user:id,name,email,email_verified_at', 'matchedBy:id,name,email'])
            ->latest('matched_at')
            ->limit(20)
            ->get();

        return Inertia::render('Admin/StudentRegistry/StudentVerification', [
            'unmatched' => $unmatched,
            'matched' => $matched,
            'filters' => $request->only(['search']),
            'stats' => [
                'total_verified_records' => VerifiedStudentRecord::count(),
                'matched_count' => VerifiedStudentRecord::matched()->count(),
                'unmatched_count' => VerifiedStudentRecord::unmatched()->count(),
            ],
        ]);
    }

    public function link(Request $request, VerifiedStudentRecord $record): RedirectResponse
    {
        $this->authorize('viewAny', Student::class);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'verify_email' => ['nullable', 'boolean'],
        ]);

        $user = User::findOrFail($validated['user_id']);
        abort_if($record->user_id && $record->user_id !== $user->id, 422, 'Record already linked to another user.');
        abort_if(VerifiedStudentRecord::where('user_id', $user->id)->whereKeyNot($record->id)->exists(), 422, 'This user is already linked to another verified record.');

        DB::transaction(function () use ($record, $user, $validated) {
            $record->update([
                'user_id' => $user->id,
                'matched_by' => auth()->id(),
                'matched_at' => now(),
            ]);

            if (! empty($validated['verify_email'])) {
                $this->userService->markEmailVerified(auth()->user(), $user);
            }
        });

        activity()->causedBy(auth()->user())
            ->performedOn($record)
            ->withProperties(['user_id' => $user->id])
            ->log('student_record_linked');

        return back()->with('success', 'Verified record linked successfully.');
    }

    public function unlink(VerifiedStudentRecord $record): RedirectResponse
    {
        $this->authorize('viewAny', Student::class);

        $oldUserId = $record->user_id;
        $record->update([
            'user_id' => null,
            'matched_by' => null,
            'matched_at' => null,
        ]);

        activity()->causedBy(auth()->user())
            ->performedOn($record)
            ->withProperties(['revoked_user_id' => $oldUserId])
            ->log('student_record_unlinked');

        return back()->with('success', 'Verified record unlinked successfully.');
    }

    public function createUser(Request $request, VerifiedStudentRecord $record): RedirectResponse
    {
        $this->authorize('viewAny', Student::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:12', 'confirmed'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string'],
            'verify_email' => ['nullable', 'boolean'],
        ]);

        $generated = empty($validated['password']);

        DB::transaction(function () use ($record, $validated, $generated) {
            $user = $this->userService->createUserForStudent(auth()->user(), [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'] ?? null,
                'roles' => $validated['roles'] ?? ['student'],
            ]);

            $record->update([
                'user_id' => $user->id,
                'matched_by' => auth()->id(),
                'matched_at' => now(),
            ]);

            if (! empty($validated['verify_email'])) {
                $this->userService->markEmailVerified(auth()->user(), $user);
            }

            if ($generated) {
                $this->userService->sendPasswordReset(auth()->user(), $user);
            }
        });

        return back()->with('success', 'Student user account created and linked.');
    }

    public function verifyEmail(Request $request, VerifiedStudentRecord $record): RedirectResponse
    {
        $this->authorize('viewAny', Student::class);
        abort_unless($record->user, 404, 'No linked user found for this record.');

        $validated = $request->validate([
            'action' => ['required', 'in:mark,resend'],
        ]);

        if ($validated['action'] === 'mark') {
            $this->userService->markEmailVerified(auth()->user(), $record->user);
            return back()->with('success', "Email verified for {$record->user->name}.");
        }

        $this->userService->sendVerificationEmail(auth()->user(), $record->user);
        return back()->with('success', "Verification email sent to {$record->user->email}.");
    }
}
