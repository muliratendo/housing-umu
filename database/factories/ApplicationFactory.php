<?php
// database/factories/ApplicationFactory.php
namespace Database\Factories;

use App\Models\{Application, Student, Hostel, AcademicTerm};
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ApplicationFactory extends Factory
{
    protected $model = Application::class;

    public function definition(): array
    {
        return [
            'form_id'          => (string) Str::uuid(),
            'student_id'       => Student::factory(),
            'hostel_id'        => Hostel::factory(),
            'academic_term_id' => AcademicTerm::factory(),
            'status'           => Application::STATUS_PENDING,
            'is_draft'         => false,
            'notes'            => fake()->boolean(30) ? fake()->sentence() : null,
            'special_needs'    => null,
            'preferences'      => null,
            'last_saved_at'    => now(),
        ];
    }

    // NEW: an autosaved, never-finalized draft — mirrors saveDraft()'s
    // exact write shape (room_type/capacity live only in draft_data
    // until submitDraft() finalizes the row).
    public function draft(): static
    {
        return $this->state(fn () => [
            'is_draft'   => true,
            'draft_data' => ['room_type' => 'standard', 'capacity' => 1],
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => Application::STATUS_PENDING]);
    }

    public function waitlisted(): static
    {
        return $this->state(fn () => [
            'status'            => 'waitlisted',
            'waitlist_position' => fake()->numberBetween(1, 20),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status'           => 'rejected',
            'permission_notes' => 'Insufficient eligibility.',
        ]);
    }

    public function withdrawn(): static
    {
        return $this->state(fn () => [
            'status'            => 'withdrawn',
            'waitlist_position' => null,
        ]);
    }

    public function allocated(): static
    {
        return $this->state(fn () => ['status' => 'allocated']);
    }

    // NEW: exercises validateAffiliatedAccess()'s dean/warden gate
    public function needsDeanPermission(): static
    {
        return $this->state(fn () => [
            'dean_permission_granted'   => false,
            'warden_permission_granted' => false,
        ]);
    }
}
