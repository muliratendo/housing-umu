<?php
// database/factories/VerifiedStudentRecordFactory.php
namespace Database\Factories;

use App\Models\VerifiedStudentRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

class VerifiedStudentRecordFactory extends Factory
{
    protected $model = VerifiedStudentRecord::class;

    public function definition(): array
    {
        return [
            'reg_number'    => fake()->unique()->bothify('REG-####-??'),
            'student_email' => fake()->unique()->safeEmail(),
            'contact'       => fake()->boolean(70) ? fake()->phoneNumber() : null,
            'first_name'    => fake()->firstName(),
            'last_name'     => fake()->lastName(),
            'faculty'       => fake()->randomElement(['Science', 'Business', 'Law', 'Education']),
            // FIX: root cause of "Field 'course' doesn't have a default
            // value". The migration declares $table->string('course') with
            // no ->nullable() and no ->default(), so it's a required column
            // at the schema level — but definition() never set it. Any
            // insert that didn't explicitly override 'course' failed
            // outright, regardless of which state() method was chained.
            'course' => fake()->randomElement([
                'Bachelor of Computer Science', 'Bachelor of Business Administration',
                'Bachelor of Law', 'Bachelor of Education', 'Diploma in Information Technology',
            ]),
            // FIX: same issue as 'course' — $table->string('gender') has no
            // ->nullable()/->default() in the migration, so it's also a
            // required column that definition() was silently omitting.
            'gender' => fake()->randomElement(['male', 'female']),
            'user_id'    => null,
            'matched_by' => null,
            'matched_at' => null,
        ];
    }

    public function matched(): static
    {
        return $this->state(fn () => [
            'user_id'    => \App\Models\User::factory(),
            'matched_by' => \App\Models\User::factory(),
            'matched_at' => now(),
        ]);
    }

    public function unmatched(): static
    {
        return $this->state(fn () => ['user_id' => null, 'matched_by' => null, 'matched_at' => null]);
    }
}
