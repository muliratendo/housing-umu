<?php
// File: database/migrations/2026_06_22_111038_create_beds_table.php
// REPLACE existing stub.
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('beds', function (Blueprint $table) {
            $table->id();

            $table->foreignId('room_id')
                ->constrained()
                ->cascadeOnDelete();

            // Human-readable label: "Bed A", "Bed B", etc.
            $table->string('label', 20);

            // Canonical statuses matching Bed::STATUSES constant
            $table->string('status', 30)->default('available')
                ->comment('available|occupied|reserved|maintenance|inactive');

            // Position for consistent ordering within a room
            $table->unsignedTinyInteger('sort_order')->default(0);

            $table->timestamps();

            $table->softDeletes();

            // BR-1: one bed label per room
            $table->unique(['room_id', 'label']);
            $table->index(['room_id', 'status']);
            $table->index('status');
        });
    }
    public function down(): void { Schema::dropIfExists('beds'); }
};
