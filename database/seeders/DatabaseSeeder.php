<?php
// File: database/seeders/DatabaseSeeder.php  REPLACE existing.
//
// Root fix: removed bed_count + price_per_semester from all hostel inserts.
// Added campus_location field to hostels.
// 16 canonical hostels per business spec.
// Rooms: ~40% single (UGX 450,000 | capacity=1), ~60% double (UGX 900,000 | capacity=2).
// Beds created by Room::syncBeds() — no manual bed insert needed.
// Affiliated on-campus (Luwum): non-sc 1,268,500 | sc 1,775,900 | apt 2,029,600 (single).
// Affiliated off-campus: ±5–8% variation from base 1,150,000 (nsc) / 1,600,000 (sc).

namespace Database\Seeders;

use App\Models\{Bed, Hostel, Room, Student, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([RolePermissionSeeder::class]);
        $this->seedAccounts();
        $this->seedStudents();
        $this->seedHostels();
    }

    private function seedAccounts(): void
    {
        $accounts = [
            ['email'=>'superadmin@umu.ac.ug', 'name'=>'UMU Super System Admin',           'role'=>'super_admin'],
            ['email'=>'dean@umu.ac.ug',        'name'=>'Dr. John Bosco (Dean)',             'role'=>'dean'],
            ['email'=>'warden@umu.ac.ug',      'name'=>'Sister Mary Florence (Warden)',    'role'=>'warden'],
            ['email'=>'affiliatedhosteladmin@umu.ac.ug','name'=>'Mr. Mukasa Ronald', 'role'=>'affiliated_admin'],
        ];
        foreach ($accounts as $a) {
            User::updateOrCreate(['email'=>$a['email']], [
                'name'=>$a['name'], 'password'=>Hash::make('password'), 'email_verified_at'=>now(),
            ])->syncRoles($a['role']);
        }
    }

    private function seedStudents(): void
    {
        $user = User::updateOrCreate(['email' => 'student@umu.ac.ug'], [
            'name'              => 'Namubiru Sarah',
            'password'          => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $user->syncRoles('student');

        Student::updateOrCreate(['user_id' => $user->id], [
            'student_number' => 'STU-00001',
            'year_of_study'  => 1,
            'gender'         => 'female',
            'programme'        => 'Bachelor of Computer Science',
        ]);

        User::factory(20)->create()->each(function ($u) {
            $u->syncRoles('student');

            Student::updateOrCreate(['user_id' => $u->id], [
                'student_number' => 'STU-' . str_pad($u->id, 5, '0', STR_PAD_LEFT),
                'year_of_study'  => fake()->numberBetween(1, 4),
                'gender'         => fake()->randomElement(['male', 'female']),
                'programme'        => fake()->randomElement([
                    'Bachelor of Arts', 'Bachelor of Science',
                    'Bachelor of Commerce', 'Bachelor of Education',
                ]),
            ]);
        });
    }

    private function seedHostels(): void
    {
        foreach ($this->hostelCatalogue() as $entry) {
            $hostel = Hostel::updateOrCreate(
                ['slug' => $entry['hostel']['slug']],
                collect($entry['hostel'])->except('slug')->toArray()
            );
            foreach ($entry['rooms'] as $roomData) {
                $room = Room::updateOrCreate(
                    ['hostel_id' => $hostel->id, 'slug' => $roomData['slug']],
                    collect($roomData)->except('slug')->toArray() + ['hostel_id' => $hostel->id]
                );
                $room->syncBeds();
            }
        }
    }

    private function hostelCatalogue(): array
    {
        return [
            // A1 Male, on-campus, campus-managed
            ['hostel'=>['name'=>"Blessed Charles Lwanga Hall",'slug'=>'blessed-charles-lwanga-hall',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'male','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Common Room','Water Supply','Security Guard'],'description'=>'Premier male on-campus hall.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('CLH','male',14)],

            // A2 Male, on-campus, campus-managed
            ['hostel'=>['name'=>"St. Kizito Men's Hall",'slug'=>'st-kizito-mens-hall',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'male','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Study Room','Water Supply','Security Guard'],'description'=>"Named after St. Kizito.",'image_url'=>null],
             'rooms'=>$this->campusManagedRooms('SKH','male',12)],

            // B1 Female, on-campus, campus-managed
            ['hostel'=>['name'=>'Our Lady of Lourdes Hall','slug'=>'our-lady-of-lourdes-hall',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'female','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Common Room','Water Supply','Laundry Area'],'description'=>'Large female campus hall.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('LOU','female',14)],

            // B2 Female, on-campus, campus-managed
            ['hostel'=>['name'=>"St. Scholastica Women's Hall",'slug'=>'st-scholastica-womens-hall',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'female','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Study Room','Water Supply','Secure Gate'],'description'=>'Benedictine-named women hall.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('SCH','female',12)],

            // B3 Female, on-campus, campus-managed
            ['hostel'=>['name'=>'Blessed Virgin Mary Hall','slug'=>'blessed-virgin-mary-hall',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'female','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Common Room','Water Supply','Chapel Proximity'],'description'=>'Female hall near the chapel.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('BVM','female',12)],

            // B4 Female, on-campus, campus-managed
            ['hostel'=>['name'=>"St. Jude Women's Annex",'slug'=>'st-jude-womens-annex',
                'location'=>'UMU Main Campus, Nkozi','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'female','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Common Room','Water Supply','Garden Space'],'description'=>'Smaller female annex.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('SJA','female',10)],

            // B5 Female, on-campus, campus-managed — NUNS
            ['hostel'=>['name'=>'Sisters of Mary Convent Residence','slug'=>'sisters-of-mary-convent-residence',
                'location'=>'UMU Main Campus, Nkozi (Convent Wing)','management_type'=>'campus-managed','campus_location'=>'on-campus',
                'availability_status'=>'limited','gender_scope'=>'female','is_religious_order'=>true,
                'religious_notes'=>'Reserved for Catholic sisters and nuns. Managed by Campus Warden + Convent Superior.',
                'amenities'=>['Private Chapel','Secure Compound','Garden','Study Desks'],'description'=>'Female religious residence.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('SMC','female',8,true)],

            // C1 Male, off-campus, campus-managed, near gate
            ['hostel'=>['name'=>"Gate View Men's Lodge",'slug'=>'gate-view-mens-lodge',
                'location'=>'Near UMU Main Gate, Nkozi','management_type'=>'campus-managed','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'male','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Security Guard','Water Supply','Notice Board'],'description'=>'Off-campus male hall near gate.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('GVM','male',12)],

            // C2 Male, off-campus, campus-managed, near gate
            ['hostel'=>['name'=>'Nkozi Gate Quarters (Male)','slug'=>'nkozi-gate-quarters-male',
                'location'=>'Near UMU Main Gate, Nkozi','management_type'=>'campus-managed','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'male','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Security Guard','Water Supply'],'description'=>'Second campus-managed male option near gate.','image_url'=>null],
             'rooms'=>$this->campusManagedRooms('NGQ','male',10)],

            // D1 Mixed(separate), off-campus, campus-managed, Nkozi Town
            ['hostel'=>['name'=>'Nkozi Town Student Residence','slug'=>'nkozi-town-student-residence',
                'location'=>'Nkozi Town Centre','management_type'=>'campus-managed','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Separate Male/Female Wings','Water Supply','Security'],'description'=>'Mixed separate-wing campus-managed hostel in Nkozi Town.','image_url'=>null],
             'rooms'=>array_merge($this->campusManagedRooms('NTR-M','male',6), $this->campusManagedRooms('NTR-F','female',6))],

            // E1 Mixed(separate), on-campus, affiliated (Luwum Hall)
            ['hostel'=>['name'=>'Archbishop Luwum Hall','slug'=>'archbishop-luwum-hall',
                'location'=>'UMU Main Campus, Nkozi (Affiliated Block)','management_type'=>'affiliated','campus_location'=>'on-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Self-Contained Options','Separate Wings','Wi-Fi','Backup Power'],'description'=>'Only affiliated hostel on campus. Premium room tiers.','image_url'=>null],
             'rooms'=>$this->affiliatedOnCampusRooms('ALH')],

            // F1–F5 Mixed, off-campus, affiliated
            ['hostel'=>['name'=>'Martyrs Lodge Nkozi','slug'=>'martyrs-lodge-nkozi',
                'location'=>'Kayabwe Road, Nkozi','management_type'=>'affiliated','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Wi-Fi','Shared Kitchen','Backup Power'],'description'=>'Mixed affiliated off-campus hostel.','image_url'=>null],
             'rooms'=>$this->affiliatedOffCampusRooms('MLN',0)],

            ['hostel'=>['name'=>'Green Valley Student Flats','slug'=>'green-valley-student-flats',
                'location'=>'Nkozi Trading Centre','management_type'=>'affiliated','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Self-Contained','Water Tank','Security Fence'],'description'=>'Modern student flats in Nkozi.','image_url'=>null],
             'rooms'=>$this->affiliatedOffCampusRooms('GVF',1)],

            ['hostel'=>['name'=>'Hilltop Student Residences','slug'=>'hilltop-student-residences',
                'location'=>'Nkozi Hill, Off Kampala Road','management_type'=>'affiliated','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Wi-Fi','Borehole Water','Scenic View','Security'],'description'=>'Elevated location with scenic views.','image_url'=>null],
             'rooms'=>$this->affiliatedOffCampusRooms('HTS',2)],

            ['hostel'=>['name'=>'Lake Breeze Hostels','slug'=>'lake-breeze-hostels',
                'location'=>'Nkozi-Masaka Road','management_type'=>'affiliated','campus_location'=>'off-campus',
                'availability_status'=>'limited','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Common Kitchen','Solar Power','Secure Parking'],'description'=>'Affordable affiliated option with solar backup.','image_url'=>null],
             'rooms'=>$this->affiliatedOffCampusRooms('LBH',3)],

            ['hostel'=>['name'=>'Nkozi Gardens Student Hostel','slug'=>'nkozi-gardens-student-hostel',
                'location'=>'Opposite UMU Gate, Nkozi','management_type'=>'affiliated','campus_location'=>'off-campus',
                'availability_status'=>'available','gender_scope'=>'mixed','is_religious_order'=>false,'religious_notes'=>null,
                'amenities'=>['Garden Compound','Backup Generator','Security'],'description'=>'Garden-style compound across from the gate.','image_url'=>null],
             'rooms'=>$this->affiliatedOffCampusRooms('NGS',4)],
        ];
    }

    /**
     * Campus-managed rooms: ~40% single (capacity=1, price=450,000), ~60% double (capacity=2, price=900,000).
     * Religious-order hostels use all-single.
     */
    private function campusManagedRooms(string $pfx, string $gender, int $count, bool $allSingle = false): array
    {
        $rooms       = [];
        $singleCount = $allSingle ? $count : (int) floor($count * 0.4);
        $doubleCount = $count - $singleCount;

        for ($i = 1; $i <= $singleCount; $i++) {
            $name    = "{$pfx}-S{$i}";
            $rooms[] = $this->roomRow($name, Str::slug("{$pfx}-S{$i}"), 'non-self-contained', 1, 450000, $gender, "Single room {$name}.");
        }
        for ($i = 1; $i <= $doubleCount; $i++) {
            $name    = "{$pfx}-D{$i}";
            $rooms[] = $this->roomRow($name, Str::slug("{$pfx}-D{$i}"), 'non-self-contained', 2, 900000, $gender, "Double room {$name}. Each bed UGX 450,000.");
        }
        return $rooms;
    }

    /**
     * Archbishop Luwum Hall — affiliated on-campus tiers.
     * non-sc single 1,268,500 | sc single 1,775,900 | apt single 2,029,600
     * Double: same price, per-bed = price/2 via accessor.
     */
    private function affiliatedOnCampusRooms(string $pfx): array
    {
        $rooms = [];
        $defs  = [
            // [type,               cap, price,   gender,   count]
            ['non-self-contained', 1, 1268500, 'male',    4],
            ['non-self-contained', 2, 1268500, 'male',    3],
            ['self-contained',     1, 1775900, 'female',  3],
            ['self-contained',     2, 1775900, 'female',  2],
            ['apartment',          1, 2029600, 'mixed',   2],
        ];
        foreach ($defs as [$type, $cap, $price, $gender, $cnt]) {
            $tc = match($type) { 'self-contained'=>'SC', 'apartment'=>'APT', default=>'NSC' };
            $cc = $cap === 1 ? 'S' : 'D';
            for ($i = 1; $i <= $cnt; $i++) {
                $name    = "{$pfx}-{$tc}-{$cc}{$i}";
                $rooms[] = $this->roomRow($name, Str::slug($name), $type, $cap, $price, $gender,
                    "{$type} ".($cap===1?'single':'double')." room. UGX ".number_format($price).".");
            }
        }
        return $rooms;
    }

    /**
     * Affiliated off-campus: ±5–8% variation from base pricing.
     * non-sc base ~1,150,000 | sc base ~1,600,000
     */
    private function affiliatedOffCampusRooms(string $pfx, int $variant): array
    {
        $multipliers = [1.00, 1.05, 0.97, 1.08, 0.95];
        $m           = $multipliers[$variant];
        $baseNsc     = (int) round(1150000 * $m);
        $baseSc      = (int) round(1600000 * $m);

        $rooms = [];
        $defs  = [
            ['non-self-contained', 1, $baseNsc, 4],
            ['non-self-contained', 2, $baseNsc, 4],
            ['self-contained',     1, $baseSc,  2],
            ['self-contained',     2, $baseSc,  2],
        ];
        foreach ($defs as [$type, $cap, $price, $cnt]) {
            $tc = $type === 'self-contained' ? 'SC' : 'NSC';
            $cc = $cap === 1 ? 'S' : 'D';
            for ($i = 1; $i <= $cnt; $i++) {
                $name    = "{$pfx}-{$tc}-{$cc}{$i}";
                $rooms[] = $this->roomRow($name, Str::slug($name), $type, $cap, $price, 'mixed',
                    "{$type} ".($cap===1?'single':'double')." room. UGX ".number_format($price).".");
            }
        }
        return $rooms;
    }

    private function roomRow(string $name, string $slug, string $type, int $cap, int $price, string $gender, string $desc): array
    {
        return [
            'name'               => $name,
            'slug'               => $slug,
            'room_number'         => $name,   // ← ADD THIS. e.g. "CLH-S1", "BVM-D3"
            'room_type'          => $type,
            'capacity'           => $cap,
            'bed_count'          => $cap,
            'price_per_semester' => $price,
            'availability_status'=> 'available',
            'gender_scope'       => $gender,
            'description'        => $desc,
            'amenities'          => $this->defaultAmenities($type),
            'image_url'          => null,
            'is_active' => true,   // ← explicit, matches DB default purely for clarity
        ];
    }

    private function defaultAmenities(string $type): array
    {
        return match($type) {
            'self-contained' => ['Attached Bathroom','Study Desk','Wardrobe','Wi-Fi'],
            'apartment'      => ['Private Kitchen','Attached Bathroom','Study Desk','Wi-Fi','Balcony'],
            default          => ['Study Desk','Wardrobe','Shared Bathroom'],
        };
    }
}
