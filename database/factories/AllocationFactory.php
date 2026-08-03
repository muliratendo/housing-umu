<?php
// database/factories/AllocationFactory.php
namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\Allocation;
use App\Models\Application;
use App\Models\Bed;
use App\Models\Hostel;
use App\Models\Room;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class AllocationFactory extends Factory
{
    protected $model = Allocation::class;

    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'student_id' => Student::factory(),
            'hostel_id' => Hostel::factory(),
            'room_id' => Room::factory(),
            // FIX: previously 'bed_id' => Bed::factory() resolved its OWN
            // independent nested Room::factory() default (BedFactory's
            // 'room_id' default), completely disconnected from the
            // 'room_id' resolved two lines above. Whenever this factory
            // was used WITHOUT an explicit ->for($room) / room_id override
            // (e.g. via a nested default deeper in the chain, as in
            // MaintenanceRequestFactory's unbound 'allocation_id' =>
            // Allocation::factory()), you'd end up with an Allocation whose
            // bed_id pointed at a bed in a DIFFERENT room than room_id —
            // a silent data-integrity bug, and (combined with the
            // RoomFactory afterCreating hook) the direct trigger of the
            // "216-A" duplicate-bed collision.
            //
            // Fix: resolve bed_id as a closure that reads the already-
            // resolved 'room_id' from $attributes (Laravel evaluates
            // attributes top-to-bottom, so 'room_id' above is a real ID by
            // the time this closure runs) and creates the bed against that
            // SAME room, guaranteeing consistency.
            'bed_id' => function (array $attributes) {
                return Bed::factory()->create(['room_id' => $attributes['room_id']])->id;
            },
            'academic_term_id' => AcademicTerm::factory(),
            'bed_number' => 1,
            'status' => Allocation::STATUS_ALLOCATED,
            'is_retained' => false,
            'is_admin_override' => false,
            'admin_notes' => null,
        ];
    }

    public function checkedIn(): static
    {
        return $this->state(fn () => [
            'status' => Allocation::STATUS_CHECKED_IN,
            'checked_in_at' => now(),
        ]);
    }

    public function checkedOut(): static
    {
        return $this->state(fn () => [
            'status' => Allocation::STATUS_CHECKED_OUT,
            'checked_out_at' => now(),
        ]);
    }

    public function evicted(): static
    {
        return $this->state(fn () => ['status' => Allocation::STATUS_EVICTED]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => Allocation::STATUS_CANCELLED]);
    }

    public function adminOverride(): static
    {
        return $this->state(fn () => [
            'is_admin_override' => true,
            'admin_notes' => 'Manually reassigned per BR-9: ' . fake()->sentence(),
        ]);
    }

    public function retained(): static
    {
        return $this->state(fn () => [
            'is_retained' => true,
            'retention_notes' => fake()->sentence(),
        ]);
    }
}
