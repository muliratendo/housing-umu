<?php
// database/factories/MaintenanceCommentFactory.php
namespace Database\Factories;

use App\Models\{MaintenanceComment, MaintenanceRequest, User};
use Illuminate\Database\Eloquent\Factories\Factory;

class MaintenanceCommentFactory extends Factory
{
    protected $model = MaintenanceComment::class;

    public function definition(): array
    {
        return [
            'maintenance_request_id' => MaintenanceRequest::factory(),
            'user_id'                => User::factory(),
            'body'                   => fake()->sentence(10),
            'is_internal'            => false,
        ];
    }

    // NEW: staff-only note, hidden from the student view
    public function internal(): static
    {
        return $this->state(fn () => ['is_internal' => true]);
    }
}
