<?php
// database/factories/StudentFactory.php
namespace Database\Factories;

use App\Models\{Student, User};
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'user_id'                  => User::factory(),
            'student_number'           => 'STU-' . fake()->unique()->numerify('#####'),
            'registration_number'      => fake()->boolean(70) ? fake()->bothify('REG-####-??') : null,
            'gender'                   => fake()->randomElement(['male', 'female']),
            'year_of_study'            => fake()->numberBetween(1, 4),
            'programme'                => fake()->randomElement([
                'Bachelor of Computer Science', 'Bachelor of Business Administration',
                'Bachelor of Law', 'Bachelor of Education', 'Diploma in Information Technology',
            ]),
            'faculty'                  => fake()->randomElement(['Science', 'Business', 'Law', 'Education']),
            'enrollment_date'          => fake()->dateTimeBetween('-4 years', 'now'),
            'current_academic_year_id' => null,
        ];
    }

    public function firstYear(): static
    {
        return $this->state(fn () => ['year_of_study' => 1]);
    }

    public function male(): static
    {
        return $this->state(fn () => ['gender' => 'male']);
    }

    public function female(): static
    {
        return $this->state(fn () => ['gender' => 'female']);
    }
}
