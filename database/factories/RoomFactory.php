<?php
// database/factories/RoomFactory.php
namespace Database\Factories;

use App\Models\Hostel;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        $capacity = fake()->randomElement([1, 2]);
        $name = 'Room ' . fake()->unique()->numerify('##');

        return [
            'hostel_id' => Hostel::factory(),
            'name' => $name,
            'slug' => Str::slug($name) . '-' . fake()->unique()->numberBetween(1, 99999),
            'room_number' => $name,
            'room_type' => Room::ROOM_TYPE_NON_S,
            'capacity' => $capacity,
            'bed_count' => $capacity,
            'is_active' => true,
            'price_per_semester' => fake()->randomElement([450000, 900000, 1268500]),
            'availability_status' => Room::STATUS_AVAILABLE,
            'gender_scope' => fake()->randomElement(['male', 'female', 'mixed']),
            'description' => fake()->sentence(),
            'amenities' => ['Study Desk', 'Wardrobe'],
            'image_url' => null,
            'floor' => fake()->numberBetween(1, 4),
        ];
    }

    public function selfContained(): static
    {
        return $this->state(fn () => ['room_type' => Room::ROOM_TYPE_SC]);
    }

    public function apartment(): static
    {
        return $this->state(fn () => ['room_type' => Room::ROOM_TYPE_APARTMENT, 'capacity' => 1, 'bed_count' => 1]);
    }

    public function single(): static
    {
        return $this->state(fn () => ['capacity' => 1, 'bed_count' => 1]);
    }

    public function double(): static
    {
        return $this->state(fn () => ['capacity' => 2, 'bed_count' => 2]);
    }

    public function full(): static
    {
        return $this->state(fn () => ['availability_status' => Room::STATUS_FULL]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    // FIX: root cause of "Duplicate entry '216-A' for key
    // beds.beds_room_id_label_unique". The previous version registered
    // ->afterCreating(fn ($room) => $room->syncBeds()) directly on this
    // factory's configure() hook. That means EVERY time Room::factory() is
    // invoked anywhere — including as a NESTED default relation inside
    // BedFactory ('room_id' => Room::factory()), AllocationFactory
    // ('room_id' => Room::factory()), and MaintenanceRequestFactory's
    // unbound 'allocation_id' => Allocation::factory() chain — a Room gets
    // created AND syncBeds() immediately auto-inserts its Bed rows
    // (label 'A', possibly 'B'). Then, whichever OUTER factory nested that
    // Room::factory() call (e.g. BedFactory) proceeds to insert its OWN
    // explicit Bed row for that same room_id with a random label from
    // ['A','B','C','D'] — colliding with the label syncBeds() already
    // inserted moments earlier for the exact same room_id.
    //
    // Fix: this factory no longer auto-populates beds as a side effect.
    // Bed creation is now the caller's explicit responsibility — either via
    // $room->syncBeds() (called explicitly in SeedTestData right after the
    // real catalogue rooms are created) or via Bed::factory() itself when a
    // room is created purely as a nested FK default. This removes the
    // hidden double-insert entirely.
    //
    // If you want auto-synced beds for a specific factory call, do it
    // explicitly: Room::factory()->create()->syncBeds();
}
