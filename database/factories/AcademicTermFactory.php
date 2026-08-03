<?php
// database/factories/AcademicTermFactory.php
namespace Database\Factories;

use App\Models\{AcademicTerm, AcademicYear};
use Illuminate\Database\Eloquent\Factories\Factory;

class AcademicTermFactory extends Factory
{
    protected $model = AcademicTerm::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-1 month', '+1 month');
        $end   = (clone $start)->modify('+4 months');

        return [
            'academic_year_id'          => AcademicYear::factory(),
            'name'                      => 'Semester ' . fake()->randomElement([1, 2]) . ' ' . fake()->year(),
            'start_date'                => $start,
            'end_date'                  => $end,
            'is_current'                => false,
            'application_window_open'   => $start,
            'application_window_close'  => (clone $start)->modify('+3 weeks'),
        ];
    }

    // NEW: the only term the app treats as active/current
    public function current(): static
    {
        return $this->state(fn () => ['is_current' => true]);
    }

    // NEW: exercises BR-6 rejection paths (window closed)
    public function windowClosed(): static
    {
        return $this->state(fn () => [
            'application_window_open'  => now()->subMonths(2),
            'application_window_close' => now()->subMonth(),
        ]);
    }

    public function windowNotYetOpen(): static
    {
        return $this->state(fn () => [
            'application_window_open'  => now()->addMonth(),
            'application_window_close' => now()->addMonths(2),
        ]);
    }
}
