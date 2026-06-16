<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Core Prerequisite: Initialize your roles & permissions matrix database records first
        $this->call([
            RolePermissionSeeder::class,
        ]);

        // =========================================================================
        // 2. SEED EXPLICIT ACCOUNTS AND ASSIGN SPATIE ROLES
        // =========================================================================

        // --- Create Super Admin ---
        $superAdmin = User::factory()->create([
            'name' => 'UMU Super System Admin',
            'email' => 'superadmin@umu.ac.ug',
            'password' => Hash::make('password'),
        ]);
        $superAdmin->assignRole('super_admin');

        // --- Create Dean of Students ---
        $dean = User::factory()->create([
            'name' => 'Dr. John Bosco (Dean)',
            'email' => 'dean@umu.ac.ug',
            'password' => Hash::make('password'),
        ]);
        $dean->assignRole('dean');

        // --- Create Campus Warden (Main Campus Halls) ---
        $warden = User::factory()->create([
            'name' => 'Sister Mary Florence (Warden)',
            'email' => 'warden@umu.ac.ug',
            'password' => Hash::make('password'),
        ]);
        $warden->assignRole('warden');

        // --- Create Affiliated Admin (Private Hostel Landlord) ---
        $landlord = User::factory()->create([
            'name' => 'Mr. Mukasa Ronald (Landlord)',
            'email' => 'landlord@umu.ac.ug',
            'password' => Hash::make('password'),
        ]);
        $landlord->assignRole('affiliated_admin');


        // =========================================================================
        // 3. SEED BULK FACTORY USERS (e.g., 20 Dummy Students)
        // =========================================================================

        // Create an explicit recognizable test student for your browser login
        $testStudent = User::factory()->create([
            'name' => 'Namubiru Sarah',
            'email' => 'student@umu.ac.ug',
            'password' => Hash::make('password'),
        ]);
        $testStudent->assignRole('student');

        // Create 20 random students using standard Laravel Eloquent loops
        User::factory(20)->create()->each(function ($user) {
            $user->assignRole('student');
        });
    }
}
