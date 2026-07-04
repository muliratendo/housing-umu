<?php
// File: database/migrations/2025_01_01_000004_create_rooms_table.php
// REPLACE existing.
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('slug', 160)->unique();
            $table->string('room_number', 20)->nullable();
            $table->string('room_type', 30)->default('non-self-contained');
            $table->unsignedTinyInteger('capacity')->default(1);
            // ↓ FIXED: no ->after() on CREATE TABLE — column order is defined by position here
            $table->boolean('is_active')->default(true)->comment('Soft-disable a room without deleting it');
            $table->unsignedTinyInteger('bed_count')->default(1);
            $table->unsignedBigInteger('price_per_semester')->default(0);
            $table->string('availability_status', 20)->default('available');
            $table->string('gender_scope', 10)->nullable();
            $table->text('description')->nullable();
            $table->json('amenities')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index(['hostel_id', 'availability_status'], 'idx_rooms_hostel_avail');
            $table->index(['hostel_id', 'gender_scope'],        'idx_rooms_hostel_gender');
            $table->index(['hostel_id', 'room_type'],           'idx_rooms_hostel_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
