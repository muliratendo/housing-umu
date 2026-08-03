<?php
// File: database/migrations/2026_07_18_000001_create_application_preferred_room_table.php
// NEW: pivot table backing Application::preferredRooms(). Supports up to
// MAX_PREFERRED_ROOMS (3) per application, in priority order, with the
// first entry flagged as is_primary. This is separate from the legacy
// single `preferred_room_id` column on `applications`, which remains for
// backward compatibility but is no longer written to by the storefront
// application flow.
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('application_preferred_room', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            // NEW: 1 = first choice / primary, up to 3 — matches
            // ApplicationController::MAX_PREFERRED_ROOMS and the order the
            // student picked rooms in on the application form.
            $table->unsignedTinyInteger('priority')->default(1);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            // A room can only appear once per application (no duplicate picks)
            $table->unique(['application_id', 'room_id'], 'uq_application_room');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_preferred_room');
    }
};
