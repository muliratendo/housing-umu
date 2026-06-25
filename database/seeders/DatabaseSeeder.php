<?php

namespace Database\Seeders;

use App\Models\Hostel;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Major goals of this seeder:
     * 1. Seed roles and permissions first.
     * 2. Seed key system users with fixed emails for easy login/testing.
     * 3. Seed sample students for development.
     * 4. Seed public hostel listing data using canonical raw values.
     * 5. Make hostel seed data idempotent so rerunning db:seed does not create duplicates.
     */
    public function run(): void
    {
        // =========================================================================
        // 1. Seed roles / permissions first because user-role assignment depends on it
        // =========================================================================
        $this->call([
            RolePermissionSeeder::class,
        ]);

        // =========================================================================
        // 2. Seed core named accounts and assign roles
        //    updateOrCreate makes the seeder safe to rerun
        // =========================================================================

        // Super Admin
        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@umu.ac.ug'],
            [
                'name' => 'UMU Super System Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->assignRole('super_admin');

        // Dean of Students
        $dean = User::updateOrCreate(
            ['email' => 'dean@umu.ac.ug'],
            [
                'name' => 'Dr. John Bosco (Dean)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $dean->assignRole('dean');

        // Campus Warden
        $warden = User::updateOrCreate(
            ['email' => 'warden@umu.ac.ug'],
            [
                'name' => 'Sister Mary Florence (Warden)',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $warden->assignRole('warden');

        // Affiliated Hostel Admin
        $landlord = User::updateOrCreate(
            ['email' => 'affiliatedhosteladmin@umu.ac.ug'],
            [
                'name' => 'Mr. Mukasa Ronald',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $landlord->assignRole('affiliated_admin');

        // =========================================================================
        // 3. Seed a fixed test student + bulk demo students
        // =========================================================================

        // Fixed student account for QA / browser login
        $testStudent = User::updateOrCreate(
            ['email' => 'student@umu.ac.ug'],
            [
                'name' => 'Namubiru Sarah',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $testStudent->assignRole('student');

        // Seed demo students only if you want fresh development users.
        // Using factory()->create()->each(...) is a standard approach for assigning roles after creation.
        User::factory(20)->create()->each(function ($user) {
            $user->assignRole('student');
        });

        // =========================================================================
        // 4. Seed public hostel listing data
        //    IMPORTANT: use canonical raw values only
        //
        //     Canonical raw values:
        //     - room_type: self-contained | non-self-contained | apartment
        //     - management_type: campus-managed | affiliated
        //     - availability_status: available | limited | full
        //     - gender_scope: male | female | mixed
        //
        //     Note:
        //     - room_type_labels should be derived from Room accessors / transformers.
        //     - room_types should be derived from related rooms, not stored directly.
        //     - is_umu_approved is intentionally omitted.
        //
       $hostels = [
           [
               'hostel' => [
                   'name' => 'St. Augustine Clergy Wing',
                   'slug' => Str::slug('St. Augustine Clergy Wing'),
                   'location' => 'Near UMU Main Gate, Nkozi',
                   'price_per_semester' => 850000,
                   'bed_count' => 1,
                   'management_type' => 'affiliated',
                   'availability_status' => 'limited',
                   'gender_scope' => 'male',
                   'is_religious_order' => true,
                   'religious_notes' => 'Reserved strictly for ordained brothers and seminarians attending theological faculties.',
                   'amenities' => ['Private Kitchen', 'Study Desk', 'Solar Power Backup'],
                   'description' => 'A quiet clergy-focused affiliated hostel suitable for theological students and religious residents.',
                   'image_url' => null,
               ],
               'rooms' => [
                   [
                       'name' => 'Clergy Studio A1',
                       'slug' => Str::slug('St. Augustine Clergy Wing Clergy Studio A1'),
                       'room_type' => 'apartment',
                       'capacity' => 1,
                       'bed_count' => 1,
                       'price_per_semester' => 850000,
                       'availability_status' => 'limited',
                       'gender_scope' => 'male',
                       'description' => 'Private single-occupancy clergy apartment with study space.',
                       'amenities' => ['Private Kitchen', 'Study Desk', 'Solar Power Backup'],
                       'image_url' => null,
                   ],
                   [
                       'name' => 'Clergy Studio A2',
                       'slug' => Str::slug('St. Augustine Clergy Wing Clergy Studio A2'),
                       'room_type' => 'apartment',
                       'capacity' => 1,
                       'bed_count' => 1,
                       'price_per_semester' => 850000,
                       'availability_status' => 'available',
                       'gender_scope' => 'male',
                       'description' => 'Quiet clergy room suited for focused academic and spiritual formation.',
                       'amenities' => ['Private Kitchen', 'Study Desk', 'Solar Power Backup'],
                       'image_url' => null,
                   ],
               ],
           ],
           [
               'hostel' => [
                   'name' => 'Our Lady of Africa Convent Hostel',
                   'slug' => Str::slug('Our Lady of Africa Convent Hostel'),
                   'location' => 'Nkozi Trading Centre',
                   'price_per_semester' => 750000,
                   'bed_count' => 1,
                   'management_type' => 'affiliated',
                   'availability_status' => 'available',
                   'gender_scope' => 'female',
                   'is_religious_order' => true,
                   'religious_notes' => 'Managed by the Sisters of Mary. Strict curfew active past 9:00 PM for all residents.',
                   'amenities' => ['Attached Bathroom', 'Self-Contained', 'Secure Fencing'],
                   'description' => 'A women-only affiliated hostel with a structured environment and enhanced security.',
                   'image_url' => null,
               ],
               'rooms' => [
                   [
                       'name' => 'Convent Suite B1',
                       'slug' => Str::slug('Our Lady of Africa Convent Hostel Convent Suite B1'),
                       'room_type' => 'self-contained',
                       'capacity' => 1,
                       'bed_count' => 1,
                       'price_per_semester' => 750000,
                       'availability_status' => 'available',
                       'gender_scope' => 'female',
                       'description' => 'Single self-contained room with attached bathroom.',
                       'amenities' => ['Attached Bathroom', 'Secure Fencing'],
                       'image_url' => null,
                   ],
                   [
                       'name' => 'Convent Suite B2',
                       'slug' => Str::slug('Our Lady of Africa Convent Hostel Convent Suite B2'),
                       'room_type' => 'self-contained',
                       'capacity' => 1,
                       'bed_count' => 1,
                       'price_per_semester' => 780000,
                       'availability_status' => 'limited',
                       'gender_scope' => 'female',
                       'description' => 'Private women-only room within the convent hostel compound.',
                       'amenities' => ['Attached Bathroom', 'Secure Fencing', 'Study Desk'],
                       'image_url' => null,
                   ],
               ],
           ],
           [
               'hostel' => [
                   'name' => 'Martyrs Executive Villa',
                   'slug' => Str::slug('Martyrs Executive Villa'),
                   'location' => 'Kayabwe Highway Road, Nkozi',
                   'price_per_semester' => 600000,
                   'bed_count' => 2,
                   'management_type' => 'campus-managed',
                   'availability_status' => 'available',
                   'gender_scope' => 'mixed',
                   'is_religious_order' => false,
                   'religious_notes' => null,
                   'amenities' => ['Shared Kitchen', 'Wi-Fi Network', 'Balcony Space'],
                   'description' => 'A practical campus-managed option with shared-room occupancy and student-friendly pricing.',
                   'image_url' => null,
               ],
               'rooms' => [
                   [
                       'name' => 'Executive Shared C1',
                       'slug' => Str::slug('Martyrs Executive Villa Executive Shared C1'),
                       'room_type' => 'non-self-contained',
                       'capacity' => 2,
                       'bed_count' => 2,
                       'price_per_semester' => 600000,
                       'availability_status' => 'available',
                       'gender_scope' => 'mixed',
                       'description' => 'Shared room with access to common washrooms and kitchen.',
                       'amenities' => ['Shared Kitchen', 'Wi-Fi Network', 'Balcony Space'],
                       'image_url' => null,
                   ],
                   [
                       'name' => 'Executive Shared C2',
                       'slug' => Str::slug('Martyrs Executive Villa Executive Shared C2'),
                       'room_type' => 'non-self-contained',
                       'capacity' => 2,
                       'bed_count' => 2,
                       'price_per_semester' => 620000,
                       'availability_status' => 'limited',
                       'gender_scope' => 'mixed',
                       'description' => 'Double-occupancy room with strong access to academic facilities.',
                       'amenities' => ['Shared Kitchen', 'Wi-Fi Network'],
                       'image_url' => null,
                   ],
                   [
                       'name' => 'Executive Flat C3',
                       'slug' => Str::slug('Martyrs Executive Villa Executive Flat C3'),
                       'room_type' => 'apartment',
                       'capacity' => 1,
                       'bed_count' => 1,
                       'price_per_semester' => 900000,
                       'availability_status' => 'full',
                       'gender_scope' => 'mixed',
                       'description' => 'Private apartment-style room in the same campus-managed complex.',
                       'amenities' => ['Balcony Space', 'Study Desk', 'Wi-Fi Network'],
                       'image_url' => null,
                   ],
               ],
           ],
       ];

       foreach ($hostels as $entry) {
           $hostel = Hostel::updateOrCreate(
               ['slug' => $entry['hostel']['slug']],
               $entry['hostel']
           );

           foreach ($entry['rooms'] as $roomData) {
               Room::updateOrCreate(
                   [
                       'hostel_id' => $hostel->id,
                       'slug' => $roomData['slug'],
                   ],
                   [
                       'name' => $roomData['name'],
                       'room_type' => $roomData['room_type'],
                       'capacity' => $roomData['capacity'],
                       'bed_count' => $roomData['bed_count'],
                       'price_per_semester' => $roomData['price_per_semester'],
                       'availability_status' => $roomData['availability_status'],
                       'gender_scope' => $roomData['gender_scope'],
                       'description' => $roomData['description'],
                       'amenities' => $roomData['amenities'],
                       'image_url' => $roomData['image_url'],
                   ]
               );
           }
       }
    }
}
