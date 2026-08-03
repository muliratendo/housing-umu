<?php
// app/Http/Controllers/Admin/UserManagementController.php
declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admin\UserService;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};
use Spatie\Permission\Models\Permission;

class UserManagementController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function index(Request $request): Response
    {
        $this->authorize('manageRoles', User::class);
        /** @var User $admin */
        $admin = auth()->user();

        $users = User::with('roles:id,name', 'permissions:id,name')
            ->when($request->search, fn ($q, $v) => $q->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%"))
            ->when($request->role, fn ($q, $v) => $q->whereHas('roles', fn ($r) => $r->where('name', $v)))
            ->orderBy('name')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'allRoles' => $this->userService->assignableRoles($admin),
            'allPermissions' => Permission::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'role']),
        ]);
    }

    public function updateProfile(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email,' . $user->id],
        ]);

        $this->userService->updateProfile(auth()->user(), $user, $validated);

        return back()->with('success', "Profile updated for {$user->fresh()->name}.");
    }

    public function updatePassword(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);

        $this->userService->updatePassword(auth()->user(), $user, $validated['password']);

        return back()->with('success', "Password updated for {$user->name}.");
    }

    public function sendPasswordReset(User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);
        $this->userService->sendPasswordReset(auth()->user(), $user);

        return back()->with('success', "Password reset link sent to {$user->email}.");
    }

    public function markEmailVerified(User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);
        $this->userService->markEmailVerified(auth()->user(), $user);

        return back()->with('success', "Email verified for {$user->name}.");
    }

    public function sendVerificationEmail(User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);
        $this->userService->sendVerificationEmail(auth()->user(), $user);

        return back()->with('success', "Verification email sent to {$user->email}.");
    }

    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);
        /** @var User $admin */
        $admin = auth()->user();
        $assignable = collect($this->userService->assignableRoles($admin))->pluck('name')->toArray();

        $validated = $request->validate([
            'roles' => 'required|array',
            'roles.*' => ['string', 'in:' . implode(',', $assignable)],
        ]);

        $this->userService->updateRoles($admin, $user, $validated['roles']);

        return back()->with('success', "Roles updated for {$user->name}.");
    }

    public function updatePermissions(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $this->userService->updatePermissions(auth()->user(), $user, $validated['permissions']);

        return back()->with('success', "Permissions updated for {$user->name}.");
    }

    public function storeRole(Request $request): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
        ]);

        $this->userService->storeRole(auth()->user(), $validated['name']);

        return back()->with('success', 'Role created successfully.');
    }

    public function storePermission(Request $request): RedirectResponse
    {
        $this->authorize('manageRoles', User::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:permissions,name'],
        ]);

        $this->userService->storePermission(auth()->user(), $validated['name']);

        return back()->with('success', 'Permission created successfully.');
    }
}
