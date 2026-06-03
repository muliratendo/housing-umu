<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Skip in production
        if (app()->environment('production')) {
            return;
        }

        $this->call([
            PermissionSeeder::class,
            DevelopmentUserSeeder::class,
        ]);
    }
}
