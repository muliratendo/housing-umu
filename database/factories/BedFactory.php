<?php
// database/factories/BedFactory.php
namespace Database\Factories;

use App\Models\Bed;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

class BedFactory extends Factory
{
    protected $model = Bed::class;

    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            // FIX: fake()->randomElement(['A','B','C','D']) with no
            // uniqueness guard means Bed::factory()->count(n > 1)->for($room)
            // (used directly, or indirectly via any ->count() call that
            // shares a room_id) has a real chance of two rows landing on the
            // same label for the same room_id — exactly the shape of the
            // 'beds_room_id_label_unique' violation. Combined with the
          // RoomFactory auto-sync bug this was the direct trigger, but the
            // random-without-replacement issue is independent and remains
            // exploitable even after that fix. A sequence guarantees each
            // successive Bed::factory() call cycles through unique labels.
            'label' => Bed::factory()->getLabelSequence(),
            'status' => Bed::STATUS_AVAILABLE,
            'sort_order' => 0,
        ];
    }

    /**
     * Deterministic A, B, C, D... cycle so repeated factory calls never
     * collide on label within the same room by pure chance.
     */
    protected function getLabelSequence(): string
    {
        static $index = 0;
        $labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        $label = $labels[$index % count($labels)];
        $index++;
        return $label;
    }

    public function available(): static
    {
        return $this->state(fn () => ['status' => Bed::STATUS_AVAILABLE]);
    }

    public function occupied(): static
    {
        return $this->state(fn () => ['status' => Bed::STATUS_OCCUPIED]);
    }

    public function reserved(): static
    {
        return $this->state(fn () => ['status' => Bed::STATUS_RESERVED]);
    }

    public function underMaintenance(): static
    {
        return $this->state(fn () => ['status' => Bed::STATUS_MAINTENANCE]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['status' => Bed::STATUS_INACTIVE]);
    }
}

