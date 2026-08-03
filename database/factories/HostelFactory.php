<?php
// database/factories/HostelFactory.php
namespace Database\Factories;

use App\Models\Hostel;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class HostelFactory extends Factory
{
    protected $model = Hostel::class;

    public function definition(): array
    {
        $name = fake()->company() . ' Hall';
        return [
            'name'                => $name,
            'slug'                => Str::slug($name) . '-' . fake()->unique()->numberBetween(1, 99999),
            'location'            => fake()->streetAddress(),
            'management_type'     => Hostel::TYPE_CAMPUS,
            'campus_location'     => Hostel::CAMPUS_ON,
            'availability_status' => 'available',
            'gender_scope'        => fake()->randomElement(['male', 'female', 'mixed']),
            'applications_open'   => true,
            'is_religious_order'  => false,
            'religious_notes'     => null,
            'amenities'           => ['Water Supply', 'Security Guard'],
            'description'         => fake()->sentence(),
            'image_url'           => null,
        ];
    }

    public function affiliated(): static
    {
        return $this->state(fn () => [
            'management_type' => Hostel::TYPE_AFFILIATED,
            'campus_location' => Hostel::CAMPUS_OFF,
        ]);
    }

    public function campusManaged(): static
    {
        return $this->state(fn () => ['management_type' => Hostel::TYPE_CAMPUS]);
    }

    public function maleOnly(): static
    {
        return $this->state(fn () => ['gender_scope' => 'male']);
    }

    public function femaleOnly(): static
    {
        return $this->state(fn () => ['gender_scope' => 'female']);
    }

    public function applicationsClosed(): static
    {
        return $this->state(fn () => ['applications_open' => false]);
    }

    public function full(): static
    {
        return $this->state(fn () => ['availability_status' => 'full']);
    }
}
