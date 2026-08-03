<?php
// database/factories/AcademicYearFactory.php
namespace Database\Factories;

use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

class AcademicYearFactory extends Factory
{
    protected $model = AcademicYear::class;

    public function definition(): array
    {
        // FIX (carried over from earlier turn): deterministic, gapless
        // start_year derived from the current max in the table instead of
        // fake()->numberBetween(2024, 2026) — a 3-value pool with no
        // uniqueness guard against academic_years.academic_years_label_unique.
        // This remains necessary even after the MaintenanceRequestFactory
        // fix above, since AcademicYear::factory() can still be invoked
        // multiple times per run (once explicitly in SeedTestData, plus
        // once per unbound AcademicTerm::factory() default elsewhere).
        $startYear = (AcademicYear::max('start_year') ?? 2023) + 1;

        return [
            'name' => "{$startYear}/" . ($startYear + 1),
            'start_year' => $startYear,
            'end_year' => $startYear + 1,
            'label' => "{$startYear}/" . ($startYear + 1),
            'start_date' => "{$startYear}-08-01",
            'end_date' => ($startYear + 1) . '-06-30',
            'is_current' => false,
        ];
    }

    public function current(): static
    {
        return $this->state(fn () => ['is_current' => true]);
    }
}

