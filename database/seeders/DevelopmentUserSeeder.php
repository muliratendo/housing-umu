<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DevelopmentUserSeeder extends Seeder
{
    public function run(): void
    {
        // Administrator
        $admin = User::updateOrCreate(['email' => 'admin@housing.umu.ac.ug'], [
            'firstname' => 'Admin',
            'lastname' => 'User',
            'email' => 'admin@housing.umu.ac.ug',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $admin->assignRole('Administrator');

        // Editor
        $editor = User::updateOrCreate(['email' => 'editor@housing.umu.ac.ug'], [
            'firstname' => 'Editor',
            'lastname' => 'User',
            'email' => 'editor@housing.umu.ac.ug',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $editor->assignRole('Editor');

        // Regular User
        $user = User::updateOrCreate(['email' => 'user@housing.umu.ac.ug'], [
            'firstname' => 'Test',
            'lastname' => 'User',
            'email' => 'user@housing.umu.ac.ug',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $user->assignRole('User');

        // Guest
        $guest = User::updateOrCreate(['email' => 'guest@housing.umu.ac.ug'], [
            'firstname' => 'Guest',
            'lastname' => 'User',
            'email' => 'guest@housing.umu.ac.ug',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);
        $guest->assignRole('Guest');
    }
}
