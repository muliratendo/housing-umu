<?php
// database/factories/MaintenanceRequestFactory.php
namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\Allocation;
use App\Models\Hostel;
use App\Models\MaintenanceRequest;
use App\Models\Room;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class MaintenanceRequestFactory extends Factory
{
    protected $model = MaintenanceRequest::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            // FIX: 'allocation_id' => Allocation::factory() as an unbound
            // nested default is the single biggest hidden-bug source in
            // this whole set. Every time MaintenanceRequest::factory() is
            // called WITHOUT an explicit ->for($allocation), this line
            // silently creates an entirely new Allocation — which itself
            // creates its own Application, Student, Hostel, Room, Bed, and
            // AcademicTerm defaults (all unbound too, before the
            // AllocationFactory fix). That is exactly how a single
            // MaintenanceRequest::factory()->count(3) call in SeedTestData
            // was capable of spawning extra, disconnected AcademicYear /
            // AcademicTerm / Room / Bed rows underneath — the same failure
            // pattern that caused BOTH the academic_years.label collision
            // and this beds.room_id_label collision, despite SeedTestData
            // already passing 'hostel_id', 'room_id', and ->for($term,
            // 'academicTerm') as explicit overrides. Overrides on create()
            // are applied AFTER definition() resolves, so the nested
            // allocation_id factory (and everything under it) had already
            // fired and persisted rows by the time those overrides landed.
            //
            // Fix: allocation_id has no sane random default in this
            // domain — a maintenance request only makes sense tied to a
            // real, already-existing allocation. Leave it null by default
            // and require callers to set it explicitly via ->for($allocation,
            // 'allocation') or an array override, exactly like student_id
            // isn't defaulted to a random unrelated record in most of the
            // other factories in this codebase.
            'allocation_id' => null,
            'hostel_id' => Hostel::factory(),
            'room_id' => Room::factory(),
            'academic_term_id' => AcademicTerm::factory(),
            'subject' => fake()->randomElement(['Broken window', 'Leaking tap', 'Faulty light', 'Blocked drain']),
            'description' => fake()->paragraph(),
            'priority' => fake()->randomElement(['low', 'medium', 'high']),
            'status' => MaintenanceRequest::STATUS_OPEN,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => MaintenanceRequest::STATUS_IN_PROGRESS]);
    }

    public function resolved(): static
    {
        return $this->state(fn () => [
            'status' => MaintenanceRequest::STATUS_RESOLVED,
            'resolved_at' => now(),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'status' => MaintenanceRequest::STATUS_CLOSED,
            'closed_at' => now(),
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn () => ['priority' => 'high']);
    }
}
