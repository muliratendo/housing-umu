<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Clear cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        /*
         * Define all permissions
         */
        $permissions = [
            // Hostels
            'view hostels',
            'create hostels',
            'update hostels',
            'delete hostels',

            // Rooms
            'view rooms',
            'create rooms',
            'update rooms',
            'delete rooms',

            // Beds
            'view beds',
            'create beds',
            'update beds',
            'delete beds',

            // Students
            'view students',
            'create students',
            'update students',
            'delete students',

            // Applications
            'view applications',
            'create applications',
            'update applications',
            'delete applications',
            'process applications',

            // Allocations
            'view allocations',
            'create allocations',
            'update allocations',
            'delete allocations',
            'switch allocations',
            'revoke allocations',

            // Waitlists
            'view waitlists',
            'manage waitlists',

            // Settings / admin
            'view reports',
            'manage semesters',
            'manage roles and permissions',
            'manage system settings',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        /*
         * Create roles
         */
        $studentRole         = Role::firstOrCreate(['name' => 'student']);
        $wardenRole          = Role::firstOrCreate(['name' => 'warden']);
        $affiliatedAdminRole = Role::firstOrCreate(['name' => 'affiliated_admin']);
        $deanRole            = Role::firstOrCreate(['name' => 'dean']);
        $superAdminRole      = Role::firstOrCreate(['name' => 'super_admin']);

        /*
         * Assign permissions to roles
         */

        // Student
        $studentRole->givePermissionTo([
            'view hostels',
            'view rooms',
            'view beds',
            'create applications',
            'view applications',
            // "view own" vs "view all" is enforced with policies, not separate permissions
        ]);

        // Warden (Campus Managed Halls)
        $wardenRole->givePermissionTo([
            // Hostel/room/bed management
            'view hostels',
            'create hostels',
            'update hostels',
            'delete hostels',
            'view rooms',
            'create rooms',
            'update rooms',
            'delete rooms',
            'view beds',
            'create beds',
            'update beds',
            'delete beds',

            // Students & applications/allocations
            'view students',
            'view applications',
            'update applications',
            'process applications',
            'view allocations',
            'create allocations',
            'update allocations',
            'switch allocations',
            'revoke allocations',

            // Waitlists and reports
            'view waitlists',
            'manage waitlists',
            'view reports',
        ]);

        // Affiliated hostel admin
        $affiliatedAdminRole->givePermissionTo([
            'view hostels',
            'update hostels', // may not create/delete in MVP
            'view rooms',
            'create rooms',
            'update rooms',
            'delete rooms',
            'view beds',
            'create beds',
            'update beds',
            'delete beds',

            'view students', // typically limited to students allocated/applied to their hostels
            'view applications',
            'update applications',
            'view allocations',
            'create allocations',
            'update allocations',
            'switch allocations',
            'revoke allocations',

            'view waitlists',
            'manage waitlists',
            'view reports',
        ]);

        // Dean of Students
        $deanRole->givePermissionTo([
            'view students',
            'view hostels',
            'view rooms',
            'view beds',
            'view applications',
            'view allocations',
            'view waitlists',
            'view reports',
            'process applications',
            'manage semesters',
            // 'manage system settings', // optional
        ]);

        // Super admin – all permissions
        $superAdminRole->givePermissionTo(Permission::all());
    }
}
