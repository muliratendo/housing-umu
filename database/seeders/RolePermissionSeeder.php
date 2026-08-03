<?php
// database/seeders/RolePermissionSeeder.php
declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);

        // Flush ONCE before seeding (Spatie's own recommendation — avoids
        // cache conflict errors without paying a rebuild cost per row).
        $registrar->forgetCachedPermissions();

        $now = now();

        /*
         * Define all permissions. Guard name is pinned explicitly to 'web'
         * on every Permission/Role to avoid ambiguity if a second guard
         * (e.g. 'api' or 'sanctum') is ever introduced.
         */
        $permissions = [
            'view admin dashboard',

            'view hostels', 'create hostels', 'update hostels', 'delete hostels',
            'view rooms', 'create rooms', 'update rooms', 'delete rooms',
            'view beds', 'create beds', 'update beds', 'delete beds',
            'view students', 'create students', 'update students', 'delete students', 'verify students',
            'view applications', 'create applications', 'update applications', 'delete applications', 'process applications',
            'view allocations', 'create allocations', 'update allocations', 'delete allocations', 'switch allocations', 'revoke allocations',
            'view waitlists', 'manage waitlists',
            'view maintenance', 'update maintenance',
            'view reports', 'manage semesters', 'manage roles and permissions', 'manage system settings',
        ];

        /*
         * BULK insert permissions in a single query instead of looping
         * firstOrCreate() once per permission (36 round-trips -> 1).
         *
         * We still guard against duplicates manually (in case this seeder
         * re-runs against a DB that already has some rows and isn't fully
         * fresh), by diffing against existing names first.
         */
        $existingPermissionNames = DB::table('permissions')
            ->where('guard_name', 'web')
            ->pluck('name')
            ->all();

        $missingPermissions = array_diff($permissions, $existingPermissionNames);

        if (! empty($missingPermissions)) {
            $rows = array_map(fn (string $name) => [
                'name'       => $name,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ], $missingPermissions);

            DB::table('permissions')->insert($rows);
        }

        // Refetch full id map once — cheap, single query.
        $permissionIdsByName = DB::table('permissions')
            ->where('guard_name', 'web')
            ->pluck('id', 'name');

        /*
         * Role → permission map. Using syncPermissions() (not givePermissionTo())
         * so re-running the seeder after a permission list change removes
         * stale grants instead of only ever adding new ones.
         */
        $roles = [
            'student' => [
                'view hostels', 'view rooms', 'view beds',
                'create applications', 'view applications',
            ],
            'student_leader' => [
                'view hostels', 'view rooms', 'view beds', 'view students', 'view maintenance',
            ],
            'guest' => [],
            'warden' => [
                'view admin dashboard',
                'view hostels', 'create hostels', 'update hostels', 'delete hostels',
                'view rooms', 'create rooms', 'update rooms', 'delete rooms',
                'view beds', 'create beds', 'update beds', 'delete beds',
                'view students',
                'view applications', 'update applications', 'process applications',
                'view allocations', 'create allocations', 'update allocations', 'switch allocations', 'revoke allocations',
                'view waitlists', 'manage waitlists',
                'view maintenance', 'update maintenance',
                'view reports',
            ],
            'affiliated_admin' => [
                'view admin dashboard',
                'view hostels', 'update hostels',
                'view rooms', 'create rooms', 'update rooms', 'delete rooms',
                'view beds', 'create beds', 'update beds', 'delete beds',
                'view students',
                'view applications', 'update applications', 'process applications',
                'view allocations', 'create allocations', 'update allocations', 'switch allocations', 'revoke allocations',
                'view waitlists', 'manage waitlists',
                'view maintenance', 'update maintenance',
                'view reports',
            ],
            'dean' => [
                'view admin dashboard',
                'view students', 'verify students',
                'view hostels', 'view rooms', 'view beds',
                'view applications', 'process applications',
                'view allocations', 'view waitlists',
                'view maintenance',
                'view reports',
                'manage semesters', 'manage system settings',
            ],
            'admin'       => $permissions,
            'super_admin' => $permissions,
        ];

        /*
         * BULK insert roles (1 query instead of 8 firstOrCreate calls).
         */
        $existingRoleNames = DB::table('roles')
            ->where('guard_name', 'web')
            ->pluck('name')
            ->all();

        $missingRoles = array_diff(array_keys($roles), $existingRoleNames);

        if (! empty($missingRoles)) {
            $rows = array_map(fn (string $name) => [
                'name'       => $name,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ], $missingRoles);

            DB::table('roles')->insert($rows);
        }

        $roleIdsByName = DB::table('roles')
            ->where('guard_name', 'web')
            ->pluck('id', 'name');

        /*
         * BULK sync the role<->permission pivot table directly, instead of
         * calling ->syncPermissions() per role (which internally issues a
         * delete + insert + cache-flush per role — 8 roles = 24+ queries).
         *
         * We replicate syncPermissions()'s semantics manually:
         *   1. Delete all existing pivot rows for these roles in ONE query.
         *   2. Bulk insert the new pivot rows in ONE query.
         * This keeps identical end-state (stale grants removed, matching
         * the original syncPermissions() behaviour) with far fewer round-trips.
         */
        $roleIds = $roleIdsByName->values()->all();

        DB::table('role_has_permissions')
            ->whereIn('role_id', $roleIds)
            ->delete();

        $pivotRows = [];
        foreach ($roles as $roleName => $grants) {
            $roleId = $roleIdsByName[$roleName] ?? null;
            if (! $roleId) {
                continue;
            }
            foreach ($grants as $permissionName) {
                $permissionId = $permissionIdsByName[$permissionName] ?? null;
                if (! $permissionId) {
                    continue;
                }
                $pivotRows[] = [
                    'permission_id' => $permissionId,
                    'role_id'       => $roleId,
                ];
            }
        }

        if (! empty($pivotRows)) {
            // chunk() guards against exceeding MySQL's max_allowed_packet
            // on very large permission sets — harmless no-op at this scale.
            foreach (array_chunk($pivotRows, 500) as $chunk) {
                DB::table('role_has_permissions')->insert($chunk);
            }
        }

        // Flush ONCE after all writes are done, not per role/permission.
        $registrar->forgetCachedPermissions();
    }
}
