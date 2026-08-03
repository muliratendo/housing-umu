<?php
// app/Console/Commands/SeedTestData.php
namespace App\Console\Commands;

use App\Models\{
    Student, Hostel, Room, Bed, AcademicYear, AcademicTerm,
    Application, Allocation, MaintenanceRequest, MaintenanceComment,
    VerifiedStudentRecord,
};
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedTestData extends Command
{
    protected $signature = 'test-data:seed
        {--fresh : Drop and rebuild the entire schema via migrate:fresh --seed before seeding test data}
        {--force : Skip the confirmation prompt (required for CI/non-interactive runs)}';

    protected $description = 'Seed factory-generated test data for local development and manual testing.';

    public function handle(): int
    {
        if ($this->option('fresh') && app()->environment('production')) {
            $this->error('Refusing to run --fresh in production.');
            return self::FAILURE;
        }

        if ($this->option('fresh') && ! $this->option('force')) {
            if (! $this->confirm('This will DROP ALL TABLES, re-run migrations, and re-run DatabaseSeeder. Continue?')) {
                return self::FAILURE;
            }
        }

        if ($this->option('fresh')) {
            $this->warn('Running migrate:fresh --seed...');
            $this->call('migrate:fresh', ['--seed' => true]);
        }

        DB::transaction(function () {
            $this->info('Seeding academic years/terms...');
            $year = AcademicYear::factory()->current()->create();
            $term = AcademicTerm::factory()->current()->for($year, 'academicYear')->create();
            AcademicTerm::factory()->windowClosed()->for($year, 'academicYear')->create();

            $this->info('Seeding hostels + rooms + beds...');
            $maleHostel = Hostel::factory()->maleOnly()->create();
            $femaleHostel = Hostel::factory()->femaleOnly()->create();
            $affiliatedHostel = Hostel::factory()->affiliated()->create();
            $fullHostel = Hostel::factory()->full()->create();

            // FIX: RoomFactory no longer auto-syncs beds as a side effect
            // (see RoomFactory::configure() removal), so bed rows must be
            // created explicitly here for every catalogue room. This is
            // what the ->afterCreating() hook used to do implicitly and
            // unsafely for EVERY Room::factory() call anywhere in the app,
            // including nested ones — now it only runs where we ask for it.
            foreach ([$maleHostel, $femaleHostel, $affiliatedHostel, $fullHostel] as $hostel) {
                Room::factory()->count(5)->for($hostel)->create()->each(fn ($room) => $room->syncBeds());
                Room::factory()->selfContained()->double()->for($hostel)->create()->syncBeds();
            }

            $this->info('Seeding students (various genders/years)...');
            $students = collect()
                ->merge(Student::factory()->male()->firstYear()->count(5)->create())
                ->merge(Student::factory()->female()->firstYear()->count(5)->create())
                ->merge(Student::factory()->male()->count(10)->create())
                ->merge(Student::factory()->female()->count(10)->create());

            $this->info('Seeding applications (pending/draft/waitlisted/rejected)...');

            $studentPool = $students->shuffle()->values();
            $cursor = 0;
            $take = function (int $n) use ($studentPool, &$cursor) {
                $slice = $studentPool->slice($cursor, $n)->values();
                $cursor += $n;
                return $slice;
            };

            $pendingApps = $take(10)->map(fn ($student) =>
                Application::factory()->for($term)->create([
                    'hostel_id'  => $maleHostel->id,
                    'student_id' => $student->id,
                ])
            );

            $take(5)->each(fn ($student) =>
                Application::factory()->draft()->for($term)->create([
                    'student_id' => $student->id,
                ])
            );

            $take(5)->each(fn ($student) =>
                Application::factory()->waitlisted()->for($term)->create([
                    'student_id' => $student->id,
                ])
            );

            $take(3)->each(fn ($student) =>
                Application::factory()->rejected()->for($term)->create([
                    'student_id' => $student->id,
                ])
            );

            $take(2)->each(fn ($student) =>
                Application::factory()->needsDeanPermission()
                    ->for($term)->for($affiliatedHostel)
                    ->create(['student_id' => $student->id])
            );

            $this->info('Seeding allocations (allocated/checked-in/checked-out/override)...');
            $rooms = Room::query()->where('hostel_id', $maleHostel->id)->with('beds')->get();
            $allocations = collect();
            foreach ($pendingApps->take(4) as $i => $app) {
                $room = $rooms[$i % $rooms->count()];
                $bed = $room->beds->first();
                $allocation = Allocation::factory()
                    ->for($app, 'application')
                    ->for($app->student, 'student')
                    ->for($term)
                    ->create(['hostel_id' => $maleHostel->id, 'room_id' => $room->id, 'bed_id' => $bed->id]);

                if ($i === 0) $allocation->checkIn();
                if ($i === 1) { $allocation->checkIn(); $allocation->checkOut(); }
                if ($i === 2) $allocation->update(['is_admin_override' => true, 'admin_notes' => 'Test override note.']);

                $allocations->push($allocation);
            }

            $this->info('Seeding maintenance requests + comments...');
            $checkedInAllocation = Allocation::where('status', Allocation::STATUS_CHECKED_IN)->first();
            if ($checkedInAllocation) {
                // FIX: root cause of the beds.beds_room_id_label_unique
                // collision ("216-A"). MaintenanceRequestFactory's default
                // 'allocation_id' => Allocation::factory() was firing here
                // as an unbound nested factory because this call never set
                // allocation_id — neither via ->for() nor as an array key —
                // so Laravel resolved the factory's own default, which
                // silently created a brand-new, fully independent
                // Allocation (with its own Application, Student, Hostel,
                // Room, Bed, and AcademicTerm underneath, before the
                // AllocationFactory/MaintenanceRequestFactory fixes). That
                // phantom Room/Bed pair could coincidentally reuse a
                // room_id already seeded above, causing the label
                // collision on insert.
                //
                // Fix: chain ->for($checkedInAllocation, 'allocation')
                // explicitly, exactly like student_id and academic_term_id
                // already were. Combined with MaintenanceRequestFactory's
                // 'allocation_id' => null default, this guarantees no
                // hidden Allocation (and therefore no hidden Room/Bed) is
                // ever created by this call.
                $requests = MaintenanceRequest::factory()->count(3)
                    ->for($checkedInAllocation->student, 'student')
                    ->for($checkedInAllocation, 'allocation')
                    ->for($term, 'academicTerm')
                    ->create([
                        'hostel_id' => $checkedInAllocation->hostel_id,
                        'room_id'   => $checkedInAllocation->room_id,
                    ]);
                foreach ($requests as $request) {
                    MaintenanceComment::factory()->count(2)->for($request, 'maintenanceRequest')->create();
                    MaintenanceComment::factory()->internal()->for($request, 'maintenanceRequest')->create();
                }
            }

            $this->info('Seeding verified student records (matched + unmatched)...');
            VerifiedStudentRecord::factory()->matched()->count(5)->create();
            VerifiedStudentRecord::factory()->unmatched()->count(5)->create();
        });

        $this->info('Test data seeding complete.');
        return self::SUCCESS;
    }
}
