<?php
// app/Services/Admin/UserManagementController.php
declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\{Permission, Role};

class UserService
{
    public function updateProfile(User $actor, User $user, array $attributes): User
    {
        $name = trim((string) ($attributes['name'] ?? $user->name));
        $email = Str::lower(trim((string) ($attributes['email'] ?? $user->email)));
        $emailChanged = $email !== $user->email;

        $user->fill([
            'name' => $name,
            'email' => $email,
        ]);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        activity()->causedBy($actor)
            ->performedOn($user)
            ->withProperties([
                'name' => $name,
                'email' => $email,
                'email_changed' => $emailChanged,
            ])
            ->log('admin_profile_updated');

        return $user->refresh();
    }

    public function updatePassword(User $actor, User $user, string $password): void
    {
        $user->forceFill([
            'password' => Hash::make($password),
        ])->save();

        activity()->causedBy($actor)
            ->performedOn($user)
            ->log('admin_password_updated');
    }

    public function sendPasswordReset(User $actor, User $user): void
    {
        app('auth.password.broker')->sendResetLink(['email' => $user->email]);

        activity()->causedBy($actor)
            ->performedOn($user)
            ->log('admin_password_reset_link_sent');
    }

    public function markEmailVerified(User $actor, User $user): void
    {
        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        activity()->causedBy($actor)
            ->performedOn($user)
            ->log('admin_email_marked_verified');
    }

    public function sendVerificationEmail(User $actor, User $user): void
    {
        if ($user instanceof MustVerifyEmail) {
            $user->sendEmailVerificationNotification();
        }

        activity()->causedBy($actor)
            ->performedOn($user)
            ->log('admin_verification_email_sent');
    }

    public function updateRoles(User $actor, User $user, array $roles): void
    {
        $user->syncRoles($roles);

        activity()->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['roles' => array_values($roles)])
            ->log('admin_roles_updated');
    }

    public function updatePermissions(User $actor, User $user, array $permissions): void
    {
        $user->syncPermissions($permissions);

        activity()->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['permissions' => array_values($permissions)])
            ->log('admin_permissions_updated');
    }

    public function storeRole(User $actor, string $name): Role
    {
        $role = Role::create(['name' => Str::slug(trim($name), '_')]);

        activity()->causedBy($actor)
            ->performedOn($role)
            ->log('admin_role_created');

        return $role;
    }

    public function storePermission(User $actor, string $name): Permission
    {
        $permission = Permission::create(['name' => Str::slug(trim($name), '_')]);

        activity()->causedBy($actor)
            ->performedOn($permission)
            ->log('admin_permission_created');

        return $permission;
    }

    public function createUserForStudent(User $actor, array $payload): User
    {
        $assignable = collect($this->assignableRoles($actor))->pluck('name')->toArray();
        $roles = collect($payload['roles'] ?? ['student'])
            ->filter(fn ($role) => in_array($role, $assignable, true))
            ->values()
            ->all();

        if (! in_array('student', $roles, true)) {
            $roles[] = 'student';
        }

        $plainPassword = filled($payload['password'] ?? null)
            ? (string) $payload['password']
            : Str::password(16);

        $user = User::create([
            'name' => trim((string) $payload['name']),
            'email' => Str::lower(trim((string) $payload['email'])),
            'password' => Hash::make($plainPassword),
        ]);

        $user->syncRoles($roles);
        event(new Registered($user));

        activity()->causedBy($actor)
            ->performedOn($user)
            ->withProperties([
                'roles' => $roles,
                'auto_generated_password' => blank($payload['password'] ?? null),
            ])
            ->log('admin_student_user_created');

        $user->setAttribute('generated_password_plain', $plainPassword);

        return $user;
    }

    public function assignableRoles(User $admin): array
    {
        $all = Role::orderBy('name')->get(['id', 'name'])->toArray();

        if ($admin->hasRole('super_admin')) return $all;
        if ($admin->hasAnyRole(['admin', 'dean'])) return collect($all)->reject(fn ($r) => $r['name'] === 'super_admin')->values()->toArray();
        if ($admin->hasRole('warden')) return collect($all)->filter(fn ($r) => in_array($r['name'], ['student_leader', 'student', 'guest', 'clergy'], true))->values()->toArray();
        if ($admin->hasRole('affiliated_admin')) return collect($all)->filter(fn ($r) => in_array($r['name'], ['student', 'guest'], true))->values()->toArray();

        return [];
    }
}
